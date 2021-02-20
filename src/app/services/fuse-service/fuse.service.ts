import { Injectable } from '@angular/core';
import Fuse from 'fuse.js';
import { Song } from '../../interfaces/song';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, switchMap, debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FuseService {
  selectedTags$: BehaviorSubject<number> = new BehaviorSubject(0);

  private fuse: Fuse<Song, Fuse.IFuseOptions<Song>>;

  constructor() {
    this.fuse = new Fuse([], this.getOptions());
  }

  getFilteredSong(search$: Observable<string>, allSongList: Song[]): Observable<Song[]> {
    return this.selectedTags$.pipe(
      map((selectedTags) => {
        if (selectedTags) {
          return allSongList.filter((song) => song.tag && Object.keys(song.tag).some((tag) => selectedTags === +tag));
        }
        return allSongList;
      }),
      tap((songList) => this.fuse.setCollection(songList)),
      debounceTime(100),
      switchMap((songList) =>
        search$.pipe(
          map((searchTest) => {
            if (searchTest) {
              return this.fuse.search(searchTest).map((fuseItem) => fuseItem.item);
            }
            return songList;
          })
        )
      )
    );
  }

  setSelectedTag(tagId: number) {
    if (this.selectedTags$.value !== tagId) {
      this.selectedTags$.next(tagId);
    }
  }

  private getOptions() {
    return {
      threshold: 0.4,
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
  }
}
