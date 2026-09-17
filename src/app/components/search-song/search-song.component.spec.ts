import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTestStore } from '../../../testing/store-test-providers';

import { SearchSongComponent } from './search-song.component';

describe('SearchSongComponent', () => {
  let component: SearchSongComponent;
  let fixture: ComponentFixture<SearchSongComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchSongComponent],
      providers: [provideTestStore()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchSongComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
