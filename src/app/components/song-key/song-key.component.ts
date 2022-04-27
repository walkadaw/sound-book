import {
  ChangeDetectionStrategy,
  Component, EventEmitter, Input, Output,
} from '@angular/core';

@Component({
  selector: 'app-song-key',
  templateUrl: './song-key.component.html',
  styleUrls: ['./song-key.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongKeyComponent {
  @Input() selectedTranspilation = 0;
  @Output() selectedTranspilationChange = new EventEmitter<number>();

  transpilation(transpilation: number) {
    this.selectedTranspilation += transpilation;

    if (this.selectedTranspilation > 11) {
      this.selectedTranspilation = 11;
    } else if (this.selectedTranspilation < -11) {
      this.selectedTranspilation = -11;
    }

    this.selectedTranspilationChange.next(this.selectedTranspilation);
  }

  reset() {
    this.selectedTranspilation = 0;
    this.selectedTranspilationChange.next(this.selectedTranspilation);
  }
}
