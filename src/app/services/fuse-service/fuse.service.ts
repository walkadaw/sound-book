import { Service, Signal, computed } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import Fuse, { IFuseOptions } from 'fuse.js';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Song } from '../../interfaces/song';

const REPLACE_SIMILAR_CHAR: { [key: string]: string } = {
  і: 'и',
  ў: 'у',
  ё: 'е',
};
const REPLACE_SIMILAR_CHAR_REGEXP = new RegExp(`[${Object.keys(REPLACE_SIMILAR_CHAR).join('')}]`, 'gi');

@Service()
export class FuseService {
  /** Must be called in an injection context, because the search term is debounced via rxjs interop. */
  getFilteredSong(selectedTag: Signal<number>, search: Signal<string>, allSongList: Signal<Song[]>): Signal<Song[]> {
    const songList = computed(() => {
      const tag = selectedTag();
      const songs = allSongList();

      return tag ? songs.filter((song) => song.tag && Object.keys(song.tag).some((key) => tag === +key)) : songs;
    });
    const fuse = computed(() => new Fuse(songList(), this.getOptions()));
    const debouncedSearch = toSignal(toObservable(search).pipe(debounceTime(100), distinctUntilChanged()), {
      initialValue: search(),
    });

    return computed(() => {
      const searchText = debouncedSearch();

      if (!Number.isNaN(Number(searchText))) {
        return songList().filter(({ songId }) => songId.toString().includes(searchText));
      }
      if (searchText) {
        return fuse()
          .search(this.replaceChar(searchText))
          .map((fuseItem) => fuseItem.item);
      }
      return songList();
    });
  }

  private getOptions(): IFuseOptions<Song> {
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
        const value = Fuse.config.getFn(obj, path);
        return Array.isArray(value) ? value.map((item) => this.replaceChar(item)) : this.replaceChar(value as string);
      },
    };
  }

  private replaceChar(str: string): string {
    return str.replace(REPLACE_SIMILAR_CHAR_REGEXP, (char) => REPLACE_SIMILAR_CHAR[char.toLowerCase()]);
  }
}
