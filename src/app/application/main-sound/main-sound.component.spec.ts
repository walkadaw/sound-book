import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTestStore } from '../../../testing/store-test-providers';

import { MainSoundComponent } from './main-sound.component';

describe('MainSoundComponent', () => {
  let component: MainSoundComponent;
  let fixture: ComponentFixture<MainSoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainSoundComponent],
      providers: [provideTestStore(), provideRouter([])],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MainSoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
