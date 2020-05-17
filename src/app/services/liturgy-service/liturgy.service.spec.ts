import { TestBed } from '@angular/core/testing';

import { LiturgyService } from './liturgy.service';

describe('LiturgyService', () => {
  let service: LiturgyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LiturgyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
