import { Component, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RemoteDotsComponent } from '../remote-dots/remote-dots.component';
import { RemoteNextComponent } from '../remote-next/remote-next.component';
import { RemoteNotesComponent } from '../remote-notes/remote-notes.component';
import { RemoteSession } from '../remote-session.service';
import { RemoteStatusComponent } from '../remote-status/remote-status.component';
import { SlidePreviewComponent } from '../slide-preview/slide-preview.component';

/** The phone's main tab: what is on the screen and the buttons to move on. */
@Component({
  selector: 'app-remote-deck',
  imports: [
    MatButton,
    MatIconButton,
    MatIcon,
    RemoteDotsComponent,
    RemoteNextComponent,
    RemoteNotesComponent,
    RemoteStatusComponent,
    SlidePreviewComponent,
  ],
  templateUrl: './remote-deck.component.html',
  styleUrl: './remote-deck.component.scss',
})
export class RemoteDeckComponent {
  protected session = inject(RemoteSession);
}
