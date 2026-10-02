import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { first, map } from 'rxjs';
import { SongService } from '../services/song-service/song.service';

export const hasSongGuard: CanActivateFn = (route) => {
  const songService = inject(SongService);
  const router = inject(Router);
  const songId = route.paramMap.get('id');
  const check = () =>
    songService.hasSong(songId) || new RedirectCommand(router.parseUrl('/404'), { skipLocationChange: true });

  if (songService.hasSong(songId) || !songService.loading()) {
    return check();
  }

  return toObservable(songService.loading).pipe(
    first((loading) => !loading),
    map(check),
  );
};
