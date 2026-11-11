import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { filter, firstValueFrom, of } from 'rxjs';

import { Liturgy, LiturgySection } from '../../interfaces/liturgy';
import { Song } from '../../interfaces/song';
import { SlideList } from '../../interfaces/slide';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { ChannelClientTransport } from '../../services/remote-control/remote-transport';
import { RevealService } from '../../services/reveal-service/reveal.service';
import { SlidesService } from '../../services/slides/slides.service';
import { SongService } from '../../services/song-service/song.service';
import { SongStatsService } from '../../services/song-stats/song-stats.service';
import { PresentationComponent } from './presentation.component';

const song: Song = { id: 5, songId: 5, title: 'Песня', text: 'Радок', chord: '', tag: {}, position: null };
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
  const slideIndex = signal(0);
  const updateRevealState = vi.fn();

  const create = async (ids: string) => {
    slideIndex.set(0);
    updateRevealState.mockReset();
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
            slideIndex,
            paused: signal(false),
            light: signal(false),
            presentationId: 'spec',
            init: () => {},
            destroy: () => {},
            updateRevealState,
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

  it('should keep the screen on its slide when songs before it go, and move on when its own song goes', async () => {
    // song 0-0, then the two parts of the mass 1-1 and 2-3, then the song again 4-4
    await create('5,l,5');
    slideIndex.set(4);

    component.removeSlide(1);
    expect(listed()).toEqual(['Песня 0-0', 'Песня 1-1']);
    expect(updateRevealState).toHaveBeenLastCalledWith(1);

    slideIndex.set(1);
    component.removeSlide(1);
    expect(updateRevealState).toHaveBeenLastCalledWith(0);
  });

  it('should move on to what followed when the song on the screen goes', async () => {
    await create('l,5');
    slideIndex.set(2);

    component.removeSlide(0);

    expect(listed()).toEqual(['Песня 0-0']);
    expect(updateRevealState).toHaveBeenLastCalledWith(0);
  });

  it('should add a song right after the current one', async () => {
    await create('5,l');

    expect(component.addSlide('5', 'afterCurrent')).toBe(1);
    expect(listed()).toEqual(['Песня 0-0', 'Песня 1-1', 'ЧЫТАННЕ 1 2-2', 'ЕВАНГЕЛЛЕ 1 3-4']);
  });

  it('should add after the whole mass the current slide is part of', async () => {
    await create('l,5');
    slideIndex.set(1);

    expect(component.addSlide('l2', 'afterCurrent')).toBe(2);
    expect(listed()).toEqual([
      'ЧЫТАННЕ 1 0-0',
      'ЕВАНГЕЛЛЕ 1 1-2',
      'ЧЫТАННЕ 2 3-3',
      'ЕВАНГЕЛЛЕ 2 4-5',
      'Песня 6-6',
    ]);
  });

  it('should let a control window add a song and see it in the state', async () => {
    await create('5');
    const remote = new ChannelClientTransport('remote-control-spec');
    const twoSongs = firstValueFrom(remote.state$.pipe(filter(({ songs }) => songs.length === 2)));

    remote.send({ type: 'add', id: '5', position: 'end' });
    TestBed.tick();

    const state = await twoSongs;
    expect(state.songs.map(({ id }) => id)).toEqual(['5', '5']);
    expect(remote.status()).toBe('connected');
    remote.close();
  });
});
