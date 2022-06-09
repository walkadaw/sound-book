import { Location } from '@angular/common';
import {
  AfterViewInit, Component, OnDestroy, OnInit, Renderer2, ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, forkJoin, Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { LITURGY_ACRONYM } from '../../constants/liturgy-acronym';
import { SlideList } from '../../interfaces/slide';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { RevealService } from '../../services/reveal-service/reveal.service';
import { SlidesService } from '../../services/slides/slides.service';
import { SongService } from '../../services/song-service/song.service';

@Component({
  selector: 'app-presentation',
  templateUrl: './presentation.component.html',
  styleUrls: [
    './presentation.component.scss',
    '../../../assets/css/reveal.scss',
    '../../../assets/css/theme/blood.css',
  ],
  encapsulation: ViewEncapsulation.None,
})
export class PresentationComponent implements OnInit, AfterViewInit, OnDestroy {
  slideList: SlideList[];

  private isDataLoaded$ = new BehaviorSubject(false);
  private onDestroy$ = new Subject<void>();

  constructor(
    private activatedRoute: ActivatedRoute,
    private songService: SongService,
    private liturgyService: LiturgyService,
    private location: Location,
    private reveal: RevealService,
    private render: Renderer2,
    private slidesService: SlidesService,
  ) {}

  ngOnInit() {
    this.slidesService.init$.pipe(
      filter(Boolean),
      take(1),
      takeUntil(this.onDestroy$),
    ).subscribe(() => {
      this.loadSlide();
    });

    this.render.addClass(document.body, 'reveal');
  }

  ngOnDestroy(): void {
    this.render.removeClass(document.body, 'reveal');
  }

  ngAfterViewInit(): void {
    this.isDataLoaded$
      .pipe(
        filter((v) => !!v),
        take(1),
        takeUntil(this.onDestroy$),
      )
      .subscribe(() => {
        this.reveal.init();
      });
  }

  isReady(): boolean {
    return this.reveal.isReady();
  }

  isSpeakerNotes(): boolean {
    return this.reveal.isSpeakerNotes();
  }

  addSlide(idSong: string) {
    if (this.songService.hasSong(idSong)) {
      const {
        id, title, text, chord,
      } = this.songService.getSong(idSong);
      const slides = this.slidesService.getSongSlide(text);

      const lastIndex = this.slideList.length ? this.slideList[this.slideList.length - 1].endIndex : -1;
      this.slideList.push({
        id: id.toString(),
        slides,
        title,
        text,
        chord,
        startIndex: lastIndex + 1,
        endIndex: lastIndex + slides.length,
      });

      if (!this.reveal.isSpeakerNotes()) {
        this.location.replaceState(`/presentation/${this.slideList.map((slide) => slide.id).toString()}`);
      }
      this.reveal.updateRevealState();
    }
  }

  removeSlide(removedIndex: number) {
    this.slideList = this.slideList
      .filter((slide, index) => index !== removedIndex)
      .map((slide, index, slideList) => {
        if (index >= removedIndex) {
          const lastIndex = index > 0 ? slideList[index - 1].endIndex : -1;

          return { ...slide, startIndex: lastIndex + 1, endIndex: lastIndex + slide.slides.length };
        }

        return slide;
      });

    if (!this.reveal.isSpeakerNotes()) {
      this.location.replaceState(`/presentation/${this.slideList.map((slide) => slide.id).toString()}`);
    }
    this.reveal.updateRevealState();
  }

  trackBySlides(index: number, item: SlideList) {
    return item.id;
  }

  private loadSlide() {
    const listID = (this.activatedRoute.snapshot.params.id as string || '').split(',');
    forkJoin([
      this.liturgyService.loadSlideForLiturgy(),
      this.songService.loadSongFromCache(),
    ]).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.isDataLoaded$.next(true);

      this.slideList = listID.reduce<SlideList[]>((acc, id) => {
        let slide: SlideList;
        let chord: string;
        let text: string;

        if (Number.isNaN(parseInt(id, 10))) {
          if (LITURGY_ACRONYM.has(id) && this.liturgyService.hasSlideLiturgy(id)) {
            slide = this.liturgyService.getSlideLiturgy(id);
          }
        } else if (this.songService.hasSong(id)) {
          const song = this.songService.getSong(id);

          slide = {
            id: song.id.toString(),
            title: song.title,
            slides: this.slidesService.getSongSlide(song.text),
          };
          chord = song.chord;
          text = song.text;
        }

        if (slide) {
          const lastIndex = acc.length ? acc[acc.length - 1].endIndex : -1;
          acc.push({
            ...slide, chord, text, startIndex: lastIndex + 1, endIndex: lastIndex + slide.slides.length,
          });
        }

        return acc;
      }, []);
    });
  }
}
