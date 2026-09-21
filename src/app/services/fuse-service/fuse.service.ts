import { Service, Signal, computed } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import Fuse, { IFuseOptions } from 'fuse.js';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Song } from '../../interfaces/song';
import { MatchSnippet, getMatchSnippet, replaceSimilarChars } from './search-text';

export interface SongSearchResult {
  song: Song;
  snippet: MatchSnippet | null;
}

@Service()
export class FuseService {
  /** Must be called in an injection context, because the search term is debounced via rxjs interop. */
  getFilteredSong(selectedTag: Signal<number>, search: Signal<string>, allSongList: Signal<Song[]>): Signal<Song[]> {
    const results = this.getSearchResults(selectedTag, search, allSongList);

    return computed(() => results().map(({ song }) => song));
  }

  /** Same as `getFilteredSong`, but also tells which parts of the title and text matched the search. */
  getSearchResults(
    selectedTag: Signal<number>,
    search: Signal<string>,
    allSongList: Signal<Song[]>,
  ): Signal<SongSearchResult[]> {
    const songList = computed(() => {
      const tag = selectedTag();
      const songs = allSongList();

      return tag ? songs.filter((song) => song.tag && Object.keys(song.tag).some((key) => tag === +key)) : songs;
    });
    const fuse = computed(() => new Fuse(songList(), this.getOptions()));
    const debouncedSearch = toSignal(toObservable(search).pipe(debounceTime(100), distinctUntilChanged()), {
      initialValue: search(),
    });

    return computed<SongSearchResult[]>(() => {
      const searchText = debouncedSearch();

      if (!Number.isNaN(Number(searchText))) {
        return songList()
          .filter(({ songId }) => songId.toString().includes(searchText))
          .map((song): SongSearchResult => ({ song, snippet: null }));
      }
      if (searchText) {
        return fuse()
          .search(this.replaceChar(searchText))
          .map(({ item, matches }): SongSearchResult => ({
            song: item,
            snippet: getMatchSnippet(matches, 'text', item.text),
          }));
      }
      return songList().map((song): SongSearchResult => ({ song, snippet: null }));
    });
  }

  private getOptions(): IFuseOptions<Song> {
    return {
      threshold: 0.4,
      includeMatches: true,
      minMatchCharLength: 2,
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
    return replaceSimilarChars(str);
  }
}
