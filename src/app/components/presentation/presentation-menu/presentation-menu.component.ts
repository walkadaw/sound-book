import {
  Component,
  OnInit,
  ViewEncapsulation,
  DestroyRef,
  ElementRef,
  AfterViewInit,
  inject,
  signal,
  input,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { fromEvent } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { MatIcon } from '@angular/material/icon';
import { NgTemplateOutlet } from '@angular/common';
import { TagList, TAGS_LIST } from '../../../constants/tag-list';
import { FuseService } from '../../../services/fuse-service/fuse.service';
import { MatchHighlightComponent } from '../../match-highlight/match-highlight.component';
import { Song } from '../../../interfaces/song';
import { SlideList } from '../../../interfaces/slide';
import { RevealService } from '../../../services/reveal-service/reveal.service';
import { SongService } from '../../../services/song-service/song.service';

@Component({
  selector: 'app-presentation-menu',
  templateUrl: './presentation-menu.component.html',
  styleUrls: ['./presentation-menu.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [MatIcon, ReactiveFormsModule, NgTemplateOutlet, MatchHighlightComponent],
})
export class PresentationMenuComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private fuseService = inject(FuseService);
  private songService = inject(SongService);
  private reveal = inject(RevealService);

  readonly slideList = input<SlideList[]>();

  readonly addedSong = output<string>();
  readonly removeSong = output<number>();

  readonly searchElement = viewChild<ElementRef<HTMLInputElement>>('searchElement');

  readonly active = signal(false);
  isShowControls = false;
  isSpeakerNotes = false;
  readonly isSearchFocused = signal(false);
  readonly isFullscreen = signal(!!document.fullscreenElement);
  readonly hideMenu = signal(false);
  readonly openSelectedTag = signal(false);
  readonly selectedTag = signal<TagList | undefined>(undefined);
  tagsList: TagList[];
  search = new FormControl('', { nonNullable: true });
  private selectedTagId = signal(0);
  private debouncedSearch = toSignal(
    this.search.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );

  readonly foundSongs = this.fuseService.getSearchResults(
    this.selectedTagId,
    this.debouncedSearch,
    this.songService.songList,
  );

  readonly selectedSlide = signal(this.reveal.getActiveSlide());

  private revealNotes = this.reveal.getNotesPlugin();

  ngOnInit(): void {
    this.initTag();
    this.initSearch();
    this.isShowControls = this.reveal.isShowControls();
    this.isSpeakerNotes = this.reveal.isSpeakerNotes();

    if (!this.slideList()?.length) {
      this.toggleMenu();
    }

    fromEvent(document, 'fullscreenchange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isFullscreen.set(!!document.fullscreenElement));

    fromEvent<MessageEvent>(window, 'message')
      .pipe(
        filter((event) => event && event.data && event.source !== window.self),
        map((event) => JSON.parse(event.data)),
        filter((data) => data && data.namespace === 'reveal-menu'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        switch (data.type) {
          case 'addSong':
            this.addedSong.emit(data.payload.toString());
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
    this.active.update((active) => !active);
  }

  toggleShowIconMenu(dispatch = true) {
    this.hideMenu.update((hideMenu) => !hideMenu);
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
      this.selectedTag.set(tag);
      this.selectedTagId.set(tagId);

      const searchElement = this.searchElement();
      if (searchElement) {
        searchElement.nativeElement.focus();
      }
    }

    this.openSelectedTag.set(false);
  }

  onClickSearchSong(song: Song) {
    this.search.setValue('');
    this.addedSong.emit(song.id.toString());

    this.sendPostMessage('addSong', song.id);
  }

  onClickRemovedSong(event: Event, index: number) {
    event.stopPropagation();
    this.removeSong.emit(index);

    this.sendPostMessage('removeSong', index);
  }

  toggleSelectedTag() {
    this.openSelectedTag.update((open) => !open);
  }

  fullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  togglePause(): void {
    this.reveal.togglePause();
  }

  onSearchFocused() {
    this.isSearchFocused.set(true);
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isSearchFocused.set(false);
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
    this.search.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(() => this.openSelectedTag()),
      )
      .subscribe(() => {
        this.openSelectedTag.set(false);
      });
  }

  private initHighlightCurrentSlide() {
    this.reveal
      .onSlideChange()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((slideNumber) => {
        this.selectedSlide.set(slideNumber);

        if (this.active() && !this.isSpeakerNotes) {
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
