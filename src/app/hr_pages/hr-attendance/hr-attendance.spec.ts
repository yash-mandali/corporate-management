import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrAttendancePage } from './hr-attendance';

describe('HrAttendance', () => {
  let component: HrAttendancePage;
  let fixture: ComponentFixture<HrAttendancePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrAttendancePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HrAttendancePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
