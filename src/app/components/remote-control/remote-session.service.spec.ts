import { TestBed } from '@angular/core/testing';
import { RemoteSession } from './remote-session.service';
import { FakeClientTransport, remoteState } from './remote-testing';

describe('RemoteSession', () => {
  let session: RemoteSession;
  let transport: FakeClientTransport;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [RemoteSession] });
    session = TestBed.inject(RemoteSession);
    transport = new FakeClientTransport();
    session.connect(transport);
  });

  it('should tell the current song, the next slide and the edges of the program', () => {
    transport.states.next(remoteState({ slide: 2 }));

    expect(session.currentSong()?.id).toBe('l-1');
    expect(session.nextSlide()).toEqual(expect.objectContaining({ songIndex: 2, inSong: 0 }));
    expect(session.atStart()).toBe(false);

    transport.states.next(remoteState({ slide: 4 }));
    expect(session.atEnd()).toBe(true);
    expect(session.nextSlide()).toBeNull();
  });

  it('should count the time from the start of the presentation by its own clock', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100_000);

    transport.states.next(remoteState({ elapsed: 60_000 }));

    expect(session.startedAt()).toBe(40_000);
  });

  it('should add a song to the end unless asked otherwise', () => {
    session.add('7');
    session.insertPosition.set('afterCurrent');
    session.add('8');

    expect(transport.sent).toEqual([
      { type: 'add', id: '7', position: 'end' },
      { type: 'add', id: '8', position: 'afterCurrent' },
    ]);
  });

  it('should close the transport with the remote', () => {
    TestBed.resetTestingModule();

    expect(transport.status()).toBe('lost');
  });
});
