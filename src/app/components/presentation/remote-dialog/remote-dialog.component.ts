import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { encode } from 'uqr';
import { remoteUrl } from '../../../services/remote-control/remote-control';
import { RemoteHost } from '../../../services/remote-control/remote-host.service';

/** Connects one other device as the remote: by the QR code, or by the link where there is no camera. */
@Component({
  selector: 'app-remote-dialog',
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle, MatIcon],
  templateUrl: './remote-dialog.component.html',
  styleUrl: './remote-dialog.component.scss',
})
export class RemoteDialogComponent {
  readonly host = inject<RemoteHost>(MAT_DIALOG_DATA);

  private linkInput = viewChild<ElementRef<HTMLInputElement>>('link');

  readonly copied = signal(false);
  readonly connected = computed(() => this.host.devices() > 0);
  readonly url = computed(() => {
    const roomId = this.host.roomId();

    return roomId ? remoteUrl(roomId) : null;
  });

  readonly qr = computed(() => {
    const url = this.url();

    if (!url) {
      return null;
    }

    const { size, data } = encode(url, { border: 2 });
    // one unit square per dark module
    const path = data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))).join('');

    return { size, path };
  });

  async copy() {
    const url = this.url();

    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 3000);
    } catch {
      // without clipboard access the link is at least ready to copy by hand
      this.linkInput()?.nativeElement.select();
    }
  }
}
