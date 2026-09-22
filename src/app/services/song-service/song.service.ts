import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Song, SongAdd, SongRequest } from '../../interfaces/song';

@Service()
export class SongService {
  private http = inject(HttpClient);

  private songListState = signal<Song[]>([]);

  readonly songList = this.songListState.asReadonly();
  songVersion: string = null;

  private songById = computed(() => new Map(this.songList().map((song) => [song.id.toString(), song])));

  hasSong(songId: string | number | null | undefined): boolean {
    return songId != null && this.songById().has(songId.toString());
  }

  getSong(songId: string | number | null | undefined): Song | undefined {
    return songId == null ? undefined : this.songById().get(songId.toString());
  }

  loadSongs(): Observable<SongRequest> {
    return this.http.get<SongRequest>(`${environment.baseUrl}/song/get`).pipe(
      tap((songListResponse) => {
        this.setSong(songListResponse);
        try {
          localStorage.setItem('songList', JSON.stringify(songListResponse));
        } catch (error) {
          // the cache is optional (quota exceeded, private mode), the loaded songs are still usable
          console.error('cache songList', error);
        }
      }),
      catchError((error) => {
        console.error('loadSongs', error);
        return of(null);
      }),
    );
  }

  loadSongFromCache(): Observable<SongRequest> {
    return of(localStorage.getItem('songList')).pipe(
      map<string, SongRequest>((songList) => JSON.parse(songList)),
      switchMap((songList) => {
        // TODO Нужно добавить проверку на целостность данных
        if (!songList || !songList.songs || !songList.songs.length) {
          return throwError(() => 'WrongData');
        }

        this.setSong(songList);
        return of(songList);
      }),
      catchError(() => this.loadSongs()),
    );
  }

  getSongWithoutCache(id?: string): Observable<Song> {
    return this.http.get<Song>(`${environment.baseUrl}/song/get`, { params: { id } });
  }

  updateSong(song: SongAdd): Observable<number> {
    return this.http
      .post<{ id: number }>(`${environment.baseUrl}/song/update`, song)
      .pipe(switchMap((value) => this.loadSongs().pipe(map(() => value.id))));
  }

  private setSong(songList: SongRequest): void {
    this.songListState.set(
      songList.songs
        .sort((a, b) => {
          if (a.tag[10] !== 1 && b.tag[10] === 1) {
            return -1;
          }

          if (a.tag[10] === 1 && b.tag[10] !== 1) {
            return 1;
          }

          return a.title.localeCompare(b.title, 'en');
        })
        .map((song, index) => ({ ...song, songId: index + 1 })),
    );
    this.songVersion = `${songList.last_update}000`;
  }
}
