import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Song, SongRequest } from '../../interfaces/song';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SongService {
  songList: Song[] = [];

  constructor(private http: HttpClient) {}

  hasSong(songId: string): boolean {
    return this.songList.some(({ id }) => id === +songId);
  }

  getSong(songId: string): Song {
    return this.songList.find(({ id }) => id === +songId);
  }

  loadSongs(): Promise<SongRequest> {
    return this.http
      .get<SongRequest>(`${environment.baseUrl}/song/get`)
      .pipe(
        tap((songList) => this.setSongs(songList.songs)),
        catchError((error) => of(null))
      )
      .toPromise();
  }

  private setSongs(songList: Song[]) {
    this.songList = songList;
  }
}
