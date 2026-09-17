import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTestStore } from '../../../testing/store-test-providers';

import { SongDetailsComponent } from './song-details.component';

describe('SongDetailsComponent', () => {
  let component: SongDetailsComponent;
  let fixture: ComponentFixture<SongDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongDetailsComponent],
      providers: [provideTestStore(), provideRouter([])],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SongDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
