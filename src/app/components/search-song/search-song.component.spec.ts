import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SearchSongComponent } from './search-song.component';

describe('SearchSongComponent', () => {
  let component: SearchSongComponent;
  let fixture: ComponentFixture<SearchSongComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [SearchSongComponent],
})
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchSongComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
