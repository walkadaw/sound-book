import { HttpClient, HttpEvent } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, defer, of, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PARTS_OF_MASS_ORDER, PARTS_OF_MASS_TAG_ID } from '../../constants/tag-list';
import { Song, SongAdd, SongRequest, SongVersion } from '../../interfaces/song';
import { SongMedia, SongMediaDraft } from '../../interfaces/song-media';

const isPartOfMass = (song: Song) => song.tag[PARTS_OF_MASS_TAG_ID] === 1;

/**
 * Where a part of Mass comes in the liturgy; the rest go after the ones in the list.
 * A song from the list whose tag was taken off is an ordinary song again and is not moved up.
 */
const liturgyRank = (song: Song) => {
  const index = isPartOfMass(song) ? PARTS_OF_MASS_ORDER.indexOf(song.id) : -1;
  return index === -1 ? PARTS_OF_MASS_ORDER.length : index;
};

@Service()
export class SongService {
  private http = inject(HttpClient);

  private songListState = signal<Song[]>([]);
  private pendingLoads = signal(0);

  readonly songList = this.songListState.asReadonly();
  readonly loading = computed(() => this.pendingLoads() > 0);
  songVersion: string = null;
  private lastUpdate: string | null = null;

  private songById = computed(() => new Map(this.songList().map((song) => [song.id.toString(), song])));

  hasSong(songId: string | number | null | undefined): boolean {
    return songId != null && this.songById().has(songId.toString());
  }

  getSong(songId: string | number | null | undefined): Song | undefined {
    return songId == null ? undefined : this.songById().get(songId.toString());
  }

  loadSongs(): Observable<SongRequest | null> {
    return defer(() => {
      const params = this.lastUpdate ? { last_update: this.lastUpdate } : undefined;

      this.pendingLoads.update((count) => count + 1);

      // The server answers 204 with no body when the list we already have is current.
      return this.http.get<SongRequest | null>(`${environment.baseUrl}/song/get`, { params }).pipe(
        tap((songListResponse) => {
          if (!songListResponse) {
            return;
          }

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
        finalize(() => this.pendingLoads.update((count) => count - 1)),
      );
    });
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
    return this.http.get<Song>(`${environment.baseUrl}/song/get`, {
      params: { id },
      headers: { 'ngsw-bypass': '' },
    });
  }

  getSongHistory(id: number): Observable<SongVersion[]> {
    return this.http.get<SongVersion[]>(`${environment.baseUrl}/song/history`, {
      params: { id },
      headers: { 'ngsw-bypass': '' },
    });
  }

  getSongMedia(id: number): Observable<SongMedia[]> {
    return this.http.get<SongMedia[]>(`${environment.baseUrl}/song/media`, { params: { id } });
  }

  // the admin edits the list, so it must not get the service worker's copy when the network is slow
  getSongMediaWithoutCache(id: number): Observable<SongMedia[]> {
    return this.http.get<SongMedia[]>(`${environment.baseUrl}/song/media`, {
      params: { id },
      headers: { 'ngsw-bypass': '' },
    });
  }

  saveSongMedia(songId: number, media: SongMediaDraft): Observable<number> {
    return this.http
      .post<{ id: number }>(`${environment.baseUrl}/song/media/save`, { ...media, songId })
      .pipe(map(({ id }) => id));
  }

  /** emits the upload progress, then the response with the name the server gave the file */
  uploadSongMedia(file: File): Observable<HttpEvent<{ ref: string }>> {
    return this.http.post<{ ref: string }>(`${environment.baseUrl}/song/media/upload`, file, {
      params: { name: file.name },
      headers: { 'Content-Type': 'application/octet-stream' },
      reportProgress: true,
      observe: 'events',
    });
  }

  deleteSongMedia(id: number): Observable<void> {
    return this.http.post<void>(`${environment.baseUrl}/song/media/delete`, { id });
  }

  orderSongMedia(songId: number, ids: number[]): Observable<void> {
    return this.http.post<void>(`${environment.baseUrl}/song/media/order`, { songId, ids });
  }

  updateSong(song: SongAdd): Observable<number> {
    return this.http
      .post<{ id: number }>(`${environment.baseUrl}/song/update`, song)
      .pipe(switchMap((value) => this.loadSongs().pipe(map(() => value.id))));
  }

  setSong(songList: SongRequest): void {
    this.songListState.set(
      songList.songs
        .sort(
          (a, b) =>
            Number(isPartOfMass(a)) - Number(isPartOfMass(b))
            || liturgyRank(a) - liturgyRank(b)
            || a.title.localeCompare(b.title, 'en'),
        )
        .map((song, index) => ({ ...song, songId: index + 1 })),
    );
    this.lastUpdate = songList.last_update;
    this.songVersion = `${songList.last_update}000`;
  }
}
