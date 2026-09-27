import { SongRequest } from '../interfaces/song';

declare const process: { env: Record<string, string | undefined> };

const EMPTY_SONG_LIST: SongRequest = { songs: [], last_update: '', hash: '' };

let songList: Promise<SongRequest> | undefined;

// Origin of the deployed site, e.g. https://example.com. Prerendering needs it both to fetch the songs
// and to build absolute URLs; without it the build still succeeds, just with no song pages.
export function siteUrl(): string {
  return (process.env['SITE_URL'] ?? '').replace(/\/+$/, '');
}

// Plain fetch rather than HttpClient: the server HttpClient caps bodies at 1 MB and the list grows with every song.
// Memoized per prerender worker so each page does not download the whole list again.
export function loadServerSongList(): Promise<SongRequest> {
  songList ??= fetchSongList();

  return songList;
}

async function fetchSongList(): Promise<SongRequest> {
  const origin = siteUrl();

  if (!origin) {
    console.warn('SITE_URL is not set: song pages are not prerendered.');
    return EMPTY_SONG_LIST;
  }

  const response = await fetch(`${origin}/api/song/get`);

  if (!response.ok) {
    throw new Error(`Cannot load songs for prerendering: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
