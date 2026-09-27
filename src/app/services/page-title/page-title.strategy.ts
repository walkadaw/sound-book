import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { SongService } from '../song-service/song.service';

const APP_NAME = 'Спеўнік';

@Service()
export class PageTitleStrategy extends TitleStrategy {
  private title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    this.title.setTitle(pageTitle ? `${pageTitle} — ${APP_NAME}` : APP_NAME);
  }
}

export const songTitle: ResolveFn<string> = (route: ActivatedRouteSnapshot) =>
  inject(SongService).getSong(route.paramMap.get('id'))?.title ?? '';

export const playlistTitle: ResolveFn<string> = (route: ActivatedRouteSnapshot) =>
  route.paramMap.get('name') ?? 'Плэйліст';
