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

  it('should learn where its own added song went in from the presentation', async () => {
    const state = remoteState();
    transport.states.next(state);

    const added = session.add('7');
    const command = transport.sent[0];
    const request = command.type === 'add' ? command.request : '';

    expect(command).toEqual({ type: 'add', id: '7', request: expect.any(String) });

    // another remote's addition is not this one
    transport.states.next({ ...state, added: [{ request: 'other', index: 3 }] });
    transport.states.next({
      ...state,
      added: [
        { request: 'other', index: 3 },
        { request, index: 4 },
      ],
    });

    expect(await added).toBe(4);
  });

  it('should tell when the presentation could not add the song', async () => {
    transport.states.next(remoteState());

    const added = session.add('7');
    const command = transport.sent[0];

    transport.states.next(
      remoteState({ added: [{ request: command.type === 'add' ? command.request : '', index: null }] }),
    );

    expect(await added).toBeNull();
  });

  it('should give up on an added song that never comes back', async () => {
    vi.useFakeTimers();
    transport.states.next(remoteState());

    const added = session.add('7');
    vi.advanceTimersByTime(10_000);

    expect(await added).toBeNull();
    vi.useRealTimers();
  });

  it('should name the song it moves or removes', () => {
    session.move(2, '5', 0);
    session.remove(0, 'l-0');

    expect(transport.sent).toEqual([
      { type: 'move', index: 2, id: '5', to: 0 },
      { type: 'remove', index: 0, id: 'l-0' },
    ]);
  });

  it('should close the transport with the remote', () => {
    TestBed.resetTestingModule();

    expect(transport.status()).toBe('lost');
  });
});
