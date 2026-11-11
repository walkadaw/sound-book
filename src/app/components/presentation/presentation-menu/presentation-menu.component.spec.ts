import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { FakeMatIconRegistry } from '@angular/material/icon/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY } from 'rxjs';
import { FakeProgram } from '../../program-panel/program-testing';
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
        { provide: MatIconRegistry, useClass: FakeMatIconRegistry },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PresentationMenuComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('program', new FakeProgram());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
    expect(button()).toBeNull();

    const slide = (text: string) => ({ fontSize: 60, text });
    fixture.componentRef.setInput('slideList', [
      { id: '5', title: 'Песня', slides: [slide('1'), slide('2')], startIndex: 0, endIndex: 1 },
      { id: '7', title: 'Другая', slides: [slide('3')], startIndex: 2, endIndex: 2 },
    ]);
    fixture.detectChanges();
    expect(button()).toBeTruthy();
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

  it('should open an empty presentation on the search', () => {
    const search = fixture.nativeElement.querySelector('input[role="combobox"]');

    expect(component.active()).toBe(true);
    expect(document.activeElement).toBe(search);
  });

  it('should give the focus back to the slides on closing', () => {
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;

    component.closeMenu();
    fixture.detectChanges();

    expect(nav.hasAttribute('inert')).toBe(true);
    expect(nav.contains(document.activeElement)).toBe(false);
  });
});
