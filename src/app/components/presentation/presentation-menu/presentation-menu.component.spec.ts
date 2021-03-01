import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PresentationMenuComponent } from './presentation-menu.component';

describe('PresentationMenuComponent', () => {
  let component: PresentationMenuComponent;
  let fixture: ComponentFixture<PresentationMenuComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PresentationMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PresentationMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
