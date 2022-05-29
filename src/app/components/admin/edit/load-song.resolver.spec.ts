import { TestBed } from '@angular/core/testing';

import { LoadSongResolver } from './load-song.resolver';

describe('LoadSongResolver', () => {
  let resolver: LoadSongResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    resolver = TestBed.inject(LoadSongResolver);
  });

  it('should be created', () => {
    expect(resolver).toBeTruthy();
  });
});
