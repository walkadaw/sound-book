import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

export const svgMatIcons = {
  'icon-fire': 'assets/icons/icon-fire.svg',
  'icon-eucharist': 'assets/icons/icon-eucharist.svg',
  'icon-glorification': 'assets/icons/icon-glorification.svg',
  'icon-worship': 'assets/icons/icon-worship.svg',
  'icon-pilgrim': 'assets/icons/icon-pilgrim.svg',
  'icon-maria': 'assets/icons/icon-maria.svg',
  'icon-christmas': 'assets/icons/icon-christmas.svg',
  'icon-fasting': 'assets/icons/icon-fasting.svg',
  'icon-easter': 'assets/icons/icon-easter.svg',
};

@Injectable({
  providedIn: 'root',
})
export class MatIconRegistryService {
  constructor(private matIconRegistry: MatIconRegistry, private sanitizer: DomSanitizer) {}

  register(): Promise<void> {
    return new Promise<void>((resolve) => {
      Object.keys(svgMatIcons).forEach((iconName) => {
        this.matIconRegistry.addSvgIcon(iconName, this.sanitizer.bypassSecurityTrustResourceUrl(svgMatIcons[iconName]));
      });
      resolve();
    });
  }
}
