import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('stores the chosen mode and shows it', () => {
    service.setMode('dark');
    TestBed.tick();

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(service.isDark()).toBe(true);
  });

  it('tells a light mode from a dark one', () => {
    service.setMode('light');

    expect(service.isDark()).toBe(false);
  });
});
