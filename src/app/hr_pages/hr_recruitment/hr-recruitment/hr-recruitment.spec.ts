import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrRecruitment } from './hr-recruitment';

describe('HrRecruitment', () => {
  let component: HrRecruitment;
  let fixture: ComponentFixture<HrRecruitment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrRecruitment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HrRecruitment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
