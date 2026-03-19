import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Teamperformance } from './teamperformance';

describe('Teamperformance', () => {
  let component: Teamperformance;
  let fixture: ComponentFixture<Teamperformance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teamperformance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Teamperformance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
