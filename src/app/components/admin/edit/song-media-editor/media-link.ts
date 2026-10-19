import { SongMedia, SongMediaSource } from '../../../../interfaces/song-media';
import { DRIVE_ID, YOUTUBE_ID, uploadUrl } from '../../../song-media/song-media-player';

export interface MediaLink {
  source: SongMediaSource;
  ref: string;
  /** the time a YouTube link points to, seconds */
  startAt: number | null;
}

const YOUTUBE_HOSTS = new Set(['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);

/** Reads a pasted YouTube, Google Drive or file link; null for anything the song page could not play. */
export function parseMediaLink(value: string): MediaLink | null {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') {
    return null;
  }

  if (YOUTUBE_HOSTS.has(url.hostname)) {
    const ref = youtubeId(url);
    const startAt = youtubeTime(url.searchParams.get('t') ?? url.searchParams.get('start'));

    return ref && YOUTUBE_ID.test(ref) ? { source: 'youtube', ref, startAt } : null;
  }

  if (url.hostname === 'drive.google.com' || url.hostname === 'docs.google.com') {
    const ref = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');

    return ref && DRIVE_ID.test(ref) ? { source: 'gdrive', ref, startAt: null } : null;
  }

  return { source: 'file', ref: url.href, startAt: null };
}

/** The link an admin would paste for a stored record. */
export function mediaLink({ source, ref }: Pick<SongMedia, 'source' | 'ref'>): string {
  switch (source) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${ref}`;
    case 'gdrive':
      return `https://drive.google.com/file/d/${ref}/view`;
    case 'upload':
      return uploadUrl(ref);
    default:
      return ref;
  }
}

/** Seconds from `90`, `1:30` or `1:01:30`; null for an empty value, NaN for one that is not a time. */
export function parseTime(value: string): number | null {
  const text = value.trim();

  if (!text) {
    return null;
  }

  if (!/^\d+(:[0-5]?\d){0,2}$/.test(text)) {
    return NaN;
  }

  return text.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

function youtubeId(url: URL): string | null {
  if (url.hostname === 'youtu.be') {
    return url.pathname.slice(1);
  }

  const path = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/);

  return path ? path[1] : url.searchParams.get('v');
}

/** YouTube writes the time as `90`, `90s` or `1h2m30s`. */
function youtubeTime(value: string | null): number | null {
  const match = value?.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);

  if (!match) {
    return null;
  }

  const [, hours = '0', minutes = '0', seconds = '0'] = match;
  const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);

  return total || null;
}
