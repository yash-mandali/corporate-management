import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Managerleavepage } from './managerleavepage';

describe('Managerleavepage', () => {
  let component: Managerleavepage;
  let fixture: ComponentFixture<Managerleavepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Managerleavepage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Managerleavepage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
