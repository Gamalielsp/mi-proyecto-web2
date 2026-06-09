import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveLoans } from './active-loans';

describe('ActiveLoans', () => {
  let component: ActiveLoans;
  let fixture: ComponentFixture<ActiveLoans>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveLoans],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveLoans);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
