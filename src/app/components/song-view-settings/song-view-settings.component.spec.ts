import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTestStore } from '../../../testing/store-test-providers';

import { SongViewSettingsComponent } from './song-view-settings.component';

describe('SongViewSettingsComponent', () => {
  let fixture: ComponentFixture<SongViewSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongViewSettingsComponent],
      providers: [provideTestStore(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SongViewSettingsComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
