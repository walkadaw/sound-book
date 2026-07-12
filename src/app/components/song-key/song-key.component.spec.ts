import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SongKeyComponent } from './song-key.component';

describe('SongKeyComponent', () => {
  let component: SongKeyComponent;
  let fixture: ComponentFixture<SongKeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [SongKeyComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SongKeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
