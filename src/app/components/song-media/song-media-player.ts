import { SongMedia } from '../../interfaces/song-media';

export type SongMediaPlayer =
  { type: 'iframe'; url: string } | { type: 'audio' | 'video'; url: string } | { type: 'link'; url: string };

const YOUTUBE_ID = /^[\w-]{11}$/;
const DRIVE_ID = /^[\w-]+$/;

/**
 * The iframe URLs end up trusted as resource URLs, so every ref is checked here
 * and a malformed one gives no player instead of an arbitrary frame.
 */
export function songMediaPlayer(media: SongMedia): SongMediaPlayer | null {
  switch (media.source) {
    case 'youtube': {
      if (!YOUTUBE_ID.test(media.ref)) {
        return null;
      }

      const params = new URLSearchParams({ autoplay: '1' });
      if (media.startAt) {
        params.set('start', String(media.startAt));
      }
      if (media.endAt) {
        params.set('end', String(media.endAt));
      }

      return { type: 'iframe', url: `https://www.youtube.com/embed/${media.ref}?${params}` };
    }
    case 'gdrive':
      // Drive's preview player cannot start or stop at a given time
      return DRIVE_ID.test(media.ref)
        ? { type: 'iframe', url: `https://drive.google.com/file/d/${media.ref}/preview` }
        : null;
    case 'file': {
      if (!isHttpsUrl(media.ref)) {
        return null;
      }

      const end = media.endAt ? `,${media.endAt}` : '';
      const fragment = media.startAt || media.endAt ? `#t=${media.startAt ?? 0}${end}` : '';

      return { type: media.kind === 'video' ? 'video' : 'audio', url: media.ref + fragment };
    }
    default:
      return isHttpsUrl(media.ref) ? { type: 'link', url: media.ref } : null;
  }
}

export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
