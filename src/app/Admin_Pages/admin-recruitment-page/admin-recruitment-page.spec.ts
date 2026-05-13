import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRecruitmentPage } from './admin-recruitment-page';

describe('AdminRecruitmentPage', () => {
  let component: AdminRecruitmentPage;
  let fixture: ComponentFixture<AdminRecruitmentPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRecruitmentPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminRecruitmentPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
