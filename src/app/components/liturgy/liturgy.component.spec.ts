import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Liturgy } from '../../interfaces/liturgy';
import { LiturgyComponent } from './liturgy.component';

const mass = (id: number, title: string, gospel: string): Liturgy => ({
  id,
  title,
  readings: '',
  sections: [
    { type: 'reading', title: 'ПЕРШАЕ ЧЫТАННЕ', reference: 'Эф 3, 2–12', blocks: [{ kind: 'text', lines: ['Браты'] }] },
    { type: 'gospel', title: 'ЕВАНГЕЛЛЕ', reference: gospel, blocks: [{ kind: 'text', lines: ['У той час'] }] },
  ],
});

describe('LiturgyComponent', () => {
  let fixture: ComponentFixture<LiturgyComponent>;
  let http: HttpTestingController;

  const text = (selector: string, root: ParentNode = fixture.nativeElement) =>
    [...root.querySelectorAll(selector)].map((element) => element.textContent?.trim());

  const load = async (body: Liturgy[] | null) => {
    const request = http.expectOne((item) => item.url.endsWith('/liturgy/get'));

    if (body) {
      request.flush(body);
    } else {
      request.flush(null, { status: 500, statusText: 'Server Error' });
    }

    await fixture.whenStable();
  };

  beforeEach(() => {
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
    expect(text('.meta')).toEqual(['Эф 3, 2–12', 'Лк 12, 39–48']);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
  });

  it('should show the first mass and switch to the chosen one', async () => {
    await load([mass(1, 'Чацвер', 'Лк 10, 1–12'), mass(2, 'Успамін св. Тэрэзы', 'Мц 18, 1–5')]);

    expect(text('h1')).toEqual(['Чацвер']);

    fixture.nativeElement.querySelector('.mat-mdc-select-trigger').click();
    await fixture.whenStable();
    const options = [...document.querySelectorAll('mat-option')] as HTMLElement[];
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Чацвер', 'Успамін св. Тэрэзы']);

    options[1].click();
    await fixture.whenStable();
    expect(text('h1')).toEqual(['Успамін св. Тэрэзы']);
    expect(text('.meta')).toContain('Мц 18, 1–5');
  });

  it('should report a failed request', async () => {
    await load(null);

    expect(text('h1')).toEqual(['Не атрымалася атрымаць сённяшняе чытанне']);
  });
});
