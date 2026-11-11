import { TestBed } from '@angular/core/testing';
import { RemoteSession } from '../remote-session.service';
import { FakeClientTransport, remoteState } from '../remote-testing';
import { RemoteTimerComponent } from './remote-timer.component';

describe('RemoteTimerComponent', () => {
  const time = (startedAt: number | null, now: number) => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    TestBed.configureTestingModule({ imports: [RemoteTimerComponent], providers: [RemoteSession] });
    TestBed.inject(RemoteSession).startedAt.set(startedAt);

    return TestBed.createComponent(RemoteTimerComponent).componentInstance.time();
  };

  afterEach(() => vi.restoreAllMocks());

  it('should count minutes and seconds from the start of the presentation', () => {
    expect(time(1_000, 1_000 + 12 * 60_000 + 48_000)).toBe('12:48');
  });

  it('should add the hours to a long service', () => {
    expect(time(0, 3_600_000 + 5 * 60_000 + 3_000)).toBe('1:05:03');
  });

  it('should wait for the presentation before counting', () => {
    expect(time(null, 5_000)).toBe('–:––');
  });

  it('should ask the presentation to start the count again on a click', async () => {
    TestBed.configureTestingModule({ imports: [RemoteTimerComponent], providers: [RemoteSession] });
    const session = TestBed.inject(RemoteSession);
    const transport = new FakeClientTransport();
    session.connect(transport);
    transport.states.next(remoteState());
    const fixture = TestBed.createComponent(RemoteTimerComponent);
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Скінуць таймер');
    button.click();

    expect(transport.sent).toEqual([{ type: 'resetTimer' }]);
  });
});
