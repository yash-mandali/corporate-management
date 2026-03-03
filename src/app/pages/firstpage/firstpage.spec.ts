import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Firstpage } from './firstpage';

describe('Firstpage', () => {
  let component: Firstpage;
  let fixture: ComponentFixture<Firstpage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Firstpage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Firstpage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
