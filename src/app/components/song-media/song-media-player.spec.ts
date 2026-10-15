import { SongMedia } from '../../interfaces/song-media';
import { formatDuration, songMediaPlayer } from './song-media-player';

const media = (overrides: Partial<SongMedia>): SongMedia => ({
  id: 1,
  source: 'youtube',
  kind: 'video',
  ref: 'nYBfHdbf-6M',
  title: null,
  author: null,
  duration: null,
  startAt: null,
  endAt: null,
  ...overrides,
});

describe('songMediaPlayer', () => {
  it('embeds YouTube with the start and end of the fragment', () => {
    expect(songMediaPlayer(media({ startAt: 30, endAt: 95 }))).toEqual({
      type: 'iframe',
      url: 'https://www.youtube.com/embed/nYBfHdbf-6M?autoplay=1&start=30&end=95',
    });
  });

  it('gives no player for a ref that could leave the embed URL', () => {
    expect(songMediaPlayer(media({ ref: '../../evil' }))).toBeNull();
    expect(songMediaPlayer(media({ source: 'gdrive', ref: 'id/../x' }))).toBeNull();
    expect(songMediaPlayer(media({ source: 'file', kind: 'audio', ref: 'javascript:alert(1)' }))).toBeNull();
  });

  it('embeds the Google Drive preview', () => {
    const drive = media({ source: 'gdrive', kind: 'audio', ref: '1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM' });

    expect(songMediaPlayer(drive)).toEqual({
      type: 'iframe',
      url: 'https://drive.google.com/file/d/1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM/preview',
    });
  });

  it('plays a file with a media fragment', () => {
    expect(songMediaPlayer(media({ source: 'file', kind: 'audio', ref: 'https://example.com/a.mp3' }))).toEqual({
      type: 'audio',
      url: 'https://example.com/a.mp3',
    });
    const file = media({ source: 'file', kind: 'audio', ref: 'https://example.com/a.mp3', startAt: 10 });

    expect(songMediaPlayer(file)).toEqual({
      type: 'audio',
      url: 'https://example.com/a.mp3#t=10',
    });
  });

  it('links to a source this client does not know', () => {
    expect(songMediaPlayer(media({ source: 'soundcloud', ref: 'https://soundcloud.com/x' }))).toEqual({
      type: 'link',
      url: 'https://soundcloud.com/x',
    });
  });
});

describe('formatDuration', () => {
  it('pads the seconds', () => {
    expect(formatDuration(229)).toBe('3:49');
    expect(formatDuration(36)).toBe('0:36');
  });
});
