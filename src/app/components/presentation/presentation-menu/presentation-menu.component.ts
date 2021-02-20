import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { TagList } from '../../../interfaces/tag-list';
import { TAGS_LIST } from '../../../constants/tag-list';
import { FormControl } from '@angular/forms';
import { FuseService } from '../../../services/fuse-service/fuse.service';
import { Observable, Subject, fromEvent } from 'rxjs';
import { Song } from '../../../interfaces/song';
import { takeUntil, filter, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { SlideList } from '../../../interfaces/slide';
import { RevealService } from '../../../services/reveal-service/reveal.service';
import { SongService } from '../../../services/song-service/song.service';

@Component({
  selector: 'app-presentation-menu',
  templateUrl: './presentation-menu.component.html',
  styleUrls: ['./presentation-menu.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PresentationMenuComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() slideList: SlideList[];

  @Output() addedSong = new EventEmitter<number | string>();
  @Output() removeSong = new EventEmitter<number>();

  @ViewChild('searchElement') searchElement: ElementRef<HTMLInputElement>;

  active = false;
  isShowControls = false;
  isSpeakerNotes = false;
  isSearchFocused = false;
  document = document;
  hideMenu = false;
  openSelectedTag = false;
  selectedTag: TagList;
  tagsList: TagList[];
  search: FormControl = new FormControl();
  songListFiltered$: Observable<Song[]>;
  selectedSlide = this.reveal.getActiveSlide();

  private revealNotes = this.reveal.getNotesPlugin();
  private onDestroy$ = new Subject<void>();

  constructor(private fuseService: FuseService, private songService: SongService, private reveal: RevealService) {}

  ngOnInit(): void {
    this.initTag();
    this.initSearch();
    this.isShowControls = this.reveal.isShowControls();
    this.isSpeakerNotes = this.reveal.isSpeakerNotes();

    if (!this.slideList.length) {
      this.toggleMenu();
    }

    fromEvent<MessageEvent>(window, 'message')
      .pipe(
        filter((event) => event && event.data && event.source !== window.self),
        map((event) => JSON.parse(event.data)),
        filter((data) => data && data.namespace === 'reveal-menu'),
        takeUntil(this.onDestroy$)
      )
      .subscribe((data) => {
        switch (data.type) {
          case 'addSong':
            this.addedSong.emit(data.payload);
            break;
          case 'removeSong':
            this.removeSong.emit(data.payload);
            break;
          case 'hideMenuControl':
            this.toggleShowIconMenu(false);
            break;
          case 'changeTheme':
            this.toggleTheme(false);
            break;

          default:
            break;
        }
      });
  }

  ngAfterViewInit() {
    this.initHighlightCurrentSlide();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  openRemoteControl() {
    this.revealNotes.open();
  }

  toggleTheme(dispatch = true) {
    if (!this.isSpeakerNotes) {
      document.body.classList.toggle('white');
    }

    if (dispatch) {
      this.sendPostMessage('changeTheme');
    }
  }

  toggleMenu() {
    this.active = !this.active;
  }

  toggleShowIconMenu(dispatch = true) {
    this.hideMenu = !this.hideMenu;
    if (!this.isSpeakerNotes) {
      document.body.classList.toggle('hideMenu');
    }

    if (dispatch) {
      this.sendPostMessage('hideMenuControl');
    }
  }

  openSlide(song: SlideList) {
    this.toggleMenu();

    this.reveal.slide(song.startIndex);
  }

  onClickTag(tagId: number) {
    const tag = this.tagsList.find(({ id }) => id === tagId);

    if (tag) {
      this.selectedTag = tag;
      this.fuseService.setSelectedTag(tagId);

      if (this.searchElement) {
        this.searchElement.nativeElement.focus();
      }
    }

    this.openSelectedTag = false;
  }

  onClickSearchSong(song: SlideList) {
    this.search.setValue('');
    this.addedSong.emit(song.id);

    this.sendPostMessage('addSong', song.id);
  }

  onClickRemovedSong(event: Event, index: number) {
    event.stopPropagation();
    this.removeSong.emit(index);

    this.sendPostMessage('removeSong', index);
  }

  toggleSelectedTag() {
    this.openSelectedTag = !this.openSelectedTag;
  }

  fullScreen() {
    document.fullscreenElement ? document.exitFullscreen() : this.enterFullscreen();
  }

  togglePause(): void {
    this.reveal.togglePause();
  }

  onSearchFocused() {
    this.isSearchFocused = true;
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isSearchFocused = false;
    }, 250);
  }

  trackBySong(index: number, song: Song) {
    return song.id;
  }

  private enterFullscreen() {
    const element: any = document.documentElement;

    // Check which implementation is available
    const requestMethod =
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.webkitRequestFullScreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen;

    if (requestMethod) {
      requestMethod.apply(element);
    }
  }

  private initTag() {
    this.tagsList = [
      {
        id: 0,
        title: 'Усе',
        icon: 'search',
      },
      ...TAGS_LIST,
    ];
    this.onClickTag(0);
  }

  private initSearch() {
    const search$ = this.search.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged());

    this.songListFiltered$ = this.fuseService.getFilteredSong(search$, this.songService.songList);
    this.search.valueChanges
      .pipe(
        takeUntil(this.onDestroy$),
        filter(() => this.openSelectedTag)
      )
      .subscribe(() => (this.openSelectedTag = false));
  }

  private initHighlightCurrentSlide() {
    this.reveal
      .onSlideChange()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((slideNumber) => {
        this.selectedSlide = slideNumber;

        if (this.active && !this.isSpeakerNotes) {
          this.toggleMenu();
        }
      });
  }

  private sendPostMessage(type: string, payload?: number | string) {
    const message = {
      namespace: 'reveal-menu',
      isSpeakerNotes: this.isSpeakerNotes,
      payload,
      type,
    };
    window.parent.postMessage(JSON.stringify(message), '*');
  }
}
