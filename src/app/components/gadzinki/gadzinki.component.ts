import { Component } from '@angular/core';
import { GADZINKI, GADZINKI_TITLE } from '../../constants/gadzinki';

@Component({
  selector: 'app-gadzinki',
  templateUrl: './gadzinki.component.html',
  styleUrls: ['./gadzinki.component.scss'],
})
export class GadzinkiComponent {
  protected readonly title = GADZINKI_TITLE;
  protected readonly sections = GADZINKI;
}
