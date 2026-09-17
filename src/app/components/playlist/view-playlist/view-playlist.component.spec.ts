import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTestStore } from '../../../../testing/store-test-providers';
import { PageNotFoundComponent } from '../../page-not-found/page-not-found.component';

import { ViewPlaylistComponent } from './view-playlist.component';

describe('ViewPlaylistComponent', () => {
  let component: ViewPlaylistComponent;
  let fixture: ComponentFixture<ViewPlaylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewPlaylistComponent],
      providers: [provideTestStore(), provideRouter([{ path: '404', component: PageNotFoundComponent }])],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewPlaylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
