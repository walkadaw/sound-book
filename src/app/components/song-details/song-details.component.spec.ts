import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideTestStore } from '../../../testing/store-test-providers';
import { Song } from '../../interfaces/song';
import { SongService } from '../../services/song-service/song.service';

import { SongDetailsComponent } from './song-details.component';

const SONG: Song = {
  id: 22,
  songId: 20,
  title: 'БЕЗ ЦЯБЕ',
  text: '1. Ты даў мне сонца\n\nПрыпеў:\nА без Цябе\n\nБрыдж:\nО-о-о',
  chord: 'd C\n\n\nB♭maj7 C',
  tag: {},
};

describe('SongDetailsComponent', () => {
  let component: SongDetailsComponent;
  let fixture: ComponentFixture<SongDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongDetailsComponent],
      providers: [
        provideTestStore(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '22' })) } },
      ],
    }).compileComponents();

    const songService = TestBed.inject(SongService);
    vi.spyOn(songService, 'getSong').mockReturnValue(SONG);
    vi.spyOn(songService, 'hasSong').mockReturnValue(true);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SongDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mark the refrain and the bridge and hide their labels', () => {
    const lines: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.line'));
    const text = lines.map((line) => line.querySelector('.text')?.textContent?.trim());

    expect(text).toEqual(['1. Ты даў мне сонца', '', 'А без Цябе', '', 'О-о-о']);
    expect(lines[2].classList).toContain('chorus');
    expect(lines[4].classList).toContain('bridge');
    expect(lines[0].classList).not.toContain('chorus');
  });
});
