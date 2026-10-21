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

  it('should list the masses of the day first in the search', () => {
    const added: string[] = [];
    component.addedSong.subscribe((id) => added.push(id));
    fixture.componentRef.setInput('liturgy', [
      { id: 'l', title: 'Чацвер' },
      { id: 'l2', title: 'Успамін св. Тэрэзы' },
    ]);
    component.onSearchFocused();
    fixture.detectChanges();

    const items = () => [...fixture.nativeElement.querySelectorAll('.slide-menu-items-search li')] as HTMLElement[];
    expect(items().map((item) => item.textContent?.trim())).toEqual([
      'Літургія: Чацвер',
      'Літургія: Успамін св. Тэрэзы',
    ]);

    items()[1].click();
    expect(added).toEqual(['l2']);
  });

  it('should filter the masses by the search', async () => {
    // the search applies after its debounce
    const type = (value: string) => {
      component.search.setValue(value);
      return new Promise((resolve) => setTimeout(resolve, 350));
    };
    fixture.componentRef.setInput('liturgy', [{ id: 'l', title: 'Чацвер' }]);

    await type('Літ');
    expect(component.foundLiturgy().length).toBe(1);

    await type('цвер');
    expect(component.foundLiturgy().length).toBe(1);

    // a song search that only happens to be inside "Літургія"
    await type('гі');
    expect(component.foundLiturgy().length).toBe(0);
  });

  it('should hide the masses while a song tag is chosen', () => {
    fixture.componentRef.setInput('liturgy', [{ id: 'l', title: 'Чацвер' }]);
    expect(component.foundLiturgy().length).toBe(1);

    component.onClickTag(component.tagsList[1].id);
    expect(component.foundLiturgy().length).toBe(0);
  });
});
