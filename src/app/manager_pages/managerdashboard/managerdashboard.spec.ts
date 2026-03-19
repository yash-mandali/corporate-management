import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Managerdashboard } from './managerdashboard';

describe('Managerdashboard', () => {
  let component: Managerdashboard;
  let fixture: ComponentFixture<Managerdashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Managerdashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Managerdashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
