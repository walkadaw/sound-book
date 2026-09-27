import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SongService } from '../../../services/song-service/song.service';
import { Song } from '../../../interfaces/song';
import { PopularComponent } from './popular.component';

const song = (id: number, title: string) => ({ id, title, text: '', chord: '', tag: {} }) as Song;

describe('PopularComponent', () => {
  let fixture: ComponentFixture<PopularComponent>;
  let http: HttpTestingController;

  const titles = () =>
    [...fixture.nativeElement.querySelectorAll('tbody a')].map((link: HTMLElement) => link.textContent.trim());

  const sortBy = async (label: string) => {
    const buttons = [...fixture.nativeElement.querySelectorAll('th button')] as HTMLButtonElement[];
    buttons.find((button) => button.textContent.includes(label)).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PopularComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    TestBed.inject(SongService).setSong({
      songs: [song(1, 'Alpha'), song(2, 'Beta'), song(3, 'Gamma')],
      last_update: '1',
      hash: '',
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PopularComponent);
    // whenStable() would wait for the request itself, so only let the resource send it.
    fixture.detectChanges();

    http
      .expectOne((request) => request.url.endsWith('/song/popular'))
      .flush([
        { id: 1, view: 5, showP: 0 },
        { id: 2, view: 1, showP: 3 },
        { id: 3, view: 2, showP: 4 },
        // Deleted song: no title to show.
        { id: 99, view: 100, showP: 100 },
      ]);
    await fixture.whenStable();
  });

  it('sorts by the sum by default and skips unknown songs', () => {
    expect(titles()).toEqual(['Gamma', 'Alpha', 'Beta']);
  });

  it('sorts by views', async () => {
    await sortBy('Просмотры');

    expect(titles()).toEqual(['Alpha', 'Gamma', 'Beta']);
  });

  it('sorts by presentation uses and marks the sorted column', async () => {
    await sortBy('В презентации');

    expect(titles()).toEqual(['Gamma', 'Beta', 'Alpha']);
    expect(fixture.nativeElement.querySelector('th[aria-sort="descending"]').textContent).toContain('В презентации');
  });
});
