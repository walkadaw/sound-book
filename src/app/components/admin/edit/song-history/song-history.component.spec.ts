import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SongVersion } from '../../../../interfaces/song';
import { SongHistoryComponent } from './song-history.component';

const version = (id: number, createdAt: number | null, userName: string | null): SongVersion => ({
  id,
  title: 'Title',
  text: `Text ${id}`,
  chord: '',
  tag: '1',
  userName,
  createdAt,
  updatedAt: null,
});

describe('SongHistoryComponent', () => {
  let fixture: ComponentFixture<SongHistoryComponent>;
  let http: HttpTestingController;

  const buttons = () => [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
  const button = (label: string) => buttons().find((item) => item.textContent.includes(label));
  const text = (selector: string) =>
    [...fixture.nativeElement.querySelectorAll(selector)].map((element: HTMLElement) => element.textContent.trim());

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SongHistoryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SongHistoryComponent);
    fixture.componentRef.setInput('songId', 7);
    fixture.componentRef.setInput('title', 'Title');
    fixture.componentRef.setInput('text', 'Text 2');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const openWith = async (versions: SongVersion[]) => {
    button('Гісторыя змен').click();
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.endsWith('/song/history') && request.params.get('id') === '7')
      .flush(versions);
    await fixture.whenStable();
  };

  it('should not load the history until it is opened', () => {
    http.expectNone(() => true);
    expect(button('Гісторыя змен').getAttribute('aria-expanded')).toBe('false');
  });

  it('should list the versions and mark the one that predates the history', async () => {
    await openWith([version(2, 1_700_000_000, 'admin'), version(1, null, null)]);

    expect(button('admin')).toBeTruthy();
    expect(button('Зыходная версія')).toBeTruthy();
  });

  it('should emit the selected version on restore', async () => {
    const restored: SongVersion[] = [];
    fixture.componentInstance.restore.subscribe((item) => restored.push(item));
    await openWith([version(2, 1_700_000_000, 'admin'), version(1, null, null)]);

    button('Зыходная версія').click();
    await fixture.whenStable();
    expect(button('Зыходная версія').getAttribute('aria-expanded')).toBe('true');

    button('Аднавіць').click();
    expect(restored.map(({ id }) => id)).toEqual([1]);
  });

  it('should show what a version changed and compare it with the editor on demand', async () => {
    await openWith([version(2, 1_700_000_000, 'admin'), version(1, null, null)]);

    button('admin').click();
    await fixture.whenStable();
    expect(text('.history__diff del')).toEqual(['1']);
    expect(text('.history__diff ins')).toEqual(['2']);

    (fixture.nativeElement.querySelector('.history__diff input[type="checkbox"]') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(text('.history__diff .diff__summary')).toEqual(['Без змен']);
  });

  it('should compare the version that predates the history only with the editor', async () => {
    await openWith([version(2, 1_700_000_000, 'admin'), version(1, null, null)]);

    button('Зыходная версія').click();
    await fixture.whenStable();
    expect(text('.history__diff p')).toContain('Розніца з тэкстам у рэдактары:');
    expect(fixture.nativeElement.querySelector('.history__diff mat-checkbox')).toBeNull();
  });
});
