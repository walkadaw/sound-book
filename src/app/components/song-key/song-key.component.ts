import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-song-key',
  templateUrl: './song-key.component.html',
  styleUrls: ['./song-key.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon],
})
export class SongKeyComponent {
  readonly selectedTranspilation = model(0);

  transpilation(transpilation: number) {
    this.selectedTranspilation.update((current) => Math.min(11, Math.max(-11, current + transpilation)));
  }

  reset() {
    this.selectedTranspilation.set(0);
  }
}
