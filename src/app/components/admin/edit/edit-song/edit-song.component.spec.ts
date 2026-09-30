import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSongComponent } from './edit-song.component';

describe('EditSongComponent', () => {
  let fixture: ComponentFixture<EditSongComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EditSongComponent] }).compileComponents();

    fixture = TestBed.createComponent(EditSongComponent);
    element = fixture.nativeElement;
    fixture.componentInstance.registerOnChange(() => undefined);
    fixture.detectChanges();
  });

  it('should highlight the lines that will be saved as chords', async () => {
    fixture.componentInstance.writeValue('Am   G\nСнова вечер\n\nC\nИ опять');
    await fixture.whenStable();

    const lines = [...element.querySelectorAll('.highlight-line')].map((line) =>
      line.classList.contains('highlight-line_chords'));

    expect(lines).toEqual([true, false, false, true, false]);
    expect(element.querySelector('.textarea__line-counter')?.textContent).toMatch(/^♪ 1\.\n2\.\n3\.\n♪ 4\.\n5\./);
    expect(element.querySelector('#chord-line-summary')?.textContent).toContain('Распознано строк аккордов: 2');
  });
});
