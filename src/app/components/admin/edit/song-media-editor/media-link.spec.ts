import { formatDuration } from '../../../song-media/song-media-player';
import { mediaLink, parseMediaLink, parseTime } from './media-link';

describe('parseMediaLink', () => {
  it('reads YouTube links with the time they point to', () => {
    const video = { source: 'youtube', ref: 'bAcV6rYaI5c' };

    expect(parseMediaLink('https://www.youtube.com/watch?v=bAcV6rYaI5c')).toEqual({ ...video, startAt: null });
    expect(parseMediaLink('https://youtu.be/bAcV6rYaI5c?t=9243')).toEqual({ ...video, startAt: 9243 });
    expect(parseMediaLink('https://m.youtube.com/watch?v=bAcV6rYaI5c&t=2h34m3s')).toEqual({ ...video, startAt: 9243 });
    expect(parseMediaLink('https://www.youtube.com/embed/bAcV6rYaI5c?start=90')).toEqual({ ...video, startAt: 90 });
    expect(parseMediaLink('https://www.youtube.com/live/bAcV6rYaI5c?si=x')).toEqual({ ...video, startAt: null });
  });

  it('reads Google Drive links', () => {
    const drive = { source: 'gdrive', ref: '1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM', startAt: null as null };

    expect(
      parseMediaLink('https://drive.google.com/file/d/1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM/view?usp=sharing'),
    ).toEqual(drive);
    expect(parseMediaLink('https://drive.google.com/open?id=1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM')).toEqual(drive);
  });

  it('takes any other https link as a file', () => {
    expect(parseMediaLink('https://example.com/a.mp3')).toEqual({
      source: 'file',
      ref: 'https://example.com/a.mp3',
      startAt: null,
    });
  });

  it('rejects links the song page could not play', () => {
    expect(parseMediaLink('http://example.com/a.mp3')).toBeNull();
    expect(parseMediaLink('not a link')).toBeNull();
    expect(parseMediaLink('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseMediaLink('https://drive.google.com/drive/folders')).toBeNull();
  });

  it('gives back a link that reads as the same record', () => {
    for (const media of [
      { source: 'youtube', ref: 'bAcV6rYaI5c' },
      { source: 'gdrive', ref: '1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM' },
      { source: 'file', ref: 'https://example.com/a.mp3' },
    ]) {
      expect(parseMediaLink(mediaLink(media))).toMatchObject(media);
    }
  });

  it('links to an uploaded file on this site', () => {
    expect(mediaLink({ source: 'upload', ref: '0123456789abcdef.mp3' })).toBe('/api/media/0123456789abcdef.mp3');
  });
});

describe('parseTime', () => {
  it('reads seconds, minutes and hours', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('90')).toBe(90);
    expect(parseTime('1:30')).toBe(90);
    expect(parseTime(' 2:34:03 ')).toBe(9243);
  });

  it('gives NaN for what is not a time', () => {
    expect(parseTime('1:75')).toBeNaN();
    expect(parseTime('1.5')).toBeNaN();
    expect(parseTime('1:2:3:4')).toBeNaN();
  });

  it('is the inverse of formatDuration', () => {
    expect(parseTime(formatDuration(9243))).toBe(9243);
  });
});
