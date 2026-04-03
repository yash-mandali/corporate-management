import { TestBed } from '@angular/core/testing';

import { Payrollservice } from './payrollservice';

describe('Payrollservice', () => {
  let service: Payrollservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Payrollservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
