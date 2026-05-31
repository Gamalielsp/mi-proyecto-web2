import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LibrarianDashboard } from './librarian-dashboard';

describe('LibrarianDashboard', () => {
  let component: LibrarianDashboard;
  let fixture: ComponentFixture<LibrarianDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibrarianDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(LibrarianDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
