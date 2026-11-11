import { Location } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  Injector,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, forkJoin } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';
import { liturgyId, liturgyIndex } from '../../constants/liturgy';
import { Liturgy, LiturgyChoice } from '../../interfaces/liturgy';
import { SlideList } from '../../interfaces/slide';
import { lyricsWithChords } from '../../services/chord/song-structure';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { InsertPosition, RemoteMass, insertionIndex } from '../../services/remote-control/remote-control';
import { RemoteHost } from '../../services/remote-control/remote-host.service';
import { ChannelHostTransport, channelName } from '../../services/remote-control/remote-transport';
import { RevealService } from '../../services/reveal-service/reveal.service';
import { SlidesService } from '../../services/slides/slides.service';
import { SongService } from '../../services/song-service/song.service';
import { SongStatsService } from '../../services/song-stats/song-stats.service';
import { PresentationMenuComponent } from './presentation-menu/presentation-menu.component';

@Component({
  selector: 'app-presentation',
  templateUrl: './presentation.component.html',
  styleUrls: [
    './presentation.component.scss',
    '../../../../node_modules/reveal.js/dist/reveal.css',
    '../../../assets/css/reveal-custom.scss',
    '../../../../node_modules/reveal.js/dist/theme/blood.css',
    '../../../assets/css/theme/blood-custom.css',
  ],
  encapsulation: ViewEncapsulation.None,
  imports: [PresentationMenuComponent],
  providers: [RemoteHost],
})
export class PresentationComponent implements OnInit, AfterViewInit, OnDestroy {
  private activatedRoute = inject(ActivatedRoute);
  private songService = inject(SongService);
  private liturgyService = inject(LiturgyService);
  private location = inject(Location);
  private reveal = inject(RevealService);
  private render = inject(Renderer2);
  private slidesService = inject(SlidesService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private songStats = inject(SongStatsService);
  private remoteHost = inject(RemoteHost);

  // Removing a song and adding it back is still one use in this presentation.
  private countedSongs = new Set<string>();

  readonly slideList = signal<SlideList[]>([]);
  readonly isReady = this.reveal.ready;

  private masses = signal<Liturgy[]>([]);
  private remoteMasses = computed<RemoteMass[]>(() =>
    this.masses().map(({ title }, index) => ({ id: liturgyId(index), title })),
  );

  // the masses of the day that are not in the presentation yet
  readonly liturgyChoices = computed<LiturgyChoice[]>(() => {
    const added = new Set(this.slideList().map(({ liturgy }) => liturgy));

    return this.masses()
      .map(({ title }, index) => ({ id: liturgyId(index), title }))
      .filter(({ id }) => !added.has(id));
  });

  private isDataLoaded$ = new BehaviorSubject(false);

  ngOnInit() {
    toObservable(this.slidesService.init, { injector: this.injector })
      .pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadSlide();
      });

    this.render.addClass(document.body, 'reveal');

    this.remoteHost.attach({
      slides: this.slideList,
      masses: this.remoteMasses,
      add: (id, position) => this.addSlide(id, position),
      remove: (index) => this.removeSlide(index),
    });
    this.remoteHost.connect(new ChannelHostTransport(channelName(this.reveal.presentationId)));
  }

  ngOnDestroy(): void {
    this.render.removeClass(document.body, 'reveal');
    this.reveal.destroy();
  }

  ngAfterViewInit(): void {
    this.isDataLoaded$
      .pipe(
        filter((v) => !!v),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.reveal.init();
      });
  }

  /** Returns the index of the first added song, or null when nothing was added. */
  addSlide(id: string, position: InsertPosition = 'end'): number | null {
    const isLiturgy = liturgyIndex(id) !== null;
    const added = isLiturgy && this.slideList().some(({ liturgy }) => liturgy === id) ? [] : this.slidesFor(id);

    if (!added.length) {
      return null;
    }

    const list = this.slideList();
    const at = position === 'afterCurrent' ? insertionIndex(list, this.reveal.slideIndex()) : list.length;

    this.slideList.set(withIndexes([...list.slice(0, at), ...added, ...list.slice(at)]));

    if (!isLiturgy) {
      this.countShow(id);
    }

    this.updateLocation();

    return at;
  }

  // A mass goes away as a whole, whichever of its parts is removed.
  removeSlide(removedIndex: number) {
    const list = this.slideList();
    const liturgy = list[removedIndex]?.liturgy;
    const removed = (slide: SlideList, index: number) =>
      index === removedIndex || (!!liturgy && slide.liturgy === liturgy);
    const kept = withIndexes(list.filter((slide, index) => !removed(slide, index)));

    this.slideList.set(kept);
    this.updateLocation(slideAfterRemoval(list, removed, this.reveal.slideIndex(), kept));
  }

  private loadSlide() {
    const listID = ((this.activatedRoute.snapshot.params['id'] as string) || '').split(',');
    const liturgy = this.liturgyService.getLiturgy().pipe(tap((masses) => this.masses.set(masses ?? [])));

    forkJoin([liturgy, this.songService.loadSongFromCache()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.buildSlides(listID),
        // still show the (empty) presentation so the menu can be used to add songs
        error: () => this.buildSlides(listID),
      });
  }

  private buildSlides(listID: string[]) {
    this.isDataLoaded$.next(true);

    const slideList = withIndexes(oncePerMass(listID).flatMap((id) => this.slidesFor(id)));

    this.slideList.set(slideList);
    slideList.filter((slide) => this.songService.hasSong(slide.id)).forEach((slide) => this.countShow(slide.id));
  }

  private slidesFor(id: string): SlideList[] {
    const index = liturgyIndex(id);

    if (index !== null) {
      const mass = this.masses()[index];

      return mass ? this.slidesService.getLiturgySlides(id, mass.sections) : [];
    }

    if (!this.songService.hasSong(id)) {
      return [];
    }

    const song = this.songService.getSong(id);

    return [
      {
        id: song.id.toString(),
        title: song.title,
        slides: this.slidesService.getSongSlide(song.text),
        ...lyricsWithChords(song),
      },
    ];
  }

  private countShow(songId: string) {
    if (this.countedSongs.has(songId)) {
      return;
    }

    this.countedSongs.add(songId);
    this.songStats.record('show', songId);
  }

  private updateLocation(indexh?: number) {
    const ids = this.slideList().map((slide) => slide.liturgy ?? slide.id);

    this.location.replaceState(`/presentation/${oncePerMass(ids).toString()}`);
    this.reveal.updateRevealState(indexh);
  }
}

/**
 * Where the screen goes once songs are removed: the same slide when they came before it, or whatever followed
 * when its own song went. Left alone, the screen would keep the number and land in another song.
 */
function slideAfterRemoval(
  list: SlideList[],
  removed: (slide: SlideList, index: number) => boolean,
  current: number,
  kept: SlideList[],
): number {
  let target = current;

  list.forEach((slide, index) => {
    const { startIndex = 0, endIndex = 0 } = slide;

    if (!removed(slide, index) || startIndex > current) {
      return;
    }

    target -= endIndex < current ? slide.slides.length : current - startIndex;
  });

  const total = kept.at(-1)?.endIndex ?? -1;

  return Math.max(0, Math.min(target, total));
}

function withIndexes(list: SlideList[]): SlideList[] {
  let lastIndex = -1;

  return list.map((slide) => {
    const startIndex = lastIndex + 1;
    lastIndex += slide.slides.length;

    return { ...slide, startIndex, endIndex: lastIndex };
  });
}

// A mass is shown once, where the list mentions it first; a song may be shown twice.
function oncePerMass(ids: string[]): string[] {
  return ids.filter((id, index) => liturgyIndex(id) === null || ids.indexOf(id) === index);
}
