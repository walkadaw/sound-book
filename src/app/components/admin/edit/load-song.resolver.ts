import { Service, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { Song } from '../../../interfaces/song';
import { SongService } from '../../../services/song-service/song.service';

@Service()
export class LoadSongResolver implements Resolve<Song> {
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
