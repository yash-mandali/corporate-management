import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Timesheetpage } from './timesheetpage';

describe('Timesheetpage', () => {
  let component: Timesheetpage;
  let fixture: ComponentFixture<Timesheetpage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Timesheetpage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Timesheetpage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
