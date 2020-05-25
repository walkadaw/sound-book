import { Injectable } from '@angular/core';
import Fuse from 'fuse.js';
import { Song } from '../../interfaces/song';
import { Observable, BehaviorSubject } from 'rxjs';
import { SongService } from '../song-service/song.service';
import { map, tap, switchMap, debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FuseService {
  selectedTags$: BehaviorSubject<number> = new BehaviorSubject(0);

  private fuse: Fuse<Song, Fuse.IFuseOptions<Song>>;

  constructor(private songService: SongService) {
    this.fuse = new Fuse([], this.getOptions());
  }

  getFilteredSong(search$: Observable<string>): Observable<Song[]> {
    return this.selectedTags$.pipe(
      map((selectedTags) => {
        if (selectedTags) {
          return this.songService.songList.filter(
            (song) => song.tag && Object.keys(song.tag).some((tag) => selectedTags === +tag)
          );
        }
        return this.songService.songList;
      }),
      tap((songList) => this.fuse.setCollection(songList)),
      debounceTime(100),
      switchMap((songList) =>
        search$.pipe(
          map((searchTest) => {
            console.log(
              searchTest,
              this.fuse.search(searchTest).map((fuseItem) => fuseItem.item)
            );
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
  }
}
