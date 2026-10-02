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
import { filter, take } from 'rxjs/operators';
import { ALL_LITURGY, LITURGY_ACRONYM } from '../../constants/liturgy-acronym';
import { SlideList } from '../../interfaces/slide';
import { lyricsWithChords } from '../../services/chord/song-structure';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
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

  // Removing a song and adding it back is still one use in this presentation.
  private countedSongs = new Set<string>();
  // The speaker notes window loads the same presentation (with ?receiver) in its own frames.
  private isNotesWindow = /receiver/i.test(this.location.path());

  readonly slideList = signal<SlideList[]>([]);
  readonly isReady = this.reveal.ready;
  readonly isSpeakerNotes = computed(() => this.reveal.ready() && this.reveal.isSpeakerNotes());

  private isDataLoaded$ = new BehaviorSubject(false);

  ngOnInit() {
    toObservable(this.slidesService.init, { injector: this.injector })
      .pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadSlide();
      });

    this.render.addClass(document.body, 'reveal');
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

  addSlide(idSong: string) {
    if (this.songService.hasSong(idSong)) {
      const song = this.songService.getSong(idSong);
      const { id, title } = song;
      const slides = this.slidesService.getSongSlide(song.text);

      this.slideList.update((list) => {
        const lastIndex = list.length ? list[list.length - 1].endIndex : -1;

        return [
          ...list,
          {
            id: id.toString(),
            slides,
            title,
            ...lyricsWithChords(song),
            startIndex: lastIndex + 1,
            endIndex: lastIndex + slides.length,
          },
        ];
      });

      this.countShow(id.toString());
      this.updateLocation();
    }
  }

  removeSlide(removedIndex: number) {
    this.slideList.update((list) =>
      list
        .filter((slide, index) => index !== removedIndex)
        .map((slide, index, slideList) => {
          if (index >= removedIndex) {
            const lastIndex = index > 0 ? slideList[index - 1].endIndex : -1;

            return { ...slide, startIndex: lastIndex + 1, endIndex: lastIndex + slide.slides.length };
          }

          return slide;
        }),
    );

    this.updateLocation();
  }

  trackBySlides(index: number, item: SlideList) {
    return item.id;
  }

  private loadSlide() {
    const listID = ((this.activatedRoute.snapshot.params['id'] as string) || '').split(',');
    forkJoin([this.liturgyService.loadSlideForLiturgy(), this.songService.loadSongFromCache()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.buildSlides(listID),
        // still show the (empty) presentation so the menu can be used to add songs
        error: () => this.buildSlides(listID),
      });
  }

  private buildSlides(listID: string[]) {
    this.isDataLoaded$.next(true);

    const slideList = listID.reduce<SlideList[]>((acc, id) => {
      let lastIndex = acc.length ? acc[acc.length - 1].endIndex : -1;

      if (Number.isNaN(parseInt(id, 10))) {
        if (id === ALL_LITURGY) {
          const liturgys = (this.liturgyService.slideLiturgy || []).map((liturgy) => {
            const startIndex = lastIndex + 1;
            lastIndex += liturgy.slides.length;

            return { ...liturgy, startIndex, endIndex: lastIndex };
          });

          acc.push(...liturgys);
        } else if (LITURGY_ACRONYM.has(id) && this.liturgyService.hasSlideLiturgy(id)) {
          const slide = this.liturgyService.getSlideLiturgy(id);

          acc.push({
            ...slide,
            startIndex: lastIndex + 1,
            endIndex: lastIndex + slide.slides.length,
          });
        }
      } else if (this.songService.hasSong(id)) {
        const song = this.songService.getSong(id);
        const slide = this.slidesService.getSongSlide(song.text);

        acc.push({
          id: song.id.toString(),
          title: song.title,
          slides: slide,
          ...lyricsWithChords(song),
          startIndex: lastIndex + 1,
          endIndex: lastIndex + slide.length,
        });
      }

      return acc;
    }, []);

    this.slideList.set(slideList);
    slideList.filter((slide) => this.songService.hasSong(slide.id)).forEach((slide) => this.countShow(slide.id));
  }

  private countShow(songId: string) {
    if (this.isNotesWindow || this.countedSongs.has(songId)) {
      return;
    }

    this.countedSongs.add(songId);
    this.songStats.record('show', songId);
  }

  private updateLocation() {
    if (!this.reveal.isSpeakerNotes()) {
      this.location.replaceState(
        `/presentation/${this.slideList()
          .map((slide) => slide.id)
          .toString()}`,
      );
    }
    this.reveal.updateRevealState();
  }
}
