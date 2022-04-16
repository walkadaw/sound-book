import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LiturgyComponent } from './liturgy.component';

describe('LiturgyComponent', () => {
  let component: LiturgyComponent;
  let fixture: ComponentFixture<LiturgyComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LiturgyComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LiturgyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
