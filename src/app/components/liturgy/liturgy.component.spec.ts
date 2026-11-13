import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Liturgy, LiturgySection, LiturgySectionType } from '../../interfaces/liturgy';
import { localDate } from '../../services/liturgy-service/liturgy.service';
import { LiturgyComponent } from './liturgy.component';

const section = (type: LiturgySectionType, title: string, reference: string, text: string): LiturgySection => ({
  type,
  title,
  reference,
  blocks: [{ kind: 'text', lines: [text] }],
  alternatives: [],
});

const mass = (id: number, title: string, gospel: string): Liturgy => ({
  id,
  title,
  readings: '',
  url: `https://catholic.by/3/liturgy/${id}`,
  sections: [
    section('reading', 'ПЕРШАЕ ЧЫТАННЕ', 'Эф 3, 2–12', 'Браты'),
    section('gospel', 'ЕВАНГЕЛЛЕ', gospel, 'У той час'),
  ],
});

describe('LiturgyComponent', () => {
  let fixture: ComponentFixture<LiturgyComponent>;
  let http: HttpTestingController;

  const text = (selector: string, root: ParentNode = fixture.nativeElement) =>
    [...root.querySelectorAll(selector)].map((element) => element.textContent?.trim());

  const source = () => fixture.nativeElement.querySelector('article > i a')?.getAttribute('href');

  const load = async (masses: Liturgy[] | null) => {
    const request = http.expectOne((item) => item.url.endsWith('/liturgy/get'));

    if (masses) {
      request.flush({ [localDate()]: masses });
    } else {
      request.flush(null, { status: 0, statusText: 'Offline' });
    }

    await fixture.whenStable();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [LiturgyComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LiturgyComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('should show the sections of a single mass without a choice', async () => {
    await load([mass(1, 'Серада', 'Лк 12, 39–48')]);

    expect(text('h1')).toEqual(['Серада']);
    expect(text('h2')).toEqual(['ПЕРШАЕ ЧЫТАННЕ', 'ЕВАНГЕЛЛЕ']);
    expect(text('app-liturgy-section .meta')).toEqual(['Эф 3, 2–12', 'Лк 12, 39–48']);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
  });

  it('should show the first mass and switch to the chosen one', async () => {
    await load([mass(1, 'Чацвер', 'Лк 10, 1–12'), mass(2, 'Успамін св. Тэрэзы', 'Мц 18, 1–5')]);

    expect(text('h1')).toEqual(['Чацвер']);
    expect(source()).toBe('https://catholic.by/3/liturgy/1');

    fixture.nativeElement.querySelector('.mat-mdc-select-trigger').click();
    await fixture.whenStable();
    const options = [...document.querySelectorAll('mat-option')] as HTMLElement[];
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Чацвер', 'Успамін св. Тэрэзы']);

    options[1].click();
    await fixture.whenStable();
    expect(text('h1')).toEqual(['Успамін св. Тэрэзы']);
    expect(text('.meta')).toContain('Мц 18, 1–5');
    expect(source()).toBe('https://catholic.by/3/liturgy/2');
  });

  it('should tell there is nothing for today and load it on a press', async () => {
    await load(null);

    expect(text('h1')).toEqual(['Няма чытанняў на сёння']);

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    // a resource waiting for its answer keeps the fixture unstable
    fixture.detectChanges();
    expect(text('[role=status]')).toEqual(['Загрузка…']);
    expect(button.getAttribute('aria-disabled')).toBe('true');

    await load(null);
    expect(text('[role=status]')).toEqual(['Праверце злучэнне з інтэрнэтам і паспрабуйце зноў.']);

    button.click();
    fixture.detectChanges();
    await load([mass(1, 'Серада', 'Лк 12, 39–48')]);
    expect(text('h1')).toEqual(['Серада']);
  });
});
