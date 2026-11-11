import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { FakeMatIconRegistry } from '@angular/material/icon/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SongService } from '../../services/song-service/song.service';
import { RemoteControlComponent } from './remote-control.component';
import { RemoteSession } from './remote-session.service';
import { FakeClientTransport, remoteState } from './remote-testing';

describe('RemoteControlComponent', () => {
  let fixture: ComponentFixture<RemoteControlComponent>;
  let transport: FakeClientTransport;
  let breakpoints: BehaviorSubject<BreakpointState>;

  const resize = async (width: number) => {
    breakpoints.next({
      matches: width >= 720,
      breakpoints: { '(min-width: 720px)': width >= 720, '(min-width: 1100px)': width >= 1100 },
    });
    await fixture.whenStable();
  };

  const press = (init: KeyboardEventInit, target: EventTarget = document.body) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };
  const element = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    transport = new FakeClientTransport();
    breakpoints = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });
    vi.spyOn(RemoteSession.prototype, 'joinRoom').mockImplementation(async function (this: RemoteSession) {
      this.connect(transport);
    });

    TestBed.configureTestingModule({
      imports: [RemoteControlComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: { room: 'room' }, data: {} } } },
        {
          provide: SongService,
          useValue: {
            songList: signal([{ id: 7, songId: 7, title: 'Аве', text: 'Аве', chord: '', tag: {}, position: null }]),
          },
        },
        { provide: MatIconRegistry, useClass: FakeMatIconRegistry },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => breakpoints, isMatched: () => false },
        },
      ],
    });

    fixture = TestBed.createComponent(RemoteControlComponent);
    fixture.detectChanges();
    transport.states.next(remoteState());
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should join the room of the link', () => {
    expect(RemoteSession.prototype.joinRoom).toHaveBeenCalledWith('room');
  });

  it('should move through the slides with the arrows and the keys of a clicker', () => {
    press({ key: 'ArrowRight' });
    press({ key: 'PageDown' });
    press({ key: 'ArrowLeft' });

    expect(transport.sent).toEqual([{ type: 'next' }, { type: 'next' }, { type: 'prev' }]);
  });

  it('should hide the text with B and switch the theme with T on any keyboard layout', () => {
    expect(press({ key: 'и', code: 'KeyB' }).defaultPrevented).toBe(true);
    press({ key: 'е', code: 'KeyT' });

    expect(transport.sent).toEqual([
      { type: 'blackout', hidden: true },
      { type: 'theme', light: true },
    ]);
  });

  it('should leave the keys alone while the reader types or holds a modifier', async () => {
    press({ key: '/' });
    await fixture.whenStable();
    const input = element().querySelector('input[type=search]') as HTMLInputElement;

    expect(document.activeElement).toBe(input);

    press({ key: 'ArrowRight' }, input);
    press({ key: 't', code: 'KeyT' }, input);
    press({ key: 'r', code: 'KeyR', ctrlKey: true });
    press({ key: 'b', code: 'KeyB', ctrlKey: true });

    expect(transport.sent).toEqual([]);
  });

  it('should switch the tabs and open the search from the program', async () => {
    const tabs = () => Array.from(element().querySelectorAll<HTMLButtonElement>('nav.tabs button'));

    expect(tabs()[0].getAttribute('aria-current')).toBe('page');

    tabs()[1].click();
    await fixture.whenStable();
    expect(element().querySelector('app-remote-program')).not.toBeNull();
    expect(tabs()[1].getAttribute('aria-current')).toBe('page');

    (element().querySelector('app-remote-program .add') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element().querySelector('app-remote-add')).not.toBeNull();
  });

  it('should lay the remote out by the width of the window', async () => {
    const has = (selector: string) => !!element().querySelector(selector);

    expect(has('nav.tabs')).toBe(true);
    expect(has('.board')).toBe(false);

    await resize(900);
    expect(fixture.componentInstance.layout()).toBe('medium');
    expect(has('nav.tabs')).toBe(false);
    expect([has('app-remote-program'), has('app-remote-stage'), has('app-remote-next')]).toEqual([true, true, true]);
    expect(has('.side-column')).toBe(false);

    await resize(1330);
    expect(fixture.componentInstance.layout()).toBe('wide');
    expect([has('.side-column app-remote-next'), has('app-remote-timer')]).toEqual([true, true]);
    expect(has('.stage-column app-remote-next')).toBe(false);

    await resize(390);
    expect(has('nav.tabs')).toBe(true);
  });

  it('should switch the side column of a wide remote between the program and the whole song list', async () => {
    await resize(1330);
    const has = (selector: string) => !!element().querySelector(selector);
    const [program, add] = Array.from(element().querySelectorAll<HTMLButtonElement>('.side-switch button'));

    expect(program.getAttribute('aria-pressed')).toBe('true');
    expect([has('app-remote-program'), has('app-remote-add')]).toEqual([true, false]);

    add.click();
    await fixture.whenStable();
    expect(add.getAttribute('aria-pressed')).toBe('true');
    expect([has('app-remote-program'), has('app-remote-add li.song')]).toEqual([false, true]);
  });

  it('should open the search with / and come back to the program with Escape', async () => {
    await resize(1330);

    press({ key: '/' });
    await fixture.whenStable();
    const input = element().querySelector('.program-column input[type=search]') as HTMLInputElement;
    expect(document.activeElement).toBe(input);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    const program = element().querySelector('.side-switch button') as HTMLButtonElement;
    expect(element().querySelector('app-remote-program')).not.toBeNull();
    expect(document.activeElement).toBe(program);
  });

  it('should show only the connection until the presentation answers', async () => {
    const has = (selector: string) => !!element().querySelector(selector);

    transport.status.set('busy');
    await fixture.whenStable();
    expect(element().querySelector('app-remote-status')?.textContent).toContain('іншая прылада');
    expect(element().querySelector('.offline .meta')?.textContent).toContain('адключыце іншую прыладу');
    expect([has('nav.tabs'), has('app-remote-deck'), has('app-slide-preview')]).toEqual([false, false, false]);

    transport.status.set('lost');
    await resize(1330);
    expect(element().querySelector('.offline .meta')?.textContent).toContain('адсканіруйце код');
    expect(has('.board')).toBe(false);

    transport.status.set('connected');
    await fixture.whenStable();
    expect([has('.offline'), has('.board'), has('app-slide-preview')]).toEqual([false, true, true]);
  });

  it('should spin while connecting and stop once the connection is lost or taken', async () => {
    const spinning = () => !!element().querySelector('.offline mat-progress-spinner');

    transport.status.set('connecting');
    await fixture.whenStable();
    expect(spinning()).toBe(true);

    transport.status.set('lost');
    await fixture.whenStable();
    expect(spinning()).toBe(false);

    transport.status.set('busy');
    await fixture.whenStable();
    expect(spinning()).toBe(false);
  });

  it('should offer to try again once the remote gave up, and not after the presentation disconnected it', async () => {
    const button = () =>
      Array.from(element().querySelectorAll<HTMLButtonElement>('.offline button')).find((item) =>
        item.textContent?.includes('Паспрабаваць зноў'),
      );

    transport.status.set('lost');
    await fixture.whenStable();
    button()?.click();
    expect(transport.status()).toBe('connecting');

    transport.status.set('closed');
    await fixture.whenStable();
    expect(button()).toBeUndefined();
    expect(element().querySelector('app-remote-status')?.textContent).toContain('Пульт адключаны');
    expect(element().querySelector('.offline .meta')?.textContent).toContain('адсканіруйце новы код');
  });

  it('should reach a presentation in this browser over its channel', () => {
    const joinWindow = vi.spyOn(RemoteSession.prototype, 'joinWindow').mockImplementation(() => {});
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RemoteControlComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { presentation: 'abc' }, data: { window: true } } },
        },
        { provide: SongService, useValue: { songList: signal([]) } },
        { provide: MatIconRegistry, useClass: FakeMatIconRegistry },
      ],
    });

    TestBed.createComponent(RemoteControlComponent).detectChanges();

    expect(joinWindow).toHaveBeenCalledWith('abc');
  });
});
