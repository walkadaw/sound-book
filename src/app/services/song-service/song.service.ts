import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, Observable, throwError } from 'rxjs';
import {
  catchError, tap, map, switchMap,
} from 'rxjs/operators';
import { Song, SongAdd, SongRequest } from '../../interfaces/song';
import { environment } from '../../../environments/environment';
import { SlideList } from '../../interfaces/slide';

@Injectable()
export class SongService {
  songList: Song[] = [];
  songVersion: string = null;

  songSlideList: SlideList[] = [];
  songSlideVersion: string = null;

  constructor(private http: HttpClient) {}

  hasSong(songId: string | number): boolean {
    return this.songList.some(({ id }) => id.toString() === songId.toString());
  }

  getSong(songId: string | number): Song {
    return this.songList.find(({ id }) => id.toString() === songId.toString());
  }

  hasSlideSong(songId: string | number): boolean {
    return this.songSlideList.some(({ id }) => id.toString() === songId.toString());
  }

  getSlideSong(songId: string | number): SlideList {
    return { ...this.songSlideList.find(({ id }) => id.toString() === songId.toString()) };
  }

  loadSlideSongs(requeuedRequest?: boolean): Observable<SongRequest> {
    return of(localStorage.getItem('songListSlide')).pipe(
      map<string, SongRequest>((songList) => JSON.parse(songList)),
      switchMap((songList) => {
        // TODO Нужно добавить проверку на целостность данных
        if (requeuedRequest || !songList || !songList.songs || !songList.slides.length) {
          return throwError(() => 'WrongData');
        }

        this.songSlideList = songList.slides;
        this.songSlideVersion = `${songList.last_update}000`;
        return of(songList);
      }),
      catchError(() => this.http
        .get<SongRequest>(`${environment.baseUrl}/song/get?slide=true`)
        .pipe(tap((songListResponse) => localStorage.setItem('songListSlide', JSON.stringify(songListResponse))))),
      tap((songListResponse) => {
        this.songSlideList = songListResponse.slides;
        this.songSlideVersion = `${songListResponse.last_update}000`;
      }),
      catchError((error) => {
        console.error('loadSlideSongs', error);
        return of(null);
      }),
    );
  }

  loadSongs(requeuedRequest?: boolean): Observable<SongRequest> {
    return of(localStorage.getItem('songList'))
      .pipe(
        map<string, SongRequest>((songList) => JSON.parse(songList)),
        switchMap((songList) => {
          // TODO Нужно добавить проверку на целостность данных
          if (requeuedRequest || !songList || !songList.songs || !songList.songs.length) {
            return throwError(() => 'WrongData');
          }

          this.songList = songList.songs;
          this.songVersion = `${songList.last_update}000`;
          return of(songList);
        }),
        catchError(() => this.http
          .get<SongRequest>(`${environment.baseUrl}/song/get`)
          .pipe(tap((songListResponse) => localStorage.setItem('songList', JSON.stringify(songListResponse))))),
        tap((songListResponse) => {
          this.songList = songListResponse.songs;
          this.songVersion = `${songListResponse.last_update}000`;
        }),
        catchError((error) => {
          console.error('loadSongs', error);
          return of(null);
        }),
      );
  }

  getSongWithoutCache(id: string): Observable<Song> {
    return this.http.get<Song>(`${environment.baseUrl}/song/get`, { params: { id } });
  }

  updateSong(song: SongAdd): Observable<number> {
    return this.http.post<{ id: number}>(`${environment.baseUrl}/song/update`, song).pipe(
      switchMap((value) => this.loadSongs(true).pipe(map(() => value.id))),
    );
  }
}
