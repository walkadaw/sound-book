import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChordVariationComponent } from './chord-variation.component';

describe('ChordVariationComponent', () => {
  let component: ChordVariationComponent;
  let fixture: ComponentFixture<ChordVariationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChordVariationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChordVariationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
