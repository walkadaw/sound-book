import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';

@Component({
  selector: 'app-liturgy',
  templateUrl: './liturgy.component.html',
  styleUrls: ['./liturgy.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinner],
})
export class LiturgyComponent {
  private liturgyService = inject(LiturgyService);

  // undefined until the request finishes, null when it failed
  protected liturgy = toSignal(this.liturgyService.getLiturgy());
  protected isLoading = computed(() => this.liturgy() === undefined);
}
