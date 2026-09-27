import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { provideTestStore } from '../../testing/store-test-providers';
import { getSearchTerm } from '../redux/selector/search.selector';
import { SITE_ORIGIN } from '../services/page-meta/site-origin.token';
import { shareTargetGuard } from './share-target.guard';

const ORIGIN = 'https://songs.example';

describe('shareTargetGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestStore(), provideRouter([]), { provide: SITE_ORIGIN, useValue: ORIGIN }],
    });
  });

  function share(queryParams: Record<string, string>): string {
    const route = { queryParams, queryParamMap: convertToParamMap(queryParams) } as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => shareTargetGuard(route, {} as RouterStateSnapshot));

    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  it('opens a shared link to this app', () => {
    expect(share({ url: `${ORIGIN}/song/12/Title` })).toBe('/song/12/Title');
  });

  it('finds the link inside shared text', () => {
    expect(share({ text: `Look at this ${ORIGIN}/playlist/view?songs=1,2` })).toBe('/playlist/view?songs=1,2');
  });

  it('ignores links to other sites and searches the text instead', async () => {
    expect(share({ text: 'https://elsewhere.example/song/12' })).toBe('/');
    expect(await firstValueFrom(TestBed.inject(Store).select(getSearchTerm))).toBe('https://elsewhere.example/song/12');
  });

  it('searches for shared text, falling back to the title', async () => {
    expect(share({ title: ' Song name ' })).toBe('/');
    expect(await firstValueFrom(TestBed.inject(Store).select(getSearchTerm))).toBe('Song name');
  });
});
