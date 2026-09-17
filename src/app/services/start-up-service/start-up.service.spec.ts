import { TestBed } from '@angular/core/testing';
import { provideTestStore } from '../../../testing/store-test-providers';

import { StartUpService } from './start-up.service';

describe('StartUpService', () => {
  let service: StartUpService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestStore()],
    });
    service = TestBed.inject(StartUpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
