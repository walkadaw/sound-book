import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Liturgy } from '../../interfaces/liturgy';
import { LiturgyService } from './liturgy.service';

describe('LiturgyService', () => {
  let service: LiturgyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LiturgyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should return the masses of the day', () => {
    const masses: Liturgy[] = [{ id: 1, title: 'Серада', readings: '', sections: [] }];
    let result: Liturgy[] | null | undefined;

    service.getLiturgy().subscribe((value) => (result = value));
    http.expectOne((request) => request.url.endsWith('/liturgy/get')).flush(masses);

    expect(result).toEqual(masses);
  });

  it('should return null when the request fails', () => {
    let result: Liturgy[] | null | undefined;

    service.getLiturgy().subscribe((value) => (result = value));
    http
      .expectOne((request) => request.url.endsWith('/liturgy/get'))
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(result).toBeNull();
  });
});
