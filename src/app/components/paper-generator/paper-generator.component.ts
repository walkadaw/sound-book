import { Component, OnInit } from '@angular/core';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-paper-generator',
  templateUrl: './paper-generator.component.html',
  styleUrls: ['./paper-generator.component.scss'],
})
export class PaperGeneratorComponent implements OnInit {
  songList: FormGroup;

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit() {
    this.songList = this.formBuilder.group({
      allSong: ['1', Validators.required],
      selectedSong: [''],
      chord: [true],
      showTag: [true],
      chastki: [false],
      gadzinki: [false],
    });
  }
}
