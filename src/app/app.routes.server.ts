import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { loadServerSongList } from './server/server-song-list';
import { songSlug } from './utils/song-slug';

export const serverRoutes: ServerRoute[] = [
  {
    // The form every in-app link uses, so it is the one crawlers find and the canonical URL points to.
    path: 'song/:id/:title',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const { songs = [] } = await loadServerSongList();

      return songs.map((song) => ({ id: song.id.toString(), title: songSlug(song.title) }));
    },
  },
  // Everything else depends on data kept in the browser (settings, favorites, playlists) and stays client-rendered;
  // this also keeps index.html the plain app shell that the service worker serves for every navigation.
  { path: '**', renderMode: RenderMode.Client },
];
