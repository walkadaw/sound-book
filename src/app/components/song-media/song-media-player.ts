import { environment } from '../../../environments/environment';
import { SongMedia } from '../../interfaces/song-media';

export type SongMediaPlayer =
  { type: 'iframe'; url: string } | { type: 'audio' | 'video'; url: string } | { type: 'link'; url: string };

export const YOUTUBE_ID = /^[\w-]{11}$/;
export const DRIVE_ID = /^[\w-]+$/;
const VIDEO_FILE = /\.(mp4|m4v|webm|mov|ogv)$/i;
/** formats an admin upload may have, the same list as MEDIA_UPLOAD_EXTENSIONS in api/song/_media_files.php */
export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac'];
/** the name the server gives an uploaded file, the same check as api/song/_media_files.php */
export const UPLOAD_REF = new RegExp(`^[0-9a-f]{16}\\.(${AUDIO_EXTENSIONS.join('|')})$`);

export function uploadUrl(ref: string): string {
  return `${environment.baseUrl}/media/${ref}`;
}

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
    case 'file':
      return isHttpsUrl(media.ref)
        ? {
            type: VIDEO_FILE.test(new URL(media.ref).pathname) ? 'video' : 'audio',
            url: media.ref + mediaFragment(media),
          }
        : null;
    case 'upload':
      return UPLOAD_REF.test(media.ref) ? { type: 'audio', url: uploadUrl(media.ref) + mediaFragment(media) } : null;
    default:
      return isHttpsUrl(media.ref) ? { type: 'link', url: media.ref } : null;
  }
}

export const SOURCE_NAMES: Record<string, string> = {
  youtube: 'YouTube',
  gdrive: 'Google Drive',
  file: 'Файл',
  upload: 'Аўдыяфайл',
};

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');

  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

function mediaFragment({ startAt, endAt }: Pick<SongMedia, 'startAt' | 'endAt'>): string {
  const end = endAt ? `,${endAt}` : '';

  return startAt || endAt ? `#t=${startAt ?? 0}${end}` : '';
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
