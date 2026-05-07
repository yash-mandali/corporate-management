import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerSalarypayrollPage } from './manager-salarypayroll-page';

describe('ManagerSalarypayrollPage', () => {
  let component: ManagerSalarypayrollPage;
  let fixture: ComponentFixture<ManagerSalarypayrollPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerSalarypayrollPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerSalarypayrollPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
