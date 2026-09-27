import { DOCUMENT, Service, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlSerializer, createUrlTreeFromSnapshot } from '@angular/router';
import { Song } from '../../interfaces/song';
import { songSlug } from '../../utils/song-slug';
import { SongService } from '../song-service/song.service';
import { SITE_ORIGIN } from './site-origin.token';

export const DEFAULT_DESCRIPTION =
  'Спеўнік — зборнік духоўных песень з акордамі: ' +
  'пошук па назве і тэксце, транспанаванне, плэйлісты і рэжым прэзентацыі.';

const DESCRIPTION_LENGTH = 160;

@Service()
export class PageMetaService {
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  // Not Router: it depends on TitleStrategy, which depends on this service.
  private urlSerializer = inject(UrlSerializer);
  private songService = inject(SongService);
  private origin = inject(SITE_ORIGIN);

  update(snapshot: RouterStateSnapshot, title: string): void {
    const route = deepestChild(snapshot.root);
    // presentation/:id and admin/edit/:id also carry an id, but only song/:id pages describe a song.
    const song = route.routeConfig?.path?.startsWith('song/')
      ? this.songService.getSong(route.paramMap.get('id'))
      : null;
    const description = song ? songDescription(song) : DEFAULT_DESCRIPTION;
    const url = song && this.origin ? this.origin + this.songPath(snapshot, song) : null;

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: song ? 'article' : 'website' });
    this.setCanonical(url);
  }

  private songPath(snapshot: RouterStateSnapshot, song: Song): string {
    const tree = createUrlTreeFromSnapshot(snapshot.root, ['/song', song.id, songSlug(song.title)]);

    return this.urlSerializer.serialize(tree);
  }

  // Only song pages get a canonical URL: they are reachable both as /song/:id and /song/:id/:title.
  private setCanonical(url: string | null): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!url) {
      link?.remove();
      this.meta.removeTag('property="og:url"');
      return;
    }

    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }

    link.href = url;
    this.meta.updateTag({ property: 'og:url', content: url });
  }
}

function deepestChild(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return route.firstChild ? deepestChild(route.firstChild) : route;
}

function songDescription(song: Song): string {
  const text = song.text.replace(/\s+/g, ' ').trim();

  if (text.length <= DESCRIPTION_LENGTH) {
    return text;
  }

  const cut = text.slice(0, DESCRIPTION_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(' ');

  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}
