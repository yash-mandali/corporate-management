import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrPayroll } from './hr-payroll';

describe('HrPayroll', () => {
  let component: HrPayroll;
  let fixture: ComponentFixture<HrPayroll>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrPayroll]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HrPayroll);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
