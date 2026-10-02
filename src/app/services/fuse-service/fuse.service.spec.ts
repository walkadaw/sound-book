import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Song } from '../../interfaces/song';

import { FuseService } from './fuse.service';

describe('FuseService', () => {
  let service: FuseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FuseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('stanza labels', () => {
    const songs = [
      { id: 1, songId: 1, title: 'Раз', text: 'Прыпеў:\nАллелюя, хвала', chord: '', tag: {} },
      { id: 2, songId: 2, title: 'Два', text: 'Прыпеў:\nСлава', chord: '', tag: {} },
    ] as Song[];
    const searchFor = (text: string) =>
      TestBed.runInInjectionContext(() => service.getSearchResults(signal(0), signal(text), signal(songs)))();

    it('should not find songs by a label', () => {
      expect(searchFor('прыпеў')).toEqual([]);
    });

    it('should leave the label out of the snippet', () => {
      const [result] = searchFor('аллелюя');

      expect(result.song.id).toBe(1);
      expect(result.snippet).toEqual({ before: '', match: 'Аллелюя', after: ', хвала' });
    });
  });
});
