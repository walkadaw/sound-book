import { TestBed } from '@angular/core/testing';

import { PARTS_OF_MASS_TAG_ID } from '../../constants/tag-list';
import { Song } from '../../interfaces/song';
import { SongService } from './song.service';

describe('SongService', () => {
  let service: SongService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SongService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should put the parts of Mass after the songs, in the order of the liturgy and then alphabetically', () => {
    const song = (id: number, title: string, partOfMass = true): Song => ({
      id,
      songId: 0,
      title,
      text: '',
      chord: '',
      tag: partOfMass ? { [PARTS_OF_MASS_TAG_ID]: 1 } : {},
    });

    service.setSong({
      songs: [
        song(433, 'CREDO'),
        song(442, 'Аллелюя'),
        song(2, 'Ясна', false),
        // in the list, but no longer a part of Mass
        song(431, 'Ойча наш', false),
        song(445, 'Вітай Марыя'),
        song(421, 'ХВАЛА НА ВЫШЫНЯХ БОГУ'),
        song(1, 'Адна', false),
        song(420, 'ПАНЕ, ЗМІЛУЙСЯ НАД НАМІ'),
      ],
      last_update: '0',
      hash: '',
    });

    expect(service.songList().map(({ id }) => id)).toEqual([1, 431, 2, 420, 421, 442, 433, 445]);
  });
});
