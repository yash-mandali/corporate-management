import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAttendanceManagement } from './admin-attendance-management';

describe('AdminAttendanceManagement', () => {
  let component: AdminAttendanceManagement;
  let fixture: ComponentFixture<AdminAttendanceManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAttendanceManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAttendanceManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
