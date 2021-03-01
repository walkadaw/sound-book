import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MainSoundComponent } from './main-sound.component';

describe('MainSoundComponent', () => {
  let component: MainSoundComponent;
  let fixture: ComponentFixture<MainSoundComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MainSoundComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MainSoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
