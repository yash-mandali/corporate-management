import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLeaveManagement } from './admin-leave-management';

describe('AdminLeaveManagement', () => {
  let component: AdminLeaveManagement;
  let fixture: ComponentFixture<AdminLeaveManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLeaveManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLeaveManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
