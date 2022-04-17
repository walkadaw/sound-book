import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ChordComponent } from './chord.component';

@NgModule({
  declarations: [ChordComponent],
  exports: [ChordComponent],
  imports: [CommonModule],
})
export class ChordModule { }
