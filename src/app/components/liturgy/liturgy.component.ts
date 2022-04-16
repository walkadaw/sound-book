import {
  ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation,
} from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { Liturgy } from '../../interfaces/liturgy';

@Component({
  selector: 'app-liturgy',
  templateUrl: './liturgy.component.html',
  styleUrls: ['./liturgy.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiturgyComponent implements OnInit {
  liturgy$: Observable<Liturgy>;
  isLoading = true;

  constructor(
    private liturgyService: LiturgyService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.liturgy$ = this.liturgyService.getLiturgy().pipe(tap(() => {
      this.isLoading = false;
    }));
  }

  getTrustArticle(article: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(article);
  }
}
