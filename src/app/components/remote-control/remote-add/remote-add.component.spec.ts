import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { FakeMatIconRegistry } from '@angular/material/icon/testing';
import { Song } from '../../../interfaces/song';
import { SongService } from '../../../services/song-service/song.service';
import { RemoteSession } from '../remote-session.service';
import { FakeClientTransport, remoteState } from '../remote-testing';
import { RemoteAddComponent } from './remote-add.component';

const song = (id: number, title: string): Song => ({
  id,
  songId: id,
  title,
  text: title,
  chord: '',
  tag: {},
  position: null,
});

describe('RemoteAddComponent', () => {
  let fixture: ComponentFixture<RemoteAddComponent>;
  let transport: FakeClientTransport;

  const element = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    transport = new FakeClientTransport();
    TestBed.configureTestingModule({
      imports: [RemoteAddComponent],
      providers: [
        RemoteSession,
        { provide: SongService, useValue: { songList: signal([song(5, 'Песня 5'), song(7, 'Аве Марыя')]) } },
        { provide: MatIconRegistry, useClass: FakeMatIconRegistry },
      ],
    });
    TestBed.inject(RemoteSession).connect(transport);
    transport.states.next(remoteState());

    fixture = TestBed.createComponent(RemoteAddComponent);
    await fixture.whenStable();
  });

  it('should show which songs and masses are in the program already', () => {
    const labels = Array.from(element().querySelectorAll('[aria-label]'), (item) => item.getAttribute('aria-label'));

    expect(labels).toContain('«Песня 5» ужо ў праграме');
    expect(labels).toContain('Дадаць «Аве Марыя» у канец');
    expect(labels).toContain('Дадаць імшу «Успамін» у канец');
    expect(element().textContent).toContain('Дададзена');
  });

  it('should add to the end by default, with nothing to undo', () => {
    const [after, end] = Array.from(element().querySelectorAll<HTMLButtonElement>('.segments button'));

    expect(end.getAttribute('aria-pressed')).toBe('true');
    expect(after.getAttribute('aria-pressed')).toBe('false');

    (element().querySelector('button.add') as HTMLButtonElement).click();
    expect(transport.sent).toEqual([{ type: 'add', id: '7', position: 'end' }]);
  });

  it('should add after the current song when asked', async () => {
    const [after] = Array.from(element().querySelectorAll<HTMLButtonElement>('.segments button'));
    after.click();
    await fixture.whenStable();

    const add = element().querySelector('button.add') as HTMLButtonElement;
    expect(add.getAttribute('aria-label')).toBe('Дадаць «Аве Марыя» пасля «Песня 5»');
    add.click();
    expect(transport.sent.at(-1)).toEqual({ type: 'add', id: '7', position: 'afterCurrent' });
  });

  it('should list every song the search finds', () => {
    expect(element().querySelectorAll('li.song').length).toBe(2);
  });
});
