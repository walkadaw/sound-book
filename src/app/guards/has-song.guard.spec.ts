import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { SongRequest } from '../interfaces/song';
import { SongService } from '../services/song-service/song.service';
import { hasSongGuard } from './has-song.guard';

const songList = (...ids: number[]): SongRequest => ({
  last_update: '1',
  hash: '',
  songs: ids.map((id) => ({ id, songId: 0, title: `Song ${id}`, text: '', chord: '', tag: {} })),
});

describe('hasSongGuard', () => {
  let songService: SongService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    songService = TestBed.inject(SongService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const check = (id: string) =>
    TestBed.runInInjectionContext(() =>
      hasSongGuard({ paramMap: convertToParamMap({ id }) } as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  const expectNotFound = (result: unknown) => {
    expect(result).toBeInstanceOf(RedirectCommand);
    const redirect = result as RedirectCommand;
    expect(TestBed.inject(Router).serializeUrl(redirect.redirectTo as ReturnType<Router['parseUrl']>)).toBe('/404');
    expect(redirect.navigationBehaviorOptions).toEqual({ skipLocationChange: true });
  };

  const flushSongs = (list: SongRequest) => {
    TestBed.tick();
    http.expectOne((req) => req.url.endsWith('/song/get')).flush(list);
  };

  it('lets a known song through without waiting for the load', () => {
    songService.setSong(songList(1));
    songService.loadSongs().subscribe();

    expect(check('1')).toBe(true);
    http.expectOne((req) => req.url.endsWith('/song/get')).flush(null);
  });

  it('redirects to 404 at once when nothing is loading', () => {
    expectNotFound(check('2'));
  });

  it('waits for the load and opens a song it brings', async () => {
    songService.setSong(songList(1));
    songService.loadSongs().subscribe();

    const result = check('2');
    expect(isObservable(result)).toBe(true);
    const pending = firstValueFrom(result as Observable<GuardResult>);
    flushSongs(songList(1, 2));

    expect(await pending).toBe(true);
  });

  it('waits for the load and redirects to 404 when the song is still missing', async () => {
    songService.loadSongs().subscribe();

    const pending = firstValueFrom(check('2') as Observable<GuardResult>);
    flushSongs(songList(1));

    expectNotFound(await pending);
  });
});
