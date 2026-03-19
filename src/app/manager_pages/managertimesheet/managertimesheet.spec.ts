import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Managertimesheet } from './managertimesheet';

describe('Managertimesheet', () => {
  let component: Managertimesheet;
  let fixture: ComponentFixture<Managertimesheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Managertimesheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Managertimesheet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
