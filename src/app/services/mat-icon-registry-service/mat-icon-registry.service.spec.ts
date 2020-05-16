import { TestBed } from '@angular/core/testing';

import { MatIconRegistryService } from './mat-icon-registry.service';

describe('MatIconRegistryService', () => {
  let service: MatIconRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MatIconRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
