import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { LiturgyService } from './liturgy.service';

@NgModule({
  imports: [HttpClientModule],
  providers: [LiturgyService],
})
export class LiturgyModule {}
