import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Liturgy, LiturgySection } from '../../interfaces/liturgy';
import { Song } from '../../interfaces/song';
import { SlideList } from '../../interfaces/slide';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { RevealService } from '../../services/reveal-service/reveal.service';
import { SlidesService } from '../../services/slides/slides.service';
import { SongService } from '../../services/song-service/song.service';
import { SongStatsService } from '../../services/song-stats/song-stats.service';
import { PresentationComponent } from './presentation.component';

const song: Song = { id: 5, songId: 5, title: 'Песня', text: 'Радок', chord: '', tag: {} };
const mass = (id: number, title: string): Liturgy => ({
  id,
  title,
  readings: '',
  sections: [
    { type: 'reading', title: `ЧЫТАННЕ ${id}`, reference: '', blocks: [] },
    { type: 'gospel', title: `ЕВАНГЕЛЛЕ ${id}`, reference: '', blocks: [] },
  ],
});
// one slide for the reading and two for the gospel
const liturgySlides = (liturgy: string, sections: LiturgySection[]): SlideList[] =>
  sections.map(({ title }, index) => ({
    id: `${liturgy}-${index}`,
    title,
    slides: Array.from({ length: index + 1 }, () => ({ fontSize: 54, text: title })),
    liturgy,
  }));

describe('PresentationComponent', () => {
  let component: PresentationComponent;
  let fixture: ComponentFixture<PresentationComponent>;
  let replaceState: ReturnType<typeof vi.spyOn>;

  const create = async (ids: string) => {
    TestBed.configureTestingModule({
      imports: [PresentationComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: ids } } } },
        { provide: LiturgyService, useValue: { getLiturgy: () => of([mass(1, 'Чацвер'), mass(2, 'Успамін')]) } },
        {
          provide: SongService,
          useValue: {
            loadSongFromCache: () => of({}),
            hasSong: (id: string) => id === '5',
            getSong: () => song,
          },
        },
        {
          provide: SlidesService,
          useValue: {
            init: signal(true),
            getSongSlide: () => [{ fontSize: 60, text: 'Радок' }],
            getLiturgySlides: liturgySlides,
          },
        },
        {
          provide: RevealService,
          useValue: {
            ready: signal(false),
            isSpeakerNotes: () => false,
            init: () => {},
            destroy: () => {},
            updateRevealState: () => {},
          },
        },
        { provide: SongStatsService, useValue: { record: () => {} } },
      ],
    });

    replaceState = vi.spyOn(TestBed.inject(Location), 'replaceState');
    fixture = TestBed.createComponent(PresentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const listed = () =>
    component.slideList().map(({ title, startIndex, endIndex }) => `${title} ${startIndex}-${endIndex}`);

  it('should show each mass of the URL once, where it is mentioned first', async () => {
    await create('5,l2,l,l2');

    expect(listed()).toEqual(['Песня 0-0', 'ЧЫТАННЕ 2 1-1', 'ЕВАНГЕЛЛЕ 2 2-3', 'ЧЫТАННЕ 1 4-4', 'ЕВАНГЕЛЛЕ 1 5-6']);
    expect(component.liturgyChoices()).toEqual([]);
  });

  it('should offer the masses that are not in the presentation yet', async () => {
    await create('l2');

    expect(component.liturgyChoices()).toEqual([{ id: 'l', title: 'Чацвер' }]);
  });

  it('should add a mass as a whole after the songs', async () => {
    await create('5');

    component.addSlide('l2');

    expect(listed()).toEqual(['Песня 0-0', 'ЧЫТАННЕ 2 1-1', 'ЕВАНГЕЛЛЕ 2 2-3']);
    expect(replaceState).toHaveBeenLastCalledWith('/presentation/5,l2');

    component.addSlide('l2');
    expect(listed().length).toBe(3);
  });

  it('should remove the whole mass with any of its parts', async () => {
    await create('l,5,l2');

    component.removeSlide(1);

    expect(listed()).toEqual(['Песня 0-0', 'ЧЫТАННЕ 2 1-1', 'ЕВАНГЕЛЛЕ 2 2-3']);
    expect(replaceState).toHaveBeenLastCalledWith('/presentation/5,l2');
  });
});
