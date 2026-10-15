import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SongMediaDraft } from '../../../../interfaces/song-media';
import { SongMediaEditorComponent } from './song-media-editor.component';

const draft = (ref: string): SongMediaDraft => ({
  id: null,
  source: 'gdrive',
  ref,
  title: ref,
  author: null,
  duration: null,
  startAt: null,
  endAt: null,
});

describe('SongMediaEditorComponent', () => {
  let fixture: ComponentFixture<SongMediaEditorComponent>;
  let http: HttpTestingController;

  const editor = () =>
    fixture.componentInstance as unknown as {
      save: (media: SongMediaDraft) => Promise<void>;
      saveDrafts: (songId: number) => Promise<number>;
    };
  const labels = () =>
    [...fixture.nativeElement.querySelectorAll('.media-editor__text a')].map((link: HTMLElement) =>
      link.firstChild?.textContent?.trim(),
    );
  const flushSaves = async (statuses: number[]) => {
    for (const status of statuses) {
      await new Promise((resolve) => setTimeout(resolve));
      const request = http.expectOne((item) => item.url.endsWith('/song/media/save'));
      if (status === 200) {
        request.flush({ id: 1 });
      } else {
        request.flush(null, { status, statusText: 'Error' });
      }
    }
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SongMediaEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SongMediaEditorComponent);
    fixture.componentRef.setInput('songId', null);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('should keep the records of a new song until it is created', async () => {
    await editor().save(draft('first'));
    await editor().save(draft('second'));
    await fixture.whenStable();

    expect(labels()).toEqual(['first', 'second']);
    http.expectNone(() => true);
  });

  it('should store the drafts in their order and count the ones that failed', async () => {
    await editor().save(draft('first'));
    await editor().save(draft('second'));

    const result = editor().saveDrafts(36);
    await flushSaves([500, 200]);

    expect(await result).toBe(1);
  });

  it('should send a draft as a new record of the created song', async () => {
    await editor().save(draft('first'));

    const result = editor().saveDrafts(36);
    await new Promise((resolve) => setTimeout(resolve));
    const request = http.expectOne((item) => item.url.endsWith('/song/media/save'));
    expect(request.request.body).toEqual({ ...draft('first'), songId: 36 });
    request.flush({ id: 1 });

    expect(await result).toBe(0);
  });

  it('should keep a move button focusable once its record reaches the top', async () => {
    await editor().save(draft('first'));
    await editor().save(draft('second'));
    await fixture.whenStable();
    const up = (label: string) =>
      fixture.nativeElement.querySelector(`button[aria-label="Вышэй: ${label}"]`) as HTMLButtonElement;

    up('second').click();
    await fixture.whenStable();
    expect(labels()).toEqual(['second', 'first']);

    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(up('second'));
    expect(up('second').disabled).toBe(false);
    expect(up('second').getAttribute('aria-disabled')).toBe('true');
    up('second').click();
    await fixture.whenStable();
    expect(labels()).toEqual(['second', 'first']);
  });
});
