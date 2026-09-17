import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { RevealService } from '../../../services/reveal-service/reveal.service';

import { PresentationMenuComponent } from './presentation-menu.component';

const revealServiceStub: Partial<RevealService> = {
  getActiveSlide: () => 0,
  getNotesPlugin: () => ({ open: () => {} }),
  isShowControls: () => false,
  isSpeakerNotes: () => false,
  onSlideChange: () => EMPTY,
  togglePause: () => {},
  slide: () => {},
};

describe('PresentationMenuComponent', () => {
  let component: PresentationMenuComponent;
  let fixture: ComponentFixture<PresentationMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationMenuComponent],
      providers: [{ provide: RevealService, useValue: revealServiceStub }],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PresentationMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
