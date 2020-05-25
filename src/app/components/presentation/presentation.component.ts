import { Component, OnInit, ViewEncapsulation, AfterViewInit, HostBinding } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PresentationMenuComponent } from './presentation-menu/presentation-menu.component';
declare const Reveal;

@Component({
  selector: 'app-presentation',
  templateUrl: './presentation.component.html',
  styleUrls: [
    './presentation.component.scss',
    '../../../assets/css/reveal.scss',
    '../../../assets/css/theme/blood.css',
  ],
  encapsulation: ViewEncapsulation.None,
})
export class PresentationComponent implements AfterViewInit {
  document = document;
  activeMenu = false;

  constructor(private dialog: MatDialog) {}

  ngAfterViewInit(): void {
    this.initReveal();
  }

  fullScreen() {
    this.document.fullscreenElement ? this.document.exitFullscreen() : Reveal.enterFullscreen();
  }

  toggleMenu() {
    this.activeMenu = !this.activeMenu;
  }

  toggleShowMenu() {
    this.document.body.classList.toggle('hideMenu');
  }

  changeTheme() {
    this.document.body.classList.toggle('white');
  }

  togglePause(): void {
    Reveal.togglePause();
  }

  isSpeakerNotes(): boolean {
    return Reveal.isSpeakerNotes();
  }

  private initReveal() {
    setInterval(() => {
      Reveal.initialize({
        controls: true,
        progress: false,
        center: true,
        hash: false,

        transition: 'none',
        // transitionSpeed: 'slow',
        // backgroundTransition: 'slide'

        // The "normal" size of the presentation, aspect ratio will be preserved
        // when the presentation is scaled to fit different resolutions. Can be
        // specified using percentage units.
        // 16:9
        width: 1050,
        height: 590,

        // Factor of the display size that should remain empty around the content
        margin: 0.025,

        // Exposes the reveal.js API through window.postMessage
        postMessage: true,

        // Dispatches all reveal.js events to the parent window through postMessage
        postMessageEvents: false,
        // More info https://github.com/hakimel/reveal.js#dependencies
        dependencies: [
          // Speaker notes
          { src: '../../../assets/plugin/notes/notes.js', async: true },
        ],
      });
    }, 500);
  }
}
