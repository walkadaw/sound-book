import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { FakeMatIconRegistry } from '@angular/material/icon/testing';
import { RemoteSession } from '../remote-session.service';
import { FakeClientTransport, remoteState } from '../remote-testing';
import { RemoteProgramComponent } from './remote-program.component';

describe('RemoteProgramComponent', () => {
  let fixture: ComponentFixture<RemoteProgramComponent>;
  let transport: FakeClientTransport;

  const element = () => fixture.nativeElement as HTMLElement;
  const buttons = (selector: string) => Array.from(element().querySelectorAll<HTMLButtonElement>(selector));

  beforeEach(async () => {
    transport = new FakeClientTransport();
    TestBed.configureTestingModule({
      imports: [RemoteProgramComponent],
      providers: [RemoteSession, { provide: MatIconRegistry, useClass: FakeMatIconRegistry }],
    });
    TestBed.inject(RemoteSession).connect(transport);
    transport.states.next(remoteState());

    fixture = TestBed.createComponent(RemoteProgramComponent);
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should keep the parts of a mass together under its title', () => {
    const groups = fixture.componentInstance.groups();

    expect(groups.map(({ title, items }) => [title, items.map(({ song }) => song.id)])).toEqual([
      ['Чацвер', ['l-0', 'l-1']],
      ['Асобныя песні', ['5']],
    ]);
    expect(element().querySelector('.meta')?.textContent).toContain('3 песні · 5 слайдаў');
  });

  it('should remove a mass only as a whole and a song on its own', () => {
    const removeMass = buttons('.group-head button')[0];

    expect(removeMass.getAttribute('aria-label')).toBe('Выдаліць імшу «Чацвер»');
    expect(buttons('button.remove').map((button) => button.getAttribute('aria-label'))).toEqual(['Выдаліць «Песня 5»']);

    removeMass.click();
    buttons('button.remove')[0].click();

    expect(transport.sent).toEqual([
      { type: 'remove', index: 0, id: 'l-0' },
      { type: 'remove', index: 2, id: '5' },
    ]);
  });

  it('should mark the songs done, playing and to come, and unfold the current one', () => {
    const statuses = fixture.componentInstance.groups().flatMap(({ items }) => items.map(({ status }) => status));

    expect(statuses).toEqual(['past', 'past', 'active']);
    expect(element().querySelector('[aria-current="true"].song')?.textContent).toContain('Слайд 1 з 2');
    expect(buttons('.mini').length).toBe(2);
  });

  it('should scroll the list to the song that starts playing, and only then', async () => {
    const list = element().querySelector<HTMLElement>('.list')!;
    // the list 400px high, and every song below its visible part
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return this === list ? new DOMRect(0, 0, 300, 400) : new DOMRect(0, 500, 300, 50);
    });
    list.scrollTop = 0;

    transport.states.next(remoteState({ slide: 4 }));
    await fixture.whenStable();
    expect(list.scrollTop).toBe(0);

    transport.states.next(remoteState({ slide: 0 }));
    await fixture.whenStable();
    expect(list.scrollTop).toBe(158);
  });

  it('should go to a slide picked in an unfolded song', async () => {
    buttons('.song')[1].click();
    await fixture.whenStable();

    expect(buttons('.song')[1].getAttribute('aria-expanded')).toBe('true');
    buttons('.mini')[1].click();
    expect(transport.sent).toEqual([{ type: 'slide', index: 2, id: 'l-1' }]);
  });
});
