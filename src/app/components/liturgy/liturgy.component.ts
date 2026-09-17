import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AsyncPipe } from '@angular/common';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { Liturgy } from '../../interfaces/liturgy';

@Component({
  selector: 'app-liturgy',
  templateUrl: './liturgy.component.html',
  styleUrls: ['./liturgy.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinner, AsyncPipe],
})
export class LiturgyComponent implements OnInit {
  private liturgyService = inject(LiturgyService);
  private sanitizer = inject(DomSanitizer);

  liturgy$: Observable<Liturgy>;
  isLoading = true;

  ngOnInit(): void {
    this.liturgy$ = this.liturgyService.getLiturgy().pipe(
      tap(() => {
        this.isLoading = false;
      }),
    );
  }

  getTrustArticle(article: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(article);
  }
}
