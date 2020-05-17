import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PaperGeneratorComponent } from './paper-generator.component';

describe('PaperGeneratorComponent', () => {
  let component: PaperGeneratorComponent;
  let fixture: ComponentFixture<PaperGeneratorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PaperGeneratorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PaperGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
