import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolioPopup } from './folio-popup';

describe('FolioPopup', () => {
  let component: FolioPopup;
  let fixture: ComponentFixture<FolioPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolioPopup],
    }).compileComponents();

    fixture = TestBed.createComponent(FolioPopup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
