import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPayrollPage } from './admin-payroll-page';

describe('AdminPayrollPage', () => {
  let component: AdminPayrollPage;
  let fixture: ComponentFixture<AdminPayrollPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPayrollPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPayrollPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
