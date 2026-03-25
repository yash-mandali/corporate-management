import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrLeave } from './hr-leave';

describe('HrLeave', () => {
  let component: HrLeave;
  let fixture: ComponentFixture<HrLeave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrLeave]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HrLeave);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
