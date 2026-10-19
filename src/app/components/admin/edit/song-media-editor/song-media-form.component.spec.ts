import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SongMedia, SongMediaDraft } from '../../../../interfaces/song-media';
import { SongMediaFormComponent } from './song-media-form.component';

const DRIVE_LINK = 'https://drive.google.com/file/d/1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM/view';

describe('SongMediaFormComponent', () => {
  let fixture: ComponentFixture<SongMediaFormComponent>;
  let http: HttpTestingController;
  let saved: SongMediaDraft[];

  const input = (label: string) =>
    [...fixture.nativeElement.querySelectorAll('mat-form-field')]
      .find((field: HTMLElement) => field.querySelector('mat-label')?.textContent.trim().startsWith(label))
      ?.querySelector('input') as HTMLInputElement;
  const type = async (label: string, value: string) => {
    const element = input(label);
    element.value = value;
    element.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async () => {
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await fixture.whenStable();
  };
  const alertText = () =>
    [...fixture.nativeElement.querySelectorAll('[role="alert"]')].map((alert: HTMLElement) => alert.textContent).join();
  const toggleFragment = async () => {
    fixture.nativeElement.querySelector('mat-checkbox input').click();
    await fixture.whenStable();
  };

  const create = async (media: SongMedia | null = null) => {
    fixture = TestBed.createComponent(SongMediaFormComponent);
    saved = [];
    fixture.componentRef.setInput('media', media);
    fixture.componentRef.setInput('save', async (draft: SongMediaDraft) => saved.push(draft));
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SongMediaFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should save a fragment with its length', async () => {
    await create();

    await type('Спасылка', DRIVE_LINK);

    expect(input('Пачатак')).toBeUndefined();
    await toggleFragment();
    await type('Пачатак', '1:00');
    await type('Канец', '2:27');
    expect(input('Працягласць')).toBeUndefined();

    await submit();
    expect(saved).toEqual([
      {
        id: null,
        source: 'gdrive',
        ref: '1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM',
        title: null,
        author: null,
        duration: 87,
        startAt: 60,
        endAt: 147,
      },
    ]);
  });

  it('should show that the record did not save', async () => {
    await create();
    fixture.componentRef.setInput('save', () => Promise.reject(new Error('offline')));

    await type('Спасылка', DRIVE_LINK);
    await submit();

    expect(alertText()).toContain('Не атрымалася захаваць');
  });

  it('should fill the names from YouTube without replacing what was typed', async () => {
    await create();

    await type('Назва', 'Мая назва');
    await type('Спасылка', 'https://youtu.be/bAcV6rYaI5c?t=9243');
    http
      .expectOne((item) => item.url === 'https://www.youtube.com/oembed')
      .flush({ title: 'Будслаўскі фэст', author_name: 'catholicby' });
    await fixture.whenStable();

    expect(input('Назва').value).toBe('Мая назва');
    expect(input('Аўтар').value).toBe('catholicby');
    expect(input('Пачатак').value).toBe('2:34:03');
  });

  it('should keep a stored record as it is until its link changes', async () => {
    await create({
      id: 3,
      source: 'youtube',
      ref: 'bAcV6rYaI5c',
      title: 'Будслаўскі фэст',
      author: 'catholicby',
      duration: 87,
      startAt: 9243,
      endAt: 9330,
    });

    expect(input('Спасылка').value).toBe('https://www.youtube.com/watch?v=bAcV6rYaI5c');

    // the same video pasted with another time does not move the start or ask YouTube for the names again
    await type('Спасылка', 'https://youtu.be/bAcV6rYaI5c?t=10');
    expect(input('Пачатак').value).toBe('2:34:03');
  });

  it('should not save an end before the start', async () => {
    await create();

    await type('Спасылка', DRIVE_LINK);
    await toggleFragment();
    await type('Пачатак', '2:00');
    await type('Канец', '1:00');
    await submit();

    expect(saved).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Канец павінен быць пазней за пачатак');
  });

  it('should save a whole recording once the fragment is turned off', async () => {
    await create({
      id: 3,
      source: 'youtube',
      ref: 'bAcV6rYaI5c',
      title: 'Будслаўскі фэст',
      author: 'catholicby',
      duration: 87,
      startAt: 9243,
      endAt: 9330,
    });
    expect(input('Пачатак').value).toBe('2:34:03');

    await toggleFragment();
    expect(input('Пачатак')).toBeUndefined();
    await type('Працягласць', '3:00:00');
    await submit();

    expect(saved).toEqual([expect.objectContaining({ startAt: null, endAt: null, duration: 10800 })]);
  });

  it('should not let a hidden duration block a fragment', async () => {
    await create();

    await type('Спасылка', DRIVE_LINK);
    await type('Працягласць', 'abc');
    await toggleFragment();
    await type('Пачатак', '1:00');
    await type('Канец', '2:27');
    expect(input('Працягласць')).toBeUndefined();
    await submit();

    expect(saved).toEqual([expect.objectContaining({ duration: 87 })]);
  });

  it('should replace the names YouTube gave for the previous link', async () => {
    await create();
    const oembed = () => http.expectOne((item) => item.url === 'https://www.youtube.com/oembed');

    await type('Спасылка', 'https://youtu.be/bAcV6rYaI5c');
    oembed().flush({ title: 'Першае відэа', author_name: 'catholicby' });
    await fixture.whenStable();
    await type('Аўтар', 'Хор');

    await type('Спасылка', 'https://youtu.be/tL_pwjzhWS0');
    oembed().flush({ title: 'Другое відэа', author_name: 'Budslau' });
    await fixture.whenStable();

    expect(input('Назва').value).toBe('Другое відэа');
    expect(input('Аўтар').value).toBe('Хор');
  });

  it('should keep what is typed when the list reloads the same record', async () => {
    const media: SongMedia = {
      id: 3,
      source: 'gdrive',
      ref: '1Sn1kj8C3iqbcggMhDe2AaJ4Er_1V4QLM',
      title: 'Запіс',
      author: null,
      duration: 200,
      startAt: null,
      endAt: null,
    };
    await create(media);

    await type('Назва', 'Новая назва');
    fixture.componentRef.setInput('media', { ...media });
    await fixture.whenStable();

    expect(input('Назва').value).toBe('Новая назва');
  });

  describe('file upload', () => {
    const pick = async (file: File) => {
      const fileInput = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const button = (text: string) =>
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (item: HTMLButtonElement) => item.textContent.trim() === text,
      ) as HTMLButtonElement | undefined;
    const uploadRequest = () => http.expectOne((item) => item.url === '/api/song/media/upload');

    beforeEach(() => {
      // jsdom has no object URLs; the duration is then simply not read
      URL.createObjectURL = vi.fn(() => 'blob:song');
      URL.revokeObjectURL = vi.fn();
    });

    it('should save an uploaded file in place of a link', async () => {
      await create();
      await pick(new File(['audio'], 'Ave_Maria.mp3', { type: 'audio/mpeg' }));
      const request = uploadRequest();
      expect(request.request.params.get('name')).toBe('Ave_Maria.mp3');
      expect(request.request.headers.get('Content-Type')).toBe('application/octet-stream');
      request.flush({ ref: '0123456789abcdef.mp3' });
      await fixture.whenStable();

      expect(input('Спасылка')).toBeUndefined();
      expect(fixture.nativeElement.textContent).toContain('Файл: Ave_Maria.mp3');
      expect(input('Назва').value).toBe('Ave Maria');
      expect(document.activeElement).toBe(button('Замяніць файл'));

      await submit();
      expect(saved).toEqual([expect.objectContaining({ source: 'upload', ref: '0123456789abcdef.mp3' })]);
    });

    it('should offer a file only while there is no link', async () => {
      await create();
      expect(button('Або загрузіце аўдыяфайл')).toBeDefined();

      await type('Спасылка', DRIVE_LINK);
      expect(button('Або загрузіце аўдыяфайл')).toBeUndefined();
    });

    it('should show a stored file and go back to a link once it is removed', async () => {
      await create({
        id: 3,
        source: 'upload',
        ref: '0123456789abcdef.mp3',
        title: 'Ave Maria',
        author: null,
        duration: 200,
        startAt: null,
        endAt: null,
      });

      expect(input('Спасылка')).toBeUndefined();
      expect(fixture.nativeElement.querySelector('audio').getAttribute('src')).toBe('/api/media/0123456789abcdef.mp3');

      button('Прыбраць файл')?.click();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('audio')).toBeNull();
      expect(document.activeElement).toBe(input('Спасылка'));
      await submit();
      expect(saved).toEqual([]);

      await type('Спасылка', DRIVE_LINK);
      await submit();
      expect(saved).toEqual([expect.objectContaining({ source: 'gdrive' })]);
    });

    const storedUpload: SongMedia = {
      id: 3,
      source: 'upload',
      ref: '0123456789abcdef.mp3',
      title: 'Ave Maria',
      author: null,
      duration: 200,
      startAt: null,
      endAt: null,
    };

    it('should drop a replacement still uploading once the file is removed', async () => {
      await create(storedUpload);
      await pick(new File(['audio'], 'mass.mp3'));
      const request = uploadRequest();

      button('Прыбраць файл')?.click();
      await fixture.whenStable();

      expect(request.cancelled).toBe(true);
      expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeNull();
      expect(input('Спасылка')).toBeDefined();
    });

    it("should not keep the replaced file's length, but keep a length typed in", async () => {
      await create(storedUpload);
      await pick(new File(['audio'], 'mass.mp3'));
      uploadRequest().flush({ ref: 'fedcba9876543210.mp3' });
      await fixture.whenStable();
      expect(input('Працягласць').value).toBe('');
      expect(input('Назва').value).toBe('Ave Maria');

      await type('Працягласць', '4:00');
      await pick(new File(['audio'], 'other.mp3'));
      uploadRequest().flush({ ref: '00112233445566aa.mp3' });
      await fixture.whenStable();
      expect(input('Працягласць').value).toBe('4:00');
    });

    it('should not send a file that is not audio or is too large', async () => {
      await create();

      await pick(new File(['x'], 'notes.pdf'));
      expect(alertText()).toContain('Патрэбны аўдыяфайл');

      const large = new File(['x'], 'mass.mp3');
      Object.defineProperty(large, 'size', { value: 31 * 1024 * 1024 });
      await pick(large);
      expect(alertText()).toContain('Файл большы за 30 МБ');
    });

    it('should show that the upload failed', async () => {
      await create();

      await pick(new File(['audio'], 'song.mp3'));
      uploadRequest().flush(null, { status: 413, statusText: 'Payload Too Large' });
      await fixture.whenStable();

      expect(alertText()).toContain('Сервер не прымае такі вялікі файл');
      expect(fixture.nativeElement.querySelector('audio')).toBeNull();
    });
  });

  it('should drop the YouTube names that arrive after the link changed', async () => {
    await create();

    await type('Спасылка', 'https://youtu.be/bAcV6rYaI5c');
    const request = http.expectOne((item) => item.url === 'https://www.youtube.com/oembed');
    await type('Спасылка', DRIVE_LINK);

    expect(request.cancelled).toBe(true);
    expect(input('Назва').value).toBe('');
  });
});
