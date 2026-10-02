import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTestStore } from '../../../testing/store-test-providers';
import { Song } from '../../interfaces/song';
import { GeneratorService } from '../../services/generator-service/generator.service';
import { SongService } from '../../services/song-service/song.service';

import { PaperGeneratorComponent } from './paper-generator.component';

const songs = [
  { id: 1, title: 'Ave Maria', text: 'Ave', chord: '', tag: { 6: 1 } },
  { id: 2, title: 'Бог ёсць любоў', text: '1. Бог\n\nЛюбоў\n\n3. Ёсць', chord: '', tag: {} },
  { id: 3, title: 'Святы', text: 'Святы', chord: '', tag: { 10: 1 } },
] as unknown as Song[];

describe('PaperGeneratorComponent', () => {
  let fixture: ComponentFixture<PaperGeneratorComponent>;
  let element: HTMLElement;
  let downloadDocx: ReturnType<typeof vi.fn>;

  const button = (text: string) =>
    [...element.querySelectorAll('button')].find((item) => item.textContent?.includes(text)) as HTMLButtonElement;

  beforeEach(async () => {
    downloadDocx = vi.fn().mockResolvedValue({ pages: 12 });

    await TestBed.configureTestingModule({
      imports: [PaperGeneratorComponent],
      providers: [
        provideTestStore(),
        provideHttpClient(),
        provideRouter([]),
        { provide: GeneratorService, useValue: { downloadDocx } },
      ],
    }).compileComponents();

    TestBed.inject(SongService).setSong({ songs, last_update: '0', hash: '' });
    fixture = TestBed.createComponent(PaperGeneratorComponent);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('should print every song except the parts of the mass by default', async () => {
    button('Спампаваць').click();
    await fixture.whenStable();

    const [printed, partsOfMass, options] = downloadDocx.mock.calls[0];
    expect(printed.map((song: Song) => song.id)).toEqual([1, 2]);
    expect(partsOfMass.map((song: Song) => song.id)).toEqual([3]);
    expect(options).toEqual({
      showChords: true,
      showTags: true,
      repeatChoruses: true,
      addPartsOfMass: false,
      addGadzinki: false,
      toc: true,
      notesPages: 4,
      title: '',
      subtitle: '',
    });
    expect(element.textContent).toContain('каля 12 старонак');
  });

  it('should print only the selected songs and disable download without any', async () => {
    button('Выбраць (0)').click();
    await fixture.whenStable();

    expect(button('Спампаваць').disabled).toBe(true);
    expect(element.textContent).not.toContain('Святы');

    button('Выбраць знойдзеныя').click();
    await fixture.whenStable();
    (element.querySelectorAll('.song-row input')[0] as HTMLInputElement).click();
    await fixture.whenStable();

    button('Спампаваць').click();
    await fixture.whenStable();

    expect(downloadDocx.mock.calls[0][0].map((song: Song) => song.id)).toEqual([2]);
  });
});
