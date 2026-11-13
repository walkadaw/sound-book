import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
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
  imports: [MatButton, MatProgressSpinner, MatFormField, MatLabel, MatSelect, MatOption, LiturgySectionComponent],
})
export class LiturgyComponent {
  private liturgyService = inject(LiturgyService);

  // never fails: the service answers null when there is nothing for today
  protected liturgy = rxResource({ stream: () => this.liturgyService.getLiturgy() });

  protected selectedIndex = signal(0);
  protected mass = computed(() => this.liturgy.value()?.[this.selectedIndex()]);
  protected hasChoice = computed(() => (this.liturgy.value()?.length ?? 0) > 1);
}
