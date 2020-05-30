import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { Song, SongRequest } from '../../interfaces/song';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SlideList } from '../../interfaces/slide';

@Injectable({
  providedIn: 'root',
})
export class SongService {
  songList: Song[] = [];
  songSlideList: SlideList[] = [];

  constructor(private http: HttpClient) {}

  hasSong(songId: string): boolean {
    return this.songList.some(({ id }) => id === +songId);
  }

  getSong(songId: string): Song {
    return this.songList.find(({ id }) => id === +songId);
  }

  hasSlideSong(songId: string): boolean {
    return this.songSlideList.some(({ id }) => id == songId);
  }

  getSlideSong(songId: string): SlideList {
    return { ...this.songSlideList.find(({ id }) => id == songId) };
  }

  loadSlideSongs(): Observable<SongRequest> {
    return this.http.get<SongRequest>(`${environment.baseUrl}/song/get?slide=true`).pipe(
      tap((songList) => (this.songSlideList = songList.slides)),
      catchError((error) => of(null))
    );
  }

  loadSongs(): Promise<SongRequest> {
    return this.http
      .get<SongRequest>(`${environment.baseUrl}/song/get`)
      .pipe(
        tap((songList) => (this.songList = songList.songs)),
        catchError((error) => of(null))
      )
      .toPromise();
  }
}
