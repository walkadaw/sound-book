import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RemoteSession } from '../remote-session.service';
import { RemoteStatusComponent } from '../remote-status/remote-status.component';
import { SlidePreviewComponent } from '../slide-preview/slide-preview.component';

/** The middle of a wide remote: the slide on the screen, large, with the buttons under it. */
@Component({
  selector: 'app-remote-stage',
  imports: [MatButton, MatIcon, RemoteStatusComponent, SlidePreviewComponent],
  templateUrl: './remote-stage.component.html',
  styleUrl: './remote-stage.component.scss',
})
export class RemoteStageComponent {
  protected session = inject(RemoteSession);
}
