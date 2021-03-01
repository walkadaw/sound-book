import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PresentationComponent } from './presentation.component';

describe('PresentationComponent', () => {
  let component: PresentationComponent;
  let fixture: ComponentFixture<PresentationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PresentationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PresentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
