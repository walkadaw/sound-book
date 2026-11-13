import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Observable, filter, firstValueFrom, of } from 'rxjs';

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
  url: `https://catholic.by/3/liturgy/${id}`,
  sections: [
    { type: 'reading', title: `ЧЫТАННЕ ${id}`, reference: '', blocks: [], alternatives: [] },
    { type: 'gospel', title: `ЕВАНГЕЛЛЕ ${id}`, reference: '', blocks: [], alternatives: [] },
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

  let liturgyService: { getLiturgy: ReturnType<typeof vi.fn<() => Observable<Liturgy[] | null>>> };

  const create = async (ids: string, masses: Liturgy[] | null = [mass(1, 'Чацвер'), mass(2, 'Успамін')]) => {
    liturgyService = {
      getLiturgy: vi
        .fn<() => Observable<Liturgy[] | null>>()
        .mockReturnValueOnce(of(masses))
        .mockReturnValue(of([mass(3, 'Пятніца')])),
    };
    slideIndex.set(0);
    updateRevealState.mockReset();
    TestBed.configureTestingModule({
      imports: [PresentationComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: ids } } } },
        { provide: LiturgyService, useValue: liturgyService },
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
  });

  it('should give the program every mass of the day, added or not', async () => {
    await create('l2');

    expect(component.program.masses()).toEqual([
      { id: 'l', title: 'Чацвер' },
      { id: 'l2', title: 'Успамін' },
    ]);
    expect(component.program.songs().map(({ liturgy }) => liturgy)).toEqual(['l2', 'l2']);
  });

  it('should ask again for the masses only while there are none for today', async () => {
    await create('5,l', null);

    expect(listed()).toEqual(['Песня 0-0']);
    expect(component.program.massesStatus()).toBe('missing');

    component.program.refreshMasses();

    expect(component.program.massesStatus()).toBe('ready');
    expect(component.program.masses()).toEqual([{ id: 'l', title: 'Пятніца' }]);

    component.program.refreshMasses();
    expect(liturgyService.getLiturgy).toHaveBeenCalledTimes(2);
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

    component.removeSlide(1, 'l-1');

    expect(listed()).toEqual(['Песня 0-0', 'ЧЫТАННЕ 2 1-1', 'ЕВАНГЕЛЛЕ 2 2-3']);
    expect(replaceState).toHaveBeenLastCalledWith('/presentation/5,l2');
  });

  it('should keep the screen on its slide when songs before it go, and move on when its own song goes', async () => {
    // song 0-0, then the two parts of the mass 1-1 and 2-3, then the song again 4-4
    await create('5,l,5');
    slideIndex.set(4);

    component.removeSlide(1, 'l-0');
    expect(listed()).toEqual(['Песня 0-0', 'Песня 1-1']);
    expect(updateRevealState).toHaveBeenLastCalledWith(1);

    slideIndex.set(1);
    component.removeSlide(1, '5');
    expect(updateRevealState).toHaveBeenLastCalledWith(0);
  });

  it('should move on to what followed when the song on the screen goes', async () => {
    await create('l,5');
    slideIndex.set(2);

    component.removeSlide(0, 'l-0');

    expect(listed()).toEqual(['Песня 0-0']);
    expect(updateRevealState).toHaveBeenLastCalledWith(0);
  });

  it('should add a song at the end, even while another one is on the screen', async () => {
    await create('5,l');
    slideIndex.set(1);

    expect(component.addSlide('5')).toBe(3);
    expect(listed()).toEqual(['Песня 0-0', 'ЧЫТАННЕ 1 1-1', 'ЕВАНГЕЛЛЕ 1 2-3', 'Песня 4-4']);
  });

  it('should move a song and keep the screen on the slide it shows', async () => {
    // song 0-0, the mass 1-1 and 2-3, the song again 4-4; the second slide of the gospel is on the screen
    await create('5,l,5');
    slideIndex.set(3);

    component.moveSlide(3, '5', 0);

    expect(listed()).toEqual(['Песня 0-0', 'Песня 1-1', 'ЧЫТАННЕ 1 2-2', 'ЕВАНГЕЛЛЕ 1 3-4']);
    expect(updateRevealState).toHaveBeenLastCalledWith(4);
    expect(replaceState).toHaveBeenLastCalledWith('/presentation/5,5,l');
  });

  it('should move a mass as a whole and never split it', async () => {
    await create('5,l,5');

    component.moveSlide(0, '5', 2);
    expect(listed()).toEqual(['Песня 0-0', 'ЧЫТАННЕ 1 1-1', 'ЕВАНГЕЛЛЕ 1 2-3', 'Песня 4-4']);

    component.moveSlide(1, 'l-0', 0);
    expect(listed()).toEqual(['ЧЫТАННЕ 1 0-0', 'ЕВАНГЕЛЛЕ 1 1-2', 'Песня 3-3', 'Песня 4-4']);
  });

  it('should let the program panel change only the song it names', async () => {
    await create('5,l');

    component.program.remove(0, 'l-0');
    component.program.move(0, 'l-0', 3);
    expect(listed()).toEqual(['Песня 0-0', 'ЧЫТАННЕ 1 1-1', 'ЕВАНГЕЛЛЕ 1 2-3']);

    expect(await component.program.add('5')).toBe(3);
  });

  it('should let a control window add a song and see it in the state', async () => {
    await create('5');
    const remote = new ChannelClientTransport('remote-control-spec');
    const twoSongs = firstValueFrom(remote.state$.pipe(filter(({ songs }) => songs.length === 2)));

    remote.send({ type: 'add', id: '5', request: 'spec' });
    TestBed.tick();

    const state = await twoSongs;
    expect(state.songs.map(({ id }) => id)).toEqual(['5', '5']);
    expect(state.added).toEqual([{ request: 'spec', index: 1 }]);
    expect(remote.status()).toBe('connected');
    remote.close();
  });
});
