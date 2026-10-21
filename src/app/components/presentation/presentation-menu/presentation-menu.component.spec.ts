import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { RevealService } from '../../../services/reveal-service/reveal.service';
import { PresentationChannel } from '../../../services/presentation-channel/presentation-channel.service';

import { PresentationMenuComponent } from './presentation-menu.component';

const revealServiceStub: Partial<RevealService> = {
  getActiveSlide: () => 0,
  openNotes: () => {},
  layout: () => {},
  remoteId: 'test',
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
      providers: [PresentationChannel, { provide: RevealService, useValue: revealServiceStub }],
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

  it('should add the songs chosen in the other windows of the presentation', async () => {
    const added: string[] = [];
    component.addedSong.subscribe((id) => added.push(id));
    const otherWindow = new BroadcastChannel('reveal-menu-test');

    otherWindow.postMessage({ type: 'addSong', id: '5' });
    await vi.waitFor(() => expect(added).toEqual(['5']));
    otherWindow.close();
  });

  it('should keep the menu open in the control window', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PresentationMenuComponent],
      providers: [
        PresentationChannel,
        {
          provide: RevealService,
          useValue: { ...revealServiceStub, isShowControls: () => true, isSpeakerNotes: () => true },
        },
      ],
    });
    const pinned = TestBed.createComponent(PresentationMenuComponent);
    pinned.componentRef.setInput('slideList', [{ id: '5', title: 'Песня', slides: [], startIndex: 0, endIndex: 0 }]);
    pinned.detectChanges();

    pinned.componentInstance.toggleMenu();
    expect(pinned.componentInstance.active()).toBe(true);
    expect(pinned.nativeElement.querySelector('.slide-menu-overlay')).toBeNull();
    expect(document.body.classList).toContain('menuPinned');

    pinned.destroy();
    expect(document.body.classList).not.toContain('menuPinned');
  });

  it('should hide the masses while a song tag is chosen', () => {
    fixture.componentRef.setInput('liturgy', [{ id: 'l', title: 'Чацвер' }]);
    expect(component.foundLiturgy().length).toBe(1);

    component.onClickTag(component.tagsList[1].id);
    expect(component.foundLiturgy().length).toBe(0);
  });
});
