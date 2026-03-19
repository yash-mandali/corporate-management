import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Managerattendance } from './managerattendance';

describe('Managerattendance', () => {
  let component: Managerattendance;
  let fixture: ComponentFixture<Managerattendance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Managerattendance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Managerattendance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
