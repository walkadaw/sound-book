import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, Observable, throwError } from 'rxjs';
import { Song, SongRequest } from '../../interfaces/song';
import { catchError, tap, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SlideList } from '../../interfaces/slide';

@Injectable()
export class SongService {
  songList: Song[] = [];
  songSlideList: SlideList[] = [];

  constructor(private http: HttpClient) {}

  hasSong(songId: string): boolean {
    return this.songList.some(({ id }) => id.toString() === songId.toString());
  }

  getSong(songId: string): Song {
    return this.songList.find(({ id }) => id.toString() === songId.toString());
  }

  hasSlideSong(songId: string): boolean {
    return this.songSlideList.some(({ id }) => id.toString() === songId.toString());
  }

  getSlideSong(songId: string): SlideList {
    return { ...this.songSlideList.find(({ id }) => id.toString() === songId.toString()) };
  }

  loadSlideSongs(): Observable<SongRequest> {
    return of(localStorage.getItem('songListSlide')).pipe(
      map<string, SongRequest>((songList) => JSON.parse(songList)),
      switchMap((songList) => {
        // TODO Нужно добавить проверку на целостность данных
        if (!songList || !songList.songs || !songList.slides.length) {
          return throwError('WrongData');
        }

        this.songSlideList = songList.slides;
        return of(songList);
      }),
      catchError((error) =>
        this.http
          .get<SongRequest>(`${environment.baseUrl}/song/get?slide=true`)
          .pipe(tap((songListResponse) => localStorage.setItem('songListSlide', JSON.stringify(songListResponse))))
      ),
      tap((songListResponse) => (this.songSlideList = songListResponse.slides)),
      catchError((error) => {
        console.error('loadSlideSongs', error);
        return of(null);
      })
    );
  }

  loadSongs(): Promise<SongRequest> {
    return of(localStorage.getItem('songList'))
      .pipe(
        map<string, SongRequest>((songList) => JSON.parse(songList)),
        switchMap((songList) => {
          // TODO Нужно добавить проверку на целостность данных
          if (!songList || !songList.songs || !songList.songs.length) {
            return throwError('WrongData');
          }

          this.songList = songList.songs;
          return of(songList);
        }),
        catchError((error) =>
          this.http
            .get<SongRequest>(`${environment.baseUrl}/song/get`)
            .pipe(tap((songListResponse) => localStorage.setItem('songList', JSON.stringify(songListResponse))))
        ),
        tap((songListResponse) => (this.songList = songListResponse.songs)),
        catchError((error) => {
          console.error('loadSongs', error);
          return of(null);
        })
      )
      .toPromise();
  }
}
