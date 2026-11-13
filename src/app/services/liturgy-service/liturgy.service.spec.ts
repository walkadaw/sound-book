import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Liturgy, LiturgyDays } from '../../interfaces/liturgy';
import { LiturgyService, localDate } from './liturgy.service';

const mass = (id: number, title: string): Liturgy => ({
  id,
  title,
  readings: '',
  url: `https://catholic.by/3/liturgy/${id}`,
  sections: [],
});

const days: LiturgyDays = {
  '2026-11-12': [mass(1, 'Чацвер')],
  '2026-11-13': [mass(2, 'Пятніца')],
  '2026-11-14': [mass(3, 'Субота')],
};

describe('LiturgyService', () => {
  let service: LiturgyService;
  let http: HttpTestingController;

  const request = () => http.expectOne((item) => item.url.endsWith('/liturgy/get'));

  const get = () => {
    let result: Liturgy[] | null | undefined;

    service.getLiturgy().subscribe((value) => (result = value));

    return () => result;
  };

  const setDay = (day: string) => vi.setSystemTime(new Date(`${day}T10:00:00`));

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    setDay('2026-11-13');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LiturgyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('should take the masses of the device day from the days ahead', () => {
    const result = get();
    request().flush(days);

    expect(result()).toEqual([mass(2, 'Пятніца')]);
  });

  it('should never give another day for a day the answer does not have', () => {
    setDay('2026-11-15');

    const result = get();
    request().flush(days);

    expect(result()).toBeNull();
  });

  it('should return null when the request fails', () => {
    const result = get();
    request().flush(null, { status: 0, statusText: 'Offline' });

    expect(result()).toBeNull();
  });

  it('should give the date of the device', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
