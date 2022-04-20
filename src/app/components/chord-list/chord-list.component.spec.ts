import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChordListComponent } from './chord-list.component';

describe('ChordListComponent', () => {
  let component: ChordListComponent;
  let fixture: ComponentFixture<ChordListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChordListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChordListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
