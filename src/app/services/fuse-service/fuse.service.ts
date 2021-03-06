import { Injectable } from '@angular/core';
import Fuse from 'fuse.js';
import { Song } from '../../interfaces/song';
import { Observable } from 'rxjs';
import { map, tap, switchMap, debounceTime } from 'rxjs/operators';

const REPLACE_BY_TO_RU = {
  і: 'и',
  ў: 'у',
};
const REPLACE_BY_TO_RU_REGEXP = new RegExp(`[${Object.keys(REPLACE_BY_TO_RU).join('')}]`, 'gi');

@Injectable({
  providedIn: 'root',
})
export class FuseService {
  private fuse: Fuse<Song>;

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
              return this.fuse.search(this.replaceChar(searchTest)).map((fuseItem) => fuseItem.item);
            }
            return songList;
          })
        )
      )
    );
  }

  private getOptions(): Fuse.IFuseOptions<Song> {
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
      getFn: (obj, path) => {
        const value = (Fuse as any).config.getFn(obj, path);
        return this.replaceChar(value);
      },
    };
  }

  private replaceChar(str: string): string {
    return str.replace(REPLACE_BY_TO_RU_REGEXP, (char) => REPLACE_BY_TO_RU[char.toLowerCase()]);
  }
}
