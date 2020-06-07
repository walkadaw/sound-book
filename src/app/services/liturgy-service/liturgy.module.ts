import { NgModule } from '@angular/core';
import { LiturgyService } from './liturgy.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [HttpClientModule],
  providers: [LiturgyService],
})
export class LiturgyModule {}
