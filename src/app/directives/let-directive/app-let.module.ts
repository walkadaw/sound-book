import { NgModule } from '@angular/core';
import { LetDirective } from './app-let.directive';

@NgModule({
  declarations: [LetDirective],
  exports: [LetDirective],
})
export class LetDirectiveModule {}
