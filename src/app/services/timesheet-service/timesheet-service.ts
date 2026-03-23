import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TimesheetService {

  constructor(private http: HttpClient) { }

  apiurl = environment.ApiUrl;

  addEntryApi = `${this.apiurl}/Timesheet/AddTimesheetEntry`;
  updateEntryApi = `${this.apiurl}/Timesheet/updateTimesheetEntry`;
  getentrybyidapi = `${this.apiurl}/Timesheet/getTimesheetEntryById`;
  getentrybyuseridapi = `${this.apiurl}/Timesheet/getTimesheetEntryByUserId`;
  getallEntryApi = `${this.apiurl}/Timesheet/GetAlltimesheets`;
  managerTeamGetallEntryApi = `${this.apiurl}/Timesheet/manager-GetAlltimesheets`;
  deleteEntryApi = `${this.apiurl}/Timesheet/DeleteTimesheet`;
  submitEntryApi = `${this.apiurl}/Timesheet/submitTimesheet`;
  managerApproveEntryApi = `${this.apiurl}/Timesheet/ManagerApproveT`;  //manager
  managerRejectEntryApi = `${this.apiurl}/Timesheet/ManagerRejectT`;   //manager
  getEntryByStatusApi = `${this.apiurl}/Timesheet/getByStatus(manager)`;   //manager

  getAllEntry() {
    return this.http.get<any[]>(this.getallEntryApi);
  }

  getTeamAllEntry(managerId: number) {
    return this.http.get<any[]>(`${this.managerTeamGetallEntryApi}?managerId=${managerId}`, {});
  }

  addEntry(data: any) {
    return this.http.post<any>(this.addEntryApi, data);
  }

  updateEntry(data: any) {
    return this.http.put<any>(this.updateEntryApi, data);
  }

  getEntryById(sheetId: number) {
    const params = new HttpParams().set('sheetId', sheetId);
    return this.http.get<any>(this.getentrybyidapi, { params });
  }

  getEntryByUserId(userId: number) {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<any[]>(this.getentrybyuseridapi, { params });
  }

  deleteEntry(sheetId: number) {
    const params = new HttpParams().set('sheetId', sheetId);
    return this.http.delete<any>(this.deleteEntryApi, { params });
  }

  submitEntry(sheetId: number) {
    return this.http.post<any>(
      `${this.submitEntryApi}?sheetId=${sheetId}`,
      {}
    );
  }

  // -----------------------------Manager services-----------------------

  managerApproveEntry(sheetId: number) {
    return this.http.put<any>(`${this.managerApproveEntryApi}?sheetId=${sheetId}`, {});
  } 

  managerRejectEntry(sheetId: number, rejectReason: string) {
    return this.http.put<any>(`${this.managerRejectEntryApi}?sheetId=${sheetId}&reason=${rejectReason}`, { sheetId, rejectReason });
  }
// ?sheetId = 13 & reason=from % 20swagger'
  getEntryByStatus(status: string) {
    const params = new HttpParams().set('status', status);
    return this.http.get<any[]>(this.getEntryByStatusApi, { params });
  }
}