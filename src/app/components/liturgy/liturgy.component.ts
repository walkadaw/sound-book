import { Component, OnInit } from '@angular/core';
import { Liturgy } from '../../interfaces/liturgy';
import { LiturgyService } from '../../services/liturgy-service/liturgy.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-liturgy',
  templateUrl: './liturgy.component.html',
  styleUrls: ['./liturgy.component.scss'],
})
export class LiturgyComponent implements OnInit {
  liturgy$: Observable<Liturgy>;
  constructor(private liturgyService: LiturgyService) {}

  ngOnInit(): void {
    this.liturgy$ = this.liturgyService.getLiturgy();
  }
}
