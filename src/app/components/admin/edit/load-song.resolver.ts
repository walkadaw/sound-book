import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot, Resolve, Router,
} from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { Song } from '../../../interfaces/song';
import { SongService } from '../../../services/song-service/song.service';

@Injectable({
  providedIn: 'any',
})
export class LoadSongResolver implements Resolve<Song> {
  constructor(
    private songService: SongService,
    private router: Router,
  ) { }

  resolve(route: ActivatedRouteSnapshot): Observable<Song> {
    const id = route.paramMap.get('id');

    return this.songService.getSongWithoutCache(id).pipe(
      catchError(() => {
        this.router.navigate(['/404'], { skipLocationChange: true });
        return of(null);
      }),
    );
  }
}
