import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SongService } from '../../services/song-service/song.service';
import { Song } from '../../interfaces/song';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { TAGS_LIST } from '../../constants/tag-list';
import { TagList } from '../../interfaces/tag-list';

import { Store } from '@ngrx/store';
import { IAppState } from '../../redux/models/IAppState';
import { getSearchTerm } from '../../redux/selector/search.selector';
import { FuseService } from '../../services/fuse-service/fuse.service';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPageComponent implements OnInit {
  tags$: BehaviorSubject<Set<number>> = new BehaviorSubject(new Set());
  songListFiltered$: Observable<Song[]>;
  readonly tagsList: TagList[] = TAGS_LIST;

  constructor(private fuseService: FuseService, private store: Store<IAppState>) {}

  ngOnInit(): void {
    this.songListFiltered$ = this.fuseService.getFilteredSong(this.store.select(getSearchTerm));
  }

  tagToggle(eventTag: number) {
    this.fuseService.setSelectedTag(eventTag);
  }

  trackBySong(index: string, item: Song) {
    return item.id;
  }
}
