import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Song } from '../../interfaces/song';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SongService {
  songList: Song[] = [];

  constructor(private http: HttpClient) {}

  hasSong(id: string): boolean {
    return !!this.songList[id];
  }

  getSong(id: string): Song {
    return this.songList[id];
  }

  loadSongs(): Promise<Song[]> {
    return this.http
      .get<Song[]>('http://public/ajax/json-song-list?slide=false')
      .pipe(
        tap((songList) => this.setSongs(songList)),
        catchError((error) => {
          console.log(error);
          return of([]);
        })
      )
      .toPromise();
  }

  private setSongs(songList: Song[]) {
    this.songList = songList;
  }
}
