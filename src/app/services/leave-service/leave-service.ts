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
  getTeamAllLeavesApi = `${this.apiurl}/Leave/managerTeam-AllLeaves`;
  ApplyleaveApi = `${this.apiurl}/Leave/ApplyLeave`;
  updateleaveApi = `${this.apiurl}/Leave/updateLeave`;
  getmyleavesApi = `${this.apiurl}/Leave/getMyLeaves`;
  getleaveByIdApi = `${this.apiurl}/Leave/getleaveById`;
  withdrawleaveApi = `${this.apiurl}/Leave/withdrawLeave`;
  getAllpendingLeavesApi = `${this.apiurl}/Leave/GetAllPendingLeaves`;
  getManagerApprovedLeavesApi = `${this.apiurl}/Leave/GetManagerApprovedLeaves`; //HR
  getManagerTeamPendingLeaves = `${this.apiurl}/Leave/managerteam-pendingleaves`;
  managerApproveleaveApi = `${this.apiurl}/Leave/ManagerApproveLeave`;  //manager 
  HrApproveleaveApi = `${this.apiurl}/Leave/HrApproveLeave`;  //HR
  managerRejectleaveApi = `${this.apiurl}/Leave/ManagerRejectLeave`;  //manager
  HrRejectleaveApi = `${this.apiurl}/Leave/HrRejectLeave`;  //HR
  AutoRejectLeaveApi = `${this.apiurl}/Leave/AutoRejectLeave`;  //manager

  // /Hr/GetManagerApprovedLeaves


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

  getAllLeaves() {
    return this.http.get<any[]>(this.getAllLeavesApi)
  }

  getTeamAllleaves(managerId: number) {
    return this.http.get<any[]>(`${this.getTeamAllLeavesApi}?managerId=${managerId}`, {});
  }

  getAllpendingleaves() {
    return this.http.get<any[]>(this.getAllpendingLeavesApi)
  }

  getTeamAllPendingleaves(managerId: number) {
    return this.http.get<any[]>(`${this.getManagerTeamPendingLeaves}?managerId=${managerId}`, {});
  }


  getMyleaveList(Id: number) {
    return this.http.get<any[]>(this.getmyleavesApi, {
      params: { Id: Id.toString() }
    });
  }
  // ----------------

  getmanagerApprovedleaves() {
    return this.http.get<any[]>(this.getManagerApprovedLeavesApi)
  }

  managerApproveleave(leaveRequestId: number) {
    return this.http.put(`${this.managerApproveleaveApi}?Id=${leaveRequestId}`, {})
  }

  HrApproveleave(leaveRequestId: number) {
    return this.http.put(`${this.HrApproveleaveApi}?Id=${leaveRequestId}`, {})
  }

  managerRejectleave(leaveRequestId: number) {
    return this.http.put(`${this.managerRejectleaveApi}?Id=${leaveRequestId}`, {})
  }

  HrRejectleave(leaveRequestId: number) {
    return this.http.put(`${this.HrRejectleaveApi}?Id=${leaveRequestId}`, {})
  }

  autorejectLeave() {
    return this.http.put<any>(this.AutoRejectLeaveApi, {});
  }
  
}