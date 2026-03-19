import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Managerteamspage } from './managerteamspage';

describe('Managerteamspage', () => {
  let component: Managerteamspage;
  let fixture: ComponentFixture<Managerteamspage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Managerteamspage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Managerteamspage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
