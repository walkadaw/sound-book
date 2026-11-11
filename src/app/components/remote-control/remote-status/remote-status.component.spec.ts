import { TestBed } from '@angular/core/testing';
import { RemoteSession } from '../remote-session.service';
import { FakeClientTransport, remoteState } from '../remote-testing';
import { RemoteStatusComponent } from './remote-status.component';

describe('RemoteStatusComponent', () => {
  const statusText = async (setup: (session: RemoteSession, transport: FakeClientTransport) => void) => {
    TestBed.configureTestingModule({ imports: [RemoteStatusComponent], providers: [RemoteSession] });
    const session = TestBed.inject(RemoteSession);
    const transport = new FakeClientTransport();
    session.connect(transport);
    setup(session, transport);
    const fixture = TestBed.createComponent(RemoteStatusComponent);
    await fixture.whenStable();

    return (fixture.nativeElement as HTMLElement).textContent?.trim();
  };

  it('should tell a device it is connected', async () => {
    expect(await statusText((_, transport) => transport.states.next(remoteState({ remotes: 3 })))).toBe('Падключана');
  });

  it('should tell the window beside the presentation who else controls the screen', async () => {
    const local = (remotes: number) =>
      statusText((session, transport) => {
        session.local.set(true);
        transport.states.next(remoteState({ remotes }));
      });

    expect(await local(1)).toBe('Экран падключаны');
    TestBed.resetTestingModule();
    expect(await local(3)).toBe('Экран і 2 прылады падключаны');
  });

  it('should tell when the connection is lost', async () => {
    expect(await statusText((_, transport) => transport.status.set('lost'))).toBe('Сувязь страчана');
  });
});
