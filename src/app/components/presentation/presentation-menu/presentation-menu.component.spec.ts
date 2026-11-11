import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY } from 'rxjs';
import { RevealService } from '../../../services/reveal-service/reveal.service';
import { RemoteHost } from '../../../services/remote-control/remote-host.service';
import { PresentationFileService } from '../../../services/presentation-file/presentation-file.service';

import { PresentationMenuComponent } from './presentation-menu.component';

const light = signal(false);
const revealServiceStub: Partial<RevealService> = {
  presentationId: 'test',
  slideIndex: signal(0),
  light,
  setLight: (value: boolean) => light.set(value),
  isShowControls: () => false,
  onSlideChange: () => EMPTY,
  togglePause: () => {},
  slide: () => {},
};

const presentationFileStub = { downloadPptx: vi.fn(() => Promise.resolve()) };

describe('PresentationMenuComponent', () => {
  let component: PresentationMenuComponent;
  let fixture: ComponentFixture<PresentationMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationMenuComponent],
      providers: [
        RemoteHost,
        { provide: RevealService, useValue: revealServiceStub },
        { provide: PresentationFileService, useValue: presentationFileStub },
      ],
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

  it('should open the control window beside the presentation, the same one each time', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    component.openControlWindow();
    component.openControlWindow();

    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledWith(
      expect.stringMatching(/\/remote\/window\/test$/),
      'remote-control-test',
      expect.stringContaining('popup'),
    );
    open.mockRestore();
  });

  it('should switch the screen to black text on white and back', () => {
    component.toggleTheme();
    expect(light()).toBe(true);

    component.toggleTheme();
    expect(light()).toBe(false);
  });

  it('should download the slides of the presentation', async () => {
    const button = () => fixture.nativeElement.querySelector('.download-button') as HTMLButtonElement | null;
    component.isSearchFocused.set(false);
    fixture.detectChanges();
    expect(button()).toBeNull();

    const slide = (text: string) => ({ fontSize: 60, text });
    fixture.componentRef.setInput('slideList', [
      { id: '5', title: 'Песня', slides: [slide('1'), slide('2')], startIndex: 0, endIndex: 1 },
      { id: '7', title: 'Другая', slides: [slide('3')], startIndex: 2, endIndex: 2 },
    ]);
    fixture.detectChanges();
    expect(button()).toBeTruthy();

    component.isSearchFocused.set(true);
    fixture.detectChanges();
    expect(button()).toBeNull();

    component.isSearchFocused.set(false);
    fixture.detectChanges();
    presentationFileStub.downloadPptx.mockClear();

    button()?.click();
    // a second click while the file is made does nothing, and the button keeps the focus
    fixture.detectChanges();
    expect(button()?.disabled).toBe(false);
    expect(button()?.getAttribute('aria-disabled')).toBe('true');
    button()?.click();
    await fixture.whenStable();

    expect(presentationFileStub.downloadPptx).toHaveBeenCalledTimes(1);
    expect(presentationFileStub.downloadPptx).toHaveBeenCalledWith([slide('1'), slide('2'), slide('3')]);
  });

  it('should tell when the file could not be made', async () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    presentationFileStub.downloadPptx.mockRejectedValueOnce(new Error('chunk'));

    await component.downloadSlides();

    expect(open).toHaveBeenCalledWith(expect.stringContaining('Не атрымалася'), 'Зачыніць', { duration: 5000 });
    expect(component.isDownloading()).toBe(false);
  });

  it('should hide the masses while a song tag is chosen', () => {
    fixture.componentRef.setInput('liturgy', [{ id: 'l', title: 'Чацвер' }]);
    expect(component.foundLiturgy().length).toBe(1);

    component.onClickTag(component.tagsList[1].id);
    expect(component.foundLiturgy().length).toBe(0);
  });
});
