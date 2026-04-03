import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PayrollService {

  private api = `${environment.ApiUrl}/Payroll`;

  constructor(private http: HttpClient) { }

  getAllSalaryStructure() {
    return this.http.get<any>(`${this.api}/GetAllSalaryStructure`);
  }


  getSalaryStructureByUserId(userId: number) {
    return this.http.get<any>(`${this.api}/GetSalaryStructureByUserId?userId=${userId}`);
  }

  createSalaryStructure(data: { userId: number; basicSalary: number; otherAllowance: number }) {
    return this.http.post<any>(`${this.api}/createSalaryStructure`, data);
  }

  updateSalaryStructure(data: { salaryStructureId: number; basicSalary: number; otherAllowance: number }) {
    return this.http.put<any>(`${this.api}/updateSalaryStructure`, data);
  }


  deleteSalaryStructure(salaryStructureId: number) {
    return this.http.delete<any>(`${this.api}/deleteSalaryStructure?SalaryStructureId=${salaryStructureId}`);
  }


  getAllPayrollByMonth(month: number) {
    return this.http.get<any>(`${this.api}/getAllPayrollByMonth?month=${month}`);
  }


  getPayrollByUserId(userId: number) {
    return this.http.get<any>(`${this.api}/getPayrollbyUserId?userId=${userId}`);
  }


  getPayrollByPayrollId(payrollId: number) {
    return this.http.get<any>(`${this.api}/getPayrollbyPayrollId?PayrollId=${payrollId}`);
  }


  generatePayroll(data: { userId: number; month: number; year: number; taxDeduction: number }) {
    return this.http.post<any>(`${this.api}/generatePayroll`, data);
  }

  generateAllPayroll(month: number, year: number) {
    return this.http.post<any>(`${this.api}/generate-All-Payroll?month=${month}&year=${year}`, {});
  }


  deletePayroll(payrollId: number) {
    return this.http.delete<any>(`${this.api}/deletePayroll?PayrollId=${payrollId}`);
  }
}