import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Backbtn } from './backbtn';

describe('Backbtn', () => {
  let component: Backbtn;
  let fixture: ComponentFixture<Backbtn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Backbtn]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Backbtn);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
