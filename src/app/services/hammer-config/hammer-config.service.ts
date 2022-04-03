import { Injectable } from '@angular/core';
import { HammerGestureConfig } from '@angular/platform-browser';
import { DIRECTION_HORIZONTAL } from 'hammerjs';

@Injectable()
export class HammerConfig extends HammerGestureConfig {
  override overrides = {
    swipe: { enable: true, direction: DIRECTION_HORIZONTAL },
  };
}
