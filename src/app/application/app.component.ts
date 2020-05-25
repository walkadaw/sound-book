import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  isModePresentation: boolean;

  constructor(private location: Location) {}

  ngOnInit() {
    this.location.onUrlChange((url) => (this.isModePresentation = url.startsWith('/presentation')));
  }
}
