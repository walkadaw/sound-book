import {
  Component,
  OnInit,
  ViewEncapsulation,
  DestroyRef,
  ElementRef,
  AfterViewInit,
  inject,
  signal,
  input,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PresentationFileService } from '../../../services/presentation-file/presentation-file.service';
import { SlideList } from '../../../interfaces/slide';
import { RemoteHost } from '../../../services/remote-control/remote-host.service';
import { RevealService } from '../../../services/reveal-service/reveal.service';
import { controlWindowUrl } from '../../../services/remote-control/remote-control';
import { ProgramControl } from '../../program-panel/program-control';
import { ProgramPanelComponent } from '../../program-panel/program-panel.component';
import { RemoteDialogComponent } from '../remote-dialog/remote-dialog.component';

@Component({
  selector: 'app-presentation-menu',
  templateUrl: './presentation-menu.component.html',
  styleUrls: ['./presentation-menu.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [MatIcon, ProgramPanelComponent],
})
export class PresentationMenuComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private reveal = inject(RevealService);
  private presentationFile = inject(PresentationFileService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private remoteHost = inject(RemoteHost);

  readonly slideList = input<SlideList[]>();
  readonly program = input.required<ProgramControl>();

  private menu = viewChild.required<ElementRef<HTMLElement>>('menu');
  private panel = viewChild.required(ProgramPanelComponent);

  readonly isShowControls = this.reveal.isShowControls();
  readonly active = signal(false);
  readonly isFullscreen = signal(!!document.fullscreenElement);
  readonly hideMenu = signal(false);
  readonly isDownloading = signal(false);

  ngOnInit(): void {
    if (!this.slideList()?.length) {
      this.active.set(true);
    }

    fromEvent(document, 'fullscreenchange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isFullscreen.set(!!document.fullscreenElement));

    this.destroyRef.onDestroy(() => {
      // the body outlives the presentation
      document.body.classList.remove('hideMenu');
    });
  }

  ngAfterViewInit() {
    this.closeOnSlideChange();

    // an empty presentation starts with choosing songs
    if (this.active()) {
      this.panel().focusSearch();
    }
  }

  /** The remote in a window beside the presentation, for a second screen of the same computer. */
  openControlWindow() {
    const id = this.reveal.presentationId;

    // by its name the same window comes back to the front instead of a second one opening
    window.open(controlWindowUrl(id), `remote-control-${id}`, 'popup,width=1330,height=800');
  }

  openRemoteDevice() {
    this.remoteHost.openRoom();
    this.dialog.open(RemoteDialogComponent, { data: this.remoteHost });
  }

  toggleTheme() {
    this.reveal.setLight(!this.reveal.light());
  }

  async downloadSlides() {
    // the button stays enabled while the file is made, so it keeps the keyboard focus
    if (this.isDownloading()) {
      return;
    }

    this.isDownloading.set(true);

    try {
      await this.presentationFile.downloadPptx((this.slideList() ?? []).flatMap((song) => song.slides));
    } catch (error) {
      console.error('pptx generation', error);
      this.snackBar.open('Не атрымалася стварыць файл. Паспрабуйце яшчэ раз.', 'Зачыніць', { duration: 5000 });
    } finally {
      this.isDownloading.set(false);
    }
  }

  toggleMenu() {
    if (this.active()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.active.set(true);
  }

  closeMenu() {
    const menu = this.menu().nativeElement;

    // the arrows and the space bar go back to the slides
    if (document.activeElement instanceof HTMLElement && menu.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    this.active.set(false);
  }

  toggleShowIconMenu() {
    this.hideMenu.update((hidden) => !hidden);
    document.body.classList.toggle('hideMenu', this.hideMenu());
  }

  fullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  togglePause(): void {
    this.reveal.togglePause();
  }

  private enterFullscreen() {
    const element: any = document.documentElement;

    // Check which implementation is available
    const requestMethod =
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.webkitRequestFullScreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen;

    if (requestMethod) {
      requestMethod.apply(element);
    }
  }

  private closeOnSlideChange() {
    this.reveal
      .onSlideChange()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.active()) {
          this.closeMenu();
        }
      });
  }
}
