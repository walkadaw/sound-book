import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RemoteDotsComponent } from '../remote-dots/remote-dots.component';
import { RemoteNextComponent } from '../remote-next/remote-next.component';
import { RemoteNotesComponent } from '../remote-notes/remote-notes.component';
import { RemoteSession } from '../remote-session.service';
import { RemoteStatusComponent } from '../remote-status/remote-status.component';
import { SlidePreviewComponent } from '../slide-preview/slide-preview.component';

/** The phone's main tab: what is on the screen, what comes next and the notes. */
@Component({
  selector: 'app-remote-deck',
  imports: [
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
