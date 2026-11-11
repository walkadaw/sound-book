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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgTemplateOutlet } from '@angular/common';
import { TagList, TAGS_LIST } from '../../../constants/tag-list';
import { FuseService } from '../../../services/fuse-service/fuse.service';
import { PresentationFileService } from '../../../services/presentation-file/presentation-file.service';
import { MatchHighlightComponent } from '../../match-highlight/match-highlight.component';
import { LiturgyChoice } from '../../../interfaces/liturgy';
import { Song } from '../../../interfaces/song';
import { SlideList } from '../../../interfaces/slide';
import { RemoteHost } from '../../../services/remote-control/remote-host.service';
import { RevealService } from '../../../services/reveal-service/reveal.service';
import { SongService } from '../../../services/song-service/song.service';
import { controlWindowUrl } from '../../../services/remote-control/remote-control';
import { RemoteDialogComponent } from '../remote-dialog/remote-dialog.component';

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
  private presentationFile = inject(PresentationFileService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private remoteHost = inject(RemoteHost);

  readonly slideList = input<SlideList[]>();
  // the masses of the day that can be added, listed before the songs
  readonly liturgy = input<LiturgyChoice[]>([]);

  readonly addedSong = output<string>();
  readonly removeSong = output<number>();

  readonly searchElement = viewChild<ElementRef<HTMLInputElement>>('searchElement');

  readonly isShowControls = this.reveal.isShowControls();
  readonly active = signal(false);
  readonly isSearchFocused = signal(false);
  readonly isFullscreen = signal(!!document.fullscreenElement);
  readonly hideMenu = signal(false);
  readonly isDownloading = signal(false);
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

  readonly selectedSlide = this.reveal.slideIndex;

  ngOnInit(): void {
    this.initTag();
    this.initSearch();

    if (!this.slideList()?.length) {
      this.toggleMenu();
    }

    fromEvent(document, 'fullscreenchange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isFullscreen.set(!!document.fullscreenElement));

    this.destroyRef.onDestroy(() => {
      // the body outlives the presentation
      document.body.classList.remove('hideMenu');
    });
  }

  ngAfterViewInit() {
    this.closeOnSlideChange();

    // an empty presentation starts with choosing songs
    if (!this.slideList()?.length) {
      this.searchElement()?.nativeElement.focus();
    }
  }

  /** The remote in a window beside the presentation, for a second screen of the same computer. */
  openControlWindow() {
    const id = this.reveal.presentationId;

    // by its name the same window comes back to the front instead of a second one opening
    window.open(controlWindowUrl(id), `remote-control-${id}`, 'popup,width=1330,height=800');
  }

  openRemoteDevice() {
    this.remoteHost.openRoom();
    this.dialog.open(RemoteDialogComponent, { data: this.remoteHost });
  }

  toggleTheme() {
    this.reveal.setLight(!this.reveal.light());
  }

  async downloadSlides() {
    // the button stays enabled while the file is made, so it keeps the keyboard focus
    if (this.isDownloading()) {
      return;
    }

    this.isDownloading.set(true);

    try {
      await this.presentationFile.downloadPptx((this.slideList() ?? []).flatMap((song) => song.slides));
    } catch (error) {
      console.error('pptx generation', error);
      this.snackBar.open('Не атрымалася стварыць файл. Паспрабуйце яшчэ раз.', 'Зачыніць', { duration: 5000 });
    } finally {
      this.isDownloading.set(false);
    }
  }

  toggleMenu() {
    this.active.update((active) => !active);
  }

  toggleShowIconMenu() {
    this.hideMenu.update((hidden) => !hidden);
    document.body.classList.toggle('hideMenu', this.hideMenu());
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

  private closeOnSlideChange() {
    this.reveal
      .onSlideChange()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.active()) {
          this.toggleMenu();
        }
      });
  }
}
