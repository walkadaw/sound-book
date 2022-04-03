import { Injectable } from '@angular/core';
import Fuse from 'fuse.js';
import { Song } from '../../interfaces/song';
import { Observable } from 'rxjs';
import { map, tap, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';

const REPLACE_SIMILAR_CHAR: { [key: string]: string } = {
  і: 'и',
  ў: 'у',
  ё: 'е',
};
const REPLACE_SIMILAR_CHAR_REGEXP = new RegExp(`[${Object.keys(REPLACE_SIMILAR_CHAR).join('')}]`, 'gi');

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
          debounceTime(100),
          distinctUntilChanged(),
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
      ignoreLocation: true,
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
    return str.replace(REPLACE_SIMILAR_CHAR_REGEXP, (char) => REPLACE_SIMILAR_CHAR[char.toLowerCase()]);
  }
}
