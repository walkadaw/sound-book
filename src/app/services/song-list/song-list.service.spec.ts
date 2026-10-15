import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Router, provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { provideTestStore } from '../../../testing/store-test-providers';
import { setSearchTermAction } from '../../redux/actions/search.actions';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { getShowMenu } from '../../redux/selector/settings.selector';
import { SongListService } from './song-list.service';

@Component({ template: '' })
class PageComponent {}

describe('SongListService', () => {
  let service: SongListService;
  let router: Router;
  let location: Location;
  let isMenuOpen: () => boolean;
  let selectedTag: () => number;
  let searchTerm: () => string;
  let store: Store;

  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await TestBed.inject(ApplicationRef).whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestStore(),
        provideLocationMocks(),
        provideRouter([
          { path: '', component: PageComponent },
          { path: 'song/:id', component: PageComponent },
        ]),
      ],
    });

    service = TestBed.inject(SongListService);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    isMenuOpen = TestBed.inject(Store).selectSignal(getShowMenu);
    selectedTag = TestBed.inject(Store).selectSignal(getSelectedTag);
    searchTerm = TestBed.inject(Store).selectSignal(getSearchTerm);
    store = TestBed.inject(Store);

    router.initialNavigation();
    await router.navigateByUrl('/song/22');
  });

  it('should open the list on the home page and step back to the page it was opened from', async () => {
    service.showTag(3);
    await settle();

    expect(location.path()).toBe('/?tag=3');
    expect(isMenuOpen()).toBe(true);
    expect(selectedTag()).toBe(3);
    expect(service.openSongId()).toBe(22);

    service.close();
    await settle();

    expect(location.path()).toBe('/song/22');
    expect(isMenuOpen()).toBe(false);
    expect(service.openSongId()).toBeNull();
  });

  it('should keep the tag picked last for the next list opened from a page', async () => {
    service.showTag(6);
    await settle();
    await router.navigateByUrl('/song/23');

    expect(selectedTag()).toBe(6);

    service.open();
    await settle();

    expect(location.path()).toBe('/?tag=6');
  });

  it('should replace the entry when the tag changes on the list, keeping the way back', async () => {
    service.open();
    await settle();
    service.showTag(2);
    await settle();

    expect(location.path()).toBe('/?tag=2');
    expect(service.openSongId()).toBe(22);

    location.back();
    await settle();

    expect(location.path()).toBe('/song/22');
  });

  it('should restore the way back when Forward returns to the list', async () => {
    service.open();
    await settle();
    location.back();
    await settle();
    location.forward();
    await settle();

    expect(isMenuOpen()).toBe(true);
    expect(service.openSongId()).toBe(22);
  });

  it('should reopen the list as it was left, but show a picked tag from the top', async () => {
    service.open();
    await settle();

    expect(service.resumed()).toBe(true);

    service.showTag(2);
    await settle();

    expect(service.resumed()).toBe(false);

    location.back();
    await settle();
    service.showTag(7);
    await settle();

    expect(service.resumed()).toBe(false);
    expect(service.openSongId()).toBe(22);
  });

  it('should bring back the search of the list entry on Back and Forward', async () => {
    service.open();
    await settle();
    store.dispatch(setSearchTermAction('дух'));
    await router.navigateByUrl('/song/23');
    service.open();
    await settle();
    store.dispatch(setSearchTermAction('марыя'));

    location.back();
    await settle();
    location.back();
    await settle();

    expect(location.path()).toBe('/');
    expect(searchTerm()).toBe('дух');

    location.forward();
    await settle();
    location.forward();
    await settle();

    expect(searchTerm()).toBe('марыя');
  });

  it('should keep the search an entry was reached with when it has none saved', async () => {
    store.dispatch(setSearchTermAction('shared text'));
    await router.navigateByUrl('/');
    await router.navigateByUrl('/song/23');
    store.dispatch(setSearchTermAction(''));

    location.back();
    await settle();

    expect(searchTerm()).toBe('shared text');
  });

  it('should step back once when closed twice before the trip starts', async () => {
    service.open();
    await settle();
    const back = vi.spyOn(location, 'back');

    service.close();
    service.close();
    await settle();

    expect(back).toHaveBeenCalledTimes(1);
    expect(location.path()).toBe('/song/22');
  });

  it('should keep the page entry when a second tag is picked before the list opens', async () => {
    service.showTag(3);
    service.showTag(5);
    await settle();

    expect(location.path()).toBe('/?tag=5');
    expect(service.openSongId()).toBe(22);

    location.back();
    await settle();

    expect(location.path()).toBe('/song/22');
  });

  it('should not navigate to drop a tag that is not set', async () => {
    service.open();
    await settle();
    const navigate = vi.spyOn(router, 'navigate');

    service.resetTag();

    expect(navigate).not.toHaveBeenCalled();
    expect(service.resumed()).toBe(true);
  });

  it('should tell a filter brought back by Back from one the reader picked', async () => {
    service.showTag(3);
    await settle();

    expect(service.takeChangedByHistory()).toBe(false);

    await router.navigateByUrl('/song/23');
    service.showTag(5);
    await settle();
    service.takeChangedByHistory();

    location.back();
    await settle();
    location.back();
    await settle();

    expect(selectedTag()).toBe(3);
    expect(service.takeChangedByHistory()).toBe(true);
    expect(service.takeChangedByHistory()).toBe(false);
  });

  it('should take the tag from a shared link and ignore an unknown one', async () => {
    await router.navigateByUrl('/?tag=5');

    expect(selectedTag()).toBe(5);
    expect(service.openSongId()).toBeNull();

    await router.navigateByUrl('/?tag=999');

    expect(selectedTag()).toBe(0);
  });

  it('should not start a second trip when the search is focused while the list opens', async () => {
    const navigate = vi.spyOn(router, 'navigate');

    service.showTag(4);
    service.open();
    await settle();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(location.path()).toBe('/?tag=4');
  });
});
