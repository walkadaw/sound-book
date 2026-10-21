import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatOption, MatSelect } from '@angular/material/select';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { LiturgySectionComponent } from './liturgy-section/liturgy-section.component';

@Component({
  selector: 'app-liturgy',
  templateUrl: './liturgy.component.html',
  styleUrls: ['./liturgy.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [MatProgressSpinner, MatFormField, MatLabel, MatSelect, MatOption, LiturgySectionComponent],
})
export class LiturgyComponent {
  private liturgyService = inject(LiturgyService);

  // undefined until the request finishes, null when it failed
  protected liturgy = toSignal(this.liturgyService.getLiturgy());
  protected isLoading = computed(() => this.liturgy() === undefined);

  protected selectedIndex = signal(0);
  protected mass = computed(() => this.liturgy()?.[this.selectedIndex()]);
  protected hasChoice = computed(() => (this.liturgy()?.length ?? 0) > 1);
}
