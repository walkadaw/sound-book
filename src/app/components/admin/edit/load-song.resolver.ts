import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { Song } from '../../../interfaces/song';
import { SongService } from '../../../services/song-service/song.service';

@Injectable({
  providedIn: 'any',
})
export class LoadSongResolver {
  private songService = inject(SongService);
  private router = inject(Router);

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
