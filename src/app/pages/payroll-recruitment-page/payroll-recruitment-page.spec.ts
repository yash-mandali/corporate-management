import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayrollRecruitmentPage } from './payroll-recruitment-page';

describe('PayrollRecruitmentPage', () => {
  let component: PayrollRecruitmentPage;
  let fixture: ComponentFixture<PayrollRecruitmentPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollRecruitmentPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayrollRecruitmentPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
