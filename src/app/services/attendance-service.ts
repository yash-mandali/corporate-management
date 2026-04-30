import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  constructor(private http: HttpClient) { }
  apiurl = environment.ApiUrl;
  checkInApi = `${this.apiurl}/Attendance/CheckIn`;
  checkOutApi = `${this.apiurl}/Attendance/CheckOut`;
  AutoCheckOutApi = `${this.apiurl}/Attendance/AutoCheckout`;
  getAllAttendanceApi = `${this.apiurl}/Attendance/GetAllAttendance`; //for Admin
  getTeamAllAttendanceApi = `${this.apiurl}/Attendance/GetTeamAllAttendance`; //for manager
  getByUserId = `${this.apiurl}/Attendance/getByUserId`;
  getByAttendanceId = `${this.apiurl}/Attendance/getByAttendanceId`;
  exportAttendanceReportApi = `${this.apiurl}/Attendance/ExportAttendanceReport`;

  checkIn(Id: number) {
    return this.http.post<any>(`${this.checkInApi}?Id=${Id}`, {});
  }

  checkOut(AId: number) {
    return this.http.put<any>(`${this.checkOutApi}?AId=${AId}`, { AId })
  }

  getByUID(Id: number) {
    return this.http.get<any[]>(this.getByUserId, {
      params: { Id: Id.toString() }
    })
  }

  autoCheckout() {
    return this.http.put<any>(this.AutoCheckOutApi, {});
  }

  getByAID(Id: number) {
    return this.http.get<any[]>(this.getByAttendanceId, {
      params: { Id: Id.toString() }
    })
  }

  getAllattendance() {
    return this.http.get<any[]>(this.getAllAttendanceApi)
  }

  getTeamAllattendance(managerId: number) {
    return this.http.get<any[]>(`${this.getTeamAllAttendanceApi}?managerId=${managerId}`, {});
  }

  exportAttendanceReport(fromDate: string, toDate: string, userId?: number, department?: string) {
    let params: any = {
      FromDate: fromDate,
      ToDate: toDate
    };

    if (userId) params.UserId = userId;
    if (department) params.Department = department;

    return this.http.get(
      `${this.exportAttendanceReportApi}`,
      {
        params: params,
        responseType: 'blob'
      }
    );
  }

}
