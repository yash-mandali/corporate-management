import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LeaveService {
  constructor(private http: HttpClient) { }

  apiurl = environment.ApiUrl;
  getAllLeavesApi = `${this.apiurl}/Leave/GetAllLeaves`;
  ApplyleaveApi = `${this.apiurl}/Leave/ApplyLeave`;
  updateleaveApi = `${this.apiurl}/Leave/updateLeave`;
  getmyleavesApi = `${this.apiurl}/Leave/getMyLeaves`;
  getleaveByIdApi = `${this.apiurl}/Leave/getleaveById`;
  withdrawleaveApi = `${this.apiurl}/Leave/withdrawLeave`;
  getAllpendingLeavesApi = `${this.apiurl}/Leave/GetAllPendingLeaves`;
  approveleaveApi = `${this.apiurl}/Leave/Approve-Leave`;
  rejectleaveApi = `${this.apiurl}/Leave/Reject-Leave`;

  createNewLeave(data: any) {
    return this.http.post<any>(this.ApplyleaveApi, data);
  }

  // Matches sp_UpdateLeave — only updates Pending leaves
  updateLeave(leaveId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.updateleaveApi}/${leaveId}`, data);
  }

  Withdrawleave(leaveRequestId: number) {
    return this.http.put(`${this.withdrawleaveApi}/${leaveRequestId}`, {});
  }

  getMyleaveList(Id: number) {
    return this.http.get<any[]>(this.getmyleavesApi, {
      params: { Id: Id.toString() }
    });
  }
}