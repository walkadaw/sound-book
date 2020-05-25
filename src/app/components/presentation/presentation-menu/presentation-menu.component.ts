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
} from '@angular/core';
import { TagList } from '../../../interfaces/tag-list';
import { TAGS_LIST } from '../../../constants/tag-list';
import { FormControl } from '@angular/forms';
import { FuseService } from '../../../services/fuse-service/fuse.service';
import { Observable, Subject } from 'rxjs';
import { Song } from '../../../interfaces/song';
import { takeUntil, filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';

declare const RevealNotes;

@Component({
  selector: 'app-presentation-menu',
  templateUrl: './presentation-menu.component.html',
  styleUrls: ['./presentation-menu.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PresentationMenuComponent implements OnInit, OnDestroy {
  @Input() active = false;
  @Output() closeMenu = new EventEmitter<boolean>();
  @Output() themeChange = new EventEmitter<null>();
  @Output() showMenuChange = new EventEmitter<boolean>();

  @ViewChild('searchElement') searchElement: ElementRef<HTMLInputElement>;

  hideMenu = false;
  openSelectedTag = false;
  selectedTag: TagList;
  tagsList: TagList[];
  search: FormControl = new FormControl();
  songListFiltered$: Observable<Song[]>;

  private onDestroy$ = new Subject<void>();

  constructor(private fuseService: FuseService) {}

  ngOnInit(): void {
    this.tagsList = [
      {
        id: 0,
        title: 'Усе',
        icon: 'search',
      },
      ...TAGS_LIST,
    ];
    this.onClickTag(0);
    const search$ = this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged());

    this.songListFiltered$ = this.fuseService.getFilteredSong(search$);
    this.search.valueChanges
      .pipe(
        takeUntil(this.onDestroy$),
        filter(() => this.openSelectedTag)
      )
      .subscribe(() => (this.openSelectedTag = false));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClose() {
    this.closeMenu.emit(true);
  }

  openRemoteControl() {
    RevealNotes.open();
  }

  toggleTheme() {
    this.themeChange.emit();
  }

  toggleMenu() {
    this.hideMenu = !this.hideMenu;
    this.showMenuChange.emit(this.hideMenu);
  }

  onClickTag(tagId: number) {
    const tag = this.tagsList.find(({ id }) => id === tagId);
    console.log(tag, tagId);

    if (tag) {
      this.selectedTag = tag;
      this.fuseService.setSelectedTag(tagId);

      if (this.searchElement) {
        this.searchElement.nativeElement.focus();
      }
    }

    this.openSelectedTag = false;
  }

  toggleSelectedTag() {
    this.openSelectedTag = !this.openSelectedTag;
  }

  trackBySong(index: number, song: Song) {
    return song.id;
  }
}
