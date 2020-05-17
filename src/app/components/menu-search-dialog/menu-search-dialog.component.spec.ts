import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuSearchDialogComponent } from './menu-search-dialog.component';

describe('MenuSearchDialogComponent', () => {
  let component: MenuSearchDialogComponent;
  let fixture: ComponentFixture<MenuSearchDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MenuSearchDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuSearchDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
