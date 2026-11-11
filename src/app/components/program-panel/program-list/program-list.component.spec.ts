import { LiveAnnouncer } from '@angular/cdk/a11y';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { FakeMatIconRegistry } from '@angular/material/icon/testing';
import { FakeProgram } from '../program-testing';
import { ProgramEntry } from './program-entries-view';
import { ProgramListComponent } from './program-list.component';

describe('ProgramListComponent', () => {
  let fixture: ComponentFixture<ProgramListComponent>;
  let program: FakeProgram;
  let announce: ReturnType<typeof vi.fn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(element().querySelectorAll<HTMLElement>('li.entry'));
  const names = () => rows().map((row) => row.querySelector('.name')?.textContent?.trim());

  const press = async (target: HTMLElement, init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  };

  beforeEach(async () => {
    announce = vi.fn();
    // song 5, the mass "l" of two parts, song 7; the gospel of the mass is on the screen
    program = new FakeProgram(['5', 'r@l', 'g@l', '7'], [{ id: 'l', title: 'Чацвер' }]);
    program.slide.set(2);

    TestBed.configureTestingModule({
      imports: [ProgramListComponent],
      providers: [
        { provide: LiveAnnouncer, useValue: { announce } },
        { provide: MatIconRegistry, useClass: FakeMatIconRegistry },
      ],
    });

    fixture = TestBed.createComponent(ProgramListComponent);
    fixture.componentRef.setInput('control', program);
    await fixture.whenStable();
  });

  it('should show a mass as one row with its parts, the one on the screen marked', () => {
    const parts = Array.from(rows()[1].querySelectorAll<HTMLElement>('.parts li'));

    expect(names()).toEqual(['Песня 5', 'Чацвер', 'Песня 7']);
    expect(rows().map((row) => row.className.match(/past|active|future/)?.[0])).toEqual(['past', 'active', 'future']);
    expect(parts.map((part) => part.querySelector('.name')?.textContent?.trim())).toEqual(['Частка r', 'Частка g']);
    expect(parts.map((part) => part.className)).toEqual(['past', 'active']);
    expect(parts[1].querySelector('.part')?.getAttribute('aria-current')).toBe('true');
  });

  it('should jump to a part of a mass', async () => {
    (rows()[1].querySelector('.parts li .part') as HTMLButtonElement).click();

    expect(program.calls).toEqual(['goTo 1']);
  });

  it('should jump to a song', async () => {
    const jumped = vi.fn();
    fixture.componentInstance.navigated.subscribe(jumped);

    (rows()[2].querySelector('.song') as HTMLButtonElement).click();

    expect(program.calls).toEqual(['goTo 3']);
    expect(jumped).toHaveBeenCalled();
  });

  it('should leave the arrows alone', async () => {
    const handle = rows()[2].querySelector('.handle') as HTMLButtonElement;

    const event = await press(handle, { key: 'ArrowUp', altKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(names()).toEqual(['Песня 5', 'Чацвер', 'Песня 7']);
  });

  it('should move a row up with the row menu and keep the focus on its menu button', async () => {
    fixture.componentInstance.menuMove(fixture.componentInstance.entries()[2], -1);
    await fixture.whenStable();

    expect(names()).toEqual(['Песня 5', 'Песня 7', 'Чацвер']);
    expect(document.activeElement).toBe(rows()[1].querySelector('.more'));
    expect(announce).toHaveBeenCalledWith('Перамешчана на месца 2 з 3');
  });

  it('should show a song next with the row menu', async () => {
    const list = fixture.componentInstance;
    const [first, mass, last] = list.entries();

    // right after the mass on the screen
    expect(list.nextIndex()).toBe(3);
    expect([list.canShowNext(first), list.canShowNext(mass), list.canShowNext(last)]).toEqual([true, false, false]);

    list.menuMoveTo(first, list.nextIndex());
    await fixture.whenStable();

    expect(names()).toEqual(['Чацвер', 'Песня 5', 'Песня 7']);
  });

  it('should hand a removed row up and move the focus to the next one', async () => {
    const removed: ProgramEntry[] = [];
    fixture.componentInstance.remove.subscribe((entry) => removed.push(entry));
    const song = rows()[0].querySelector('.song') as HTMLButtonElement;
    song.focus();

    await press(song, { key: 'Delete' });
    expect(removed.map(({ id, index, end }) => `${id} ${index}-${end}`)).toEqual(['5 0-1']);

    program.remove(0, '5');
    await fixture.whenStable();
    expect(document.activeElement).toBe(rows()[0].querySelector('.song'));
  });

  it('should move a row dropped elsewhere', async () => {
    fixture.componentInstance.drop({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<ProgramEntry[]>);
    await fixture.whenStable();

    expect(names()).toEqual(['Чацвер', 'Песня 7', 'Песня 5']);
  });

  it('should focus the song on the screen when asked', () => {
    expect(fixture.componentInstance.focusCurrent()).toBe(true);
    expect(document.activeElement).toBe(rows()[1].querySelector('.song'));
  });

  it('should let nothing be pressed while the presentation is out of reach', async () => {
    program.enabled.set(false);
    await fixture.whenStable();

    const buttons = Array.from(element().querySelectorAll<HTMLButtonElement>('li.entry button'));

    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('should wait for the move itself before it moves the focus, even past a copy of the same song', async () => {
    program.songs.set(new FakeProgram(['5', '7', '5']).songs());
    await fixture.whenStable();
    // the presentation is slow to answer: the move is not done yet
    const move = vi.spyOn(program, 'move').mockImplementation(() => {});

    fixture.componentInstance.menuMoveTo(fixture.componentInstance.entries()[0], 3);
    await fixture.whenStable();
    expect(announce).not.toHaveBeenCalled();

    move.mockRestore();
    program.move(0, '5', 3);
    await fixture.whenStable();
    expect(announce).toHaveBeenCalledWith('Перамешчана на месца 3 з 3');
  });

  it('should drop a focus request the presentation never answered', async () => {
    vi.spyOn(program, 'move').mockImplementation(() => {});
    vi.useFakeTimers();

    fixture.componentInstance.menuMoveTo(fixture.componentInstance.entries()[0], 4);
    vi.advanceTimersByTime(3000);
    vi.useRealTimers();
    // much later the same song happens to stand where the move would have put it
    program.songs.set(new FakeProgram(['r@l', 'g@l', '7', '5']).songs());
    await fixture.whenStable();

    expect(announce).not.toHaveBeenCalled();
  });

  it('should leave alone a row the program lost while its menu was open', async () => {
    const [song] = fixture.componentInstance.entries();
    // another remote removed the song meanwhile
    program.remove(0, '5');
    await fixture.whenStable();

    fixture.componentInstance.menuRemove(song);
    fixture.componentInstance.menuMove(song, 1);

    expect(program.ids()).toEqual(['r', 'g', '7']);
  });

  it('should say what to do with an empty program', async () => {
    program.songs.set([]);
    await fixture.whenStable();

    expect(element().textContent).toContain('Праграма пустая');
  });
});
