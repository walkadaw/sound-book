import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { SongService } from '../services/song-service/song.service';

@Injectable({
  providedIn: 'root',
})
export class HasSongGuard {
  constructor(private songService: SongService, private route: Router) {}

  canActivate(next: ActivatedRouteSnapshot): boolean {
    const songId = next.paramMap.get('id');
    if (this.songService.hasSong(songId)) {
      return true;
    }
    this.route.navigate(['/404'], { skipLocationChange: true });
    return false;
  }
}
