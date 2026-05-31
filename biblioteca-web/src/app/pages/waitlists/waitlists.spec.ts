import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Waitlists } from './waitlists';

describe('Waitlists', () => {
  let component: Waitlists;
  let fixture: ComponentFixture<Waitlists>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Waitlists],
    }).compileComponents();

    fixture = TestBed.createComponent(Waitlists);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
