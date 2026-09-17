import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTestStore } from '../../../testing/store-test-providers';

import { WakeLockService } from './wake-lock.service';

describe('WakeLockService', () => {
  let service: WakeLockService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestStore(), provideRouter([])],
    });
    service = TestBed.inject(WakeLockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
