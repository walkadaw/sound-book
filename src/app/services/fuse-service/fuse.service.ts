import { Injectable } from '@angular/core';
import Fuse from 'fuse.js';
import { Song } from '../../interfaces/song';
import { Observable } from 'rxjs';
import { map, tap, switchMap, debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FuseService {
  private fuse: Fuse<Song, Fuse.IFuseOptions<Song>>;

  constructor() {
    this.fuse = new Fuse([], this.getOptions());
  }

  getFilteredSong(
    selectedTags$: Observable<number>,
    search$: Observable<string>,
    allSongList: Song[]
  ): Observable<Song[]> {
    return selectedTags$.pipe(
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
            if (!Number.isNaN(Number(searchTest))) {
              return songList.filter(({ id }) => id.toString().includes(searchTest));
            } else if (searchTest) {
              return this.fuse.search(searchTest).map((fuseItem) => fuseItem.item);
            }
            return songList;
          })
        )
      )
    );
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
