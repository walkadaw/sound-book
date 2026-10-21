import {
  Component,
  OnInit,
  ViewEncapsulation,
  DestroyRef,
  ElementRef,
  AfterViewInit,
  inject,
  signal,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { fromEvent } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { MatIcon } from '@angular/material/icon';
import { NgTemplateOutlet } from '@angular/common';
import { TagList, TAGS_LIST } from '../../../constants/tag-list';
import { FuseService } from '../../../services/fuse-service/fuse.service';
import { MatchHighlightComponent } from '../../match-highlight/match-highlight.component';
import { LiturgyChoice } from '../../../interfaces/liturgy';
import { Song } from '../../../interfaces/song';
import { SlideList } from '../../../interfaces/slide';
import { RevealService } from '../../../services/reveal-service/reveal.service';
import { SongService } from '../../../services/song-service/song.service';
import {
  PresentationChannel,
  PresentationMessage,
} from '../../../services/presentation-channel/presentation-channel.service';

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
  private channel = inject(PresentationChannel);

  readonly slideList = input<SlideList[]>();
  // the masses of the day that can be added, listed before the songs
  readonly liturgy = input<LiturgyChoice[]>([]);

  readonly addedSong = output<string>();
  readonly removeSong = output<number>();

  readonly searchElement = viewChild<ElementRef<HTMLInputElement>>('searchElement');

  readonly isShowControls = this.reveal.isShowControls();
  readonly isSpeakerNotes = this.reveal.isSpeakerNotes();
  // The control window keeps the menu open beside the slide; the upcoming slide preview has no controls.
  readonly isPinned = this.isSpeakerNotes && this.isShowControls;
  private isUpcomingPreview = this.isSpeakerNotes && !this.isShowControls;
  readonly active = signal(this.isPinned);
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

  // A mass is found by its title or by the start of the word "літургія", and a song tag hides the masses.
  readonly foundLiturgy = computed(() => {
    const search = this.debouncedSearch().trim().toLowerCase();

    if (this.selectedTagId()) {
      return [];
    }

    return this.liturgy()
      .filter(({ title }) => 'літургія'.startsWith(search) || title.toLowerCase().includes(search))
      .map(({ id, title }) => ({ id, title: `Літургія: ${title}` }));
  });

  readonly selectedSlide = signal(this.reveal.getActiveSlide());

  ngOnInit(): void {
    this.initTag();
    this.initSearch();

    // the upcoming slide preview of the speaker view shows only the slide
    if (!this.slideList()?.length && !this.isSpeakerNotes) {
      this.toggleMenu();
    }

    if (this.isPinned) {
      document.body.classList.add('menuPinned');
      this.reveal.layout();
    }

    fromEvent(document, 'fullscreenchange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isFullscreen.set(!!document.fullscreenElement));

    this.channel.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => this.onMessage(message));

    this.destroyRef.onDestroy(() => {
      // the body outlives the presentation
      document.body.classList.remove('menuPinned', 'hideMenu', 'white');
    });

    if (this.isSpeakerNotes) {
      // The main window may have hidden its controls before the speaker view was opened, and the speaker view
      // moves the upcoming preview only once, maybe before its songs have loaded.
      this.channel.send({ type: 'requestState' });
    }
  }

  ngAfterViewInit() {
    this.initHighlightCurrentSlide();

    // an empty presentation starts with choosing songs
    if (!this.slideList()?.length && !this.isSpeakerNotes) {
      this.searchElement()?.nativeElement.focus();
    }
  }

  openRemoteControl() {
    this.reveal.openNotes();
  }

  toggleTheme(dispatch = true) {
    if (!this.isSpeakerNotes) {
      document.body.classList.toggle('white');
    }

    if (dispatch) {
      this.channel.send({ type: 'changeTheme' });
    }
  }

  toggleMenu() {
    if (!this.isPinned) {
      this.active.update((active) => !active);
    }
  }

  toggleShowIconMenu() {
    this.setHideMenu(!this.hideMenu());
    this.channel.send({ type: 'hideMenu', hidden: this.hideMenu() });
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
    this.addSong(song.id.toString());
  }

  onClickSearchLiturgy(id: string) {
    this.search.setValue('');
    this.addSong(id);
  }

  onClickRemovedSong(event: Event, index: number) {
    event.stopPropagation();
    this.removeSong.emit(index);
    this.channel.send({ type: 'removeSong', index });
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

  private addSong(id: string) {
    this.addedSong.emit(id);
    this.channel.send({ type: 'addSong', id });
  }

  private setHideMenu(hidden: boolean) {
    this.hideMenu.set(hidden);

    if (!this.isSpeakerNotes) {
      document.body.classList.toggle('hideMenu', hidden);
    }
  }

  private onMessage(message: PresentationMessage) {
    switch (message.type) {
      case 'addSong':
        this.addedSong.emit(message.id);
        break;
      case 'removeSong':
        this.removeSong.emit(message.index);
        break;
      case 'hideMenu':
        this.setHideMenu(message.hidden);
        break;
      case 'changeTheme':
        this.toggleTheme(false);
        break;
      case 'requestState':
        if (!this.isSpeakerNotes) {
          this.channel.send({ type: 'state', hidden: this.hideMenu(), slide: this.reveal.getActiveSlide() });
        }
        break;
      case 'state':
        this.setHideMenu(message.hidden);

        if (this.isUpcomingPreview) {
          this.reveal.slide(message.slide + 1);
        }
        break;
    }
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
    this.selectedTag.set(this.tagsList[0]);
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
}
