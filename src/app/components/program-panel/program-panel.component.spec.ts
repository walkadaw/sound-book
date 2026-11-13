import { LiveAnnouncer } from '@angular/cdk/a11y';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { FakeMatIconRegistry } from '@angular/material/icon/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Song } from '../../interfaces/song';
import { SongService } from '../../services/song-service/song.service';
import { ProgramPanelComponent } from './program-panel.component';
import { FakeProgram } from './program-testing';

const song = (songId: number, title: string): Song => ({
  id: songId,
  songId,
  title,
  text: title,
  chord: '',
  tag: {},
  position: null,
});

describe('ProgramPanelComponent', () => {
  let fixture: ComponentFixture<ProgramPanelComponent>;
  let program: FakeProgram;
  let snackOpen: ReturnType<typeof vi.fn>;
  let announce: ReturnType<typeof vi.fn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const input = () => element().querySelector('input[role="combobox"]') as HTMLInputElement;
  const options = () => Array.from(element().querySelectorAll<HTMLElement>('[role="option"]'));
  const titles = () => options().map((option) => option.querySelector('.title')?.textContent?.trim());

  // the search waits for a pause in typing
  const type = async (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 150));
    await fixture.whenStable();
  };

  const key = async (name: string) => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: name, cancelable: true }));
    await fixture.whenStable();
  };

  const focusSearch = async () => {
    input().focus();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    snackOpen = vi.fn(() => ({ onAction: () => ({ subscribe: () => {} }) }));
    announce = vi.fn();
    program = new FakeProgram(
      ['24'],
      [
        { id: 'l', title: 'Чацвер' },
        { id: 'l2', title: 'Успамін' },
      ],
    );
    program.massParts = { l: ['r', 'g'], l2: ['r', 'g'] };

    TestBed.configureTestingModule({
      imports: [ProgramPanelComponent],
      providers: [
        {
          provide: SongService,
          useValue: { songList: signal([song(24, 'Агнец Божы'), song(124, 'Будзь са мной'), song(240, 'Вось Ягня')]) },
        },
        { provide: MatSnackBar, useValue: { open: snackOpen } },
        { provide: LiveAnnouncer, useValue: { announce } },
        { provide: MatIconRegistry, useClass: FakeMatIconRegistry },
      ],
    });

    fixture = TestBed.createComponent(ProgramPanelComponent);
    fixture.componentRef.setInput('control', program);
    await fixture.whenStable();
  });

  it('should list every mass and song while the search has the focus, and the program otherwise', async () => {
    expect(element().querySelector('app-program-list')).not.toBeNull();

    await focusSearch();

    expect(element().querySelector('app-program-list')).toBeNull();
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(titles()).toEqual(['Чацвер', 'Успамін', '24. Агнец Божы', '124. Будзь са мной', '240. Вось Ягня']);
    // nothing is chosen until the reader picks it
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);

    input().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    await fixture.whenStable();

    expect(element().querySelector('app-program-list')).not.toBeNull();
  });

  it('should show the chosen theme only while searching', async () => {
    fixture.componentInstance.setTag(3);
    await fixture.whenStable();
    expect(element().querySelector('.chip')?.textContent).toContain('Праслаўленне');

    input().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    await fixture.whenStable();
    expect(element().querySelector('.chip')).toBeNull();
  });

  it('should put the song with exactly the number first and add it with Enter', async () => {
    await focusSearch();
    await type('24');

    expect(options().map((option) => option.querySelector('.number')?.textContent?.trim())).toEqual([
      '24',
      '124',
      '240',
    ]);
    expect(options()[0].textContent).toContain('Дакладны нумар');
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[0].id);

    await key('ArrowDown');
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[1].id);

    await key('Enter');

    expect(program.ids()).toEqual(['24', '124']);
    expect(input().value).toBe('');
    // the search closes on the program, with the focus on the new song and no message over it
    await fixture.whenStable();
    expect(element().querySelector('app-program-list')).not.toBeNull();
    expect(document.activeElement).toBe(element().querySelectorAll('li.entry .song')[1]);
    expect(snackOpen).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('Дададзена «Будзь са мной»');
  });

  it('should let a song in twice', async () => {
    await focusSearch();

    expect(options()[2].querySelector('.added')?.textContent).toContain('у праграме');

    options()[2].click();
    await fixture.whenStable();

    expect(program.ids()).toEqual(['24', '24']);

    await focusSearch();
    expect(options()[2].querySelector('.added')?.textContent).toContain('×2');
  });

  it('should add a mass of the day as a whole, once', async () => {
    await focusSearch();
    await type('літ');

    expect(titles()).toEqual(['Чацвер', 'Успамін']);

    options()[1].click();
    await fixture.whenStable();
    expect(program.songs().map(({ liturgy }) => liturgy)).toEqual([null, 'l2', 'l2']);

    await focusSearch();
    await type('літ');
    expect(options()[1].getAttribute('aria-disabled')).toBe('true');
    expect(options()[1].querySelector('.added')?.textContent).toContain('ужо дададзена');
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[0].id);
  });

  it('should offer to ask again for the masses when there are none for today', async () => {
    program.masses.set([]);
    program.massesStatus.set('missing');
    await focusSearch();
    await type('літ');

    expect(titles()).toEqual(['Няма чытанняў на сёння']);
    expect(options()[0].getAttribute('aria-disabled')).toBeNull();
    // Enter adds a song rather than asking again
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);

    options()[0].click();
    await fixture.whenStable();
    expect(program.calls).toEqual(['refreshMasses']);

    program.massesStatus.set('loading');
    await fixture.whenStable();
    expect(titles()).toEqual(['Чытанні дня загружаюцца…']);
    expect(options()[0].getAttribute('aria-disabled')).toBe('true');

    program.masses.set([{ id: 'l', title: 'Пятніца' }]);
    program.massesStatus.set('ready');
    await fixture.whenStable();
    expect(titles()).toEqual(['Пятніца']);
  });

  it('should tell a number that no song has', async () => {
    await type('999');

    expect(element().querySelector('.empty')?.textContent).toContain('Песні з нумарам 999 няма');
    expect(element().querySelector('.empty')?.textContent).toContain('Нумары ад 1 да 240');
  });

  it('should clear the search with Escape, and leave on the next one', async () => {
    const left = vi.fn();
    fixture.componentInstance.leave.subscribe(left);
    await focusSearch();
    await type('24');

    await key('Escape');
    expect(input().value).toBe('');
    expect(left).not.toHaveBeenCalled();

    await key('Escape');
    expect(left).toHaveBeenCalledTimes(1);
    expect(element().querySelector('app-program-list')).not.toBeNull();
    // the focus lands on the song on the screen, not on the page
    expect(document.activeElement).toBe(element().querySelector('li.entry .song'));
  });

  it('should remove a song without a message to undo it', async () => {
    program.songs.set(new FakeProgram(['5', '7', '9']).songs());
    await fixture.whenStable();

    fixture.componentInstance.removeEntry({
      index: 1,
      end: 2,
      id: '7',
      title: 'Песня 7',
      liturgy: null,
      startIndex: 1,
      status: 'future',
      slides: [],
      parts: [],
    });

    expect(program.ids()).toEqual(['5', '9']);
    expect(snackOpen).not.toHaveBeenCalled();
    await fixture.whenStable();
    expect(announce).toHaveBeenCalledWith('Выдалена «Песня 7»');
  });

  it('should not read out a removal the presentation turned down', async () => {
    program.songs.set(new FakeProgram(['5', '7']).songs());
    await fixture.whenStable();
    const remove = vi.spyOn(program, 'remove').mockImplementation(() => {});

    fixture.componentInstance.removeEntry({
      index: 1,
      end: 2,
      id: '7',
      title: 'Песня 7',
      liturgy: null,
      startIndex: 1,
      status: 'future',
      slides: [],
      parts: [],
    });
    await fixture.whenStable();

    expect(remove).toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalledWith('Выдалена «Песня 7»');
  });

  it('should count a mass once, however many parts it has', async () => {
    await focusSearch();
    options()[0].click();
    await fixture.whenStable();

    await focusSearch();

    expect(options()[0].querySelector('.added')?.textContent).not.toContain('×');
  });

  it('should keep the search open and offer no retry when a song could not be added', async () => {
    vi.spyOn(program, 'add').mockResolvedValue(null);
    await focusSearch();

    options()[3].click();
    await fixture.whenStable();

    expect(snackOpen).toHaveBeenCalledWith(expect.stringContaining('Не ўдалося дадаць'), 'Зачыніць', expect.anything());
    expect(options().length).toBe(5);
  });

  it('should add nothing while the presentation is out of reach', async () => {
    program.enabled.set(false);
    await type('24');

    expect(options()[0].getAttribute('aria-disabled')).toBe('true');
    await key('Enter');

    expect(program.ids()).toEqual(['24']);
  });
});
