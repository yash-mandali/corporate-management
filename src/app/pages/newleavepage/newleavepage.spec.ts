import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Newleavepage } from './newleavepage';

describe('Newleavepage', () => {
  let component: Newleavepage;
  let fixture: ComponentFixture<Newleavepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Newleavepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Newleavepage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
