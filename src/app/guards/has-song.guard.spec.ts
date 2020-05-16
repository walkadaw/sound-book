import { TestBed } from '@angular/core/testing';

import { HasSongGuard } from './has-song.guard';

describe('HasSongGuard', () => {
  let guard: HasSongGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(HasSongGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
