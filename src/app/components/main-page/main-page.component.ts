import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SongService } from '../../services/song-service/song.service';
import { Song } from '../../interfaces/song';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { TAGS_LIST } from '../../constants/tag-list';
import { TagList } from '../../interfaces/tag-list';
import Fuse from 'fuse.js';
import { Store } from '@ngrx/store';
import { IAppState } from '../../redux/models/IAppState';
import { getSearchTerm } from '../../redux/selector/search.selector';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPageComponent implements OnInit {
  tags$: BehaviorSubject<Set<number>> = new BehaviorSubject(new Set());
  tagsList: TagList[] = TAGS_LIST;
  songListFiltered$: Observable<Song[]>;
  private songList$: Observable<Song[]>;
  private fuse: Fuse<Song, Fuse.IFuseOptions<Song>>;
  private options = {
    shouldSort: true,
    tokenize: true,
    threshold: 0,
    location: 0,
    distance: 100,

    maxPatternLength: 32,
    minMatchCharLength: 1,

    id: 'id',
    keys: [
      {
        name: 'title',
        weight: 0.7,
      },
      {
        name: 'text',
        weight: 0.3,
      },
    ],
  };

  constructor(private songService: SongService, private store: Store<IAppState>) {}

  ngOnInit(): void {
    this.fuse = new Fuse([], this.options);
    this.songList$ = this.tags$.pipe(
      map((tags) => {
        if (tags.size) {
          return this.songService.songList.filter(
            (song) => song.tag && Object.keys(song.tag).some((tag) => tags.has(+tag))
          );
        }
        return this.songService.songList;
      }),
      tap((songList) => this.fuse.setCollection(songList))
    );

    this.songListFiltered$ = combineLatest([this.songList$, this.store.select(getSearchTerm)]).pipe(
      map(([songList, searchTest]) => {
        if (searchTest) {
          return this.fuse.search(searchTest).map((fuseItem) => fuseItem.item);
        }
        return songList;
      })
    );
  }

  tagToggle(eventTag: number) {
    const tags = this.tags$.value;

    if (!eventTag) {
      tags.clear();
      return this.tags$.next(tags);
    }

    tags.has(eventTag) ? tags.delete(eventTag) : tags.add(eventTag);
    this.tags$.next(tags);
  }

  trackBySong(index: string, item: Song) {
    return item.id;
  }
}
