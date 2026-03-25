import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HrEmployeesPage } from './hr-employees';

describe('HrEmployeesPage', () => {
  let component: HrEmployeesPage;
  let fixture: ComponentFixture<HrEmployeesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrEmployeesPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HrEmployeesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
