import { TestBed } from '@angular/core/testing';
import { RevealService } from './reveal.service';

describe('RevealService', () => {
  let service: RevealService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RevealService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should ignore a remote moving the slides before the presentation has loaded', () => {
    expect(() => {
      service.next();
      service.prev();
      service.slide(2);
      service.setPaused(true);
    }).not.toThrow();
  });
});
