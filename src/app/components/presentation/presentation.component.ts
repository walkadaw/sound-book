import { Component, ViewEncapsulation, AfterViewInit, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SongService } from '../../services/song-service/song.service';
import { LITURGY_ACRONYM } from '../../constants/liturgy-acronym';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { SlideList } from '../../interfaces/slide';
import { RevealService } from '../../services/reveal-service/reveal.service';
import { forkJoin, BehaviorSubject } from 'rxjs';
import { take, filter } from 'rxjs/operators';

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
export class PresentationComponent implements OnInit, AfterViewInit {
  slideList: SlideList[];

  private isDataLoaded$ = new BehaviorSubject(false);

  constructor(
    private activatedRoute: ActivatedRoute,
    private songService: SongService,
    private liturgyService: LiturgyService,
    private location: Location,
    private reveal: RevealService
  ) {}

  ngOnInit() {
    this.loadSlide();
  }

  ngAfterViewInit(): void {
    this.isDataLoaded$
      .pipe(
        filter((v) => !!v),
        take(1)
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
    if (this.songService.hasSlideSong(idSong)) {
      const newSlide = this.songService.getSlideSong(idSong);

      const lastIndex = this.slideList.length ? this.slideList[this.slideList.length - 1].endIndex : -1;
      this.slideList.push({ ...newSlide, startIndex: lastIndex + 1, endIndex: lastIndex + newSlide.slides.length });

      if (!this.reveal.isSpeakerNotes()) {
        this.location.replaceState('/presentation/' + this.slideList.map((slide) => slide.id).toString());
      }
      this.reveal.updateRevealState();
    }
  }

  removeSlide(removedIndex: number) {
    this.slideList = this.slideList.filter((slide, index) => index !== removedIndex);

    if (!this.reveal.isSpeakerNotes()) {
      this.location.replaceState('/presentation/' + this.slideList.map((slide) => slide.id).toString());
    }
    this.reveal.updateRevealState();
  }

  trackBySlides(index: number, item: SlideList) {
    return item.id;
  }

  private loadSlide() {
    const idParams: string = this.activatedRoute.snapshot.params.id || '';
    const listID = idParams.split(',');
    forkJoin([this.liturgyService.loadSlideForLiturgy(), this.songService.loadSlideSongs()]).subscribe(() => {
      this.isDataLoaded$.next(true);

      this.slideList = listID.reduce<SlideList[]>((acc, id) => {
        let slide: SlideList;
        if (isNaN(parseInt(id, 10))) {
          if (LITURGY_ACRONYM.has(id) && this.liturgyService.hasSlideLiturgy(id)) {
            slide = this.liturgyService.getSlideLiturgy(id);
          }
        } else if (this.songService.hasSlideSong(id)) {
          slide = this.songService.getSlideSong(id);
        }

        if (slide) {
          const lastIndex = acc.length ? acc[acc.length - 1].endIndex : -1;
          acc.push({ ...slide, startIndex: lastIndex + 1, endIndex: lastIndex + slide.slides.length });
        }

        return acc;
      }, []);
    });
  }
}
