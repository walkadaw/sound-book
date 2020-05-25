import { TestBed } from '@angular/core/testing';

import { FuseService } from './fuse.service';

describe('FuseService', () => {
  let service: FuseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FuseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
