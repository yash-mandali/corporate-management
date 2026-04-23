import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  constructor(private http: HttpClient) { }

  apiurl = environment.ApiUrl;
  loginApi = `${this.apiurl}/User/Login`;
  logoutApi = `${this.apiurl}/User/Logout`;
  addUserApi = `${this.apiurl}/User/AddUser`;
  updateUserApi = `${this.apiurl}/User/UpdateUser`;
  delateUserApi = `${this.apiurl}/User/DeleteUser`;
  getUserbyIdApi = `${this.apiurl}/User/getUserById`;
  getManagerTeamApi = `${this.apiurl}/User/getManagerTeam`;
  getAlluserApi = `${this.apiurl}/User/getAllUsers`;
  getAllEmployeeApi = `${this.apiurl}/User/getAllEmployee`;
  getAllEmployeeManagerHRApi = `${this.apiurl}/User/getAllEmployeeManagerHr`;
  getAllEmployeeManagerApi = `${this.apiurl}/User/getAllEmployeeManager`;
  getAllManagerApi = `${this.apiurl}/User/getAllManagers`;
  AssignManagerApi = `${this.apiurl}/User/assign-manager`;
  getemoployeeByDepartmentApi = `${this.apiurl}/User/getEmployeeByDepartment`;
  getnotificationsApi = `${this.apiurl}/user/getUsersNotifications`;
  markAsReadApi = `${this.apiurl}/user/MarkAsReadNotifications`;
  markAllAsReadApi = `${this.apiurl}/user/MarkAllasRead`;


  login(data: any) {
    return this.http.post(this.loginApi, data);
  }

  logout(userId: any) {
    return this.http.post(`${this.logoutApi}?userId=${userId}`, {})
  }

  signup(data: any) {
    return this.http.post(this.addUserApi, data);
  }

  addUser(data: any) {
    return this.http.post(this.addUserApi, data);
  }

  updateUser(data: any) {
    return this.http.put(this.updateUserApi, data);
  }

  deleteUser(userId: any) {
    return this.http.delete(`${this.delateUserApi}?id=${userId}`, {})
  }


  getAllUser() {
    return this.http.get<any[]>(this.getAlluserApi)
  }

  getAllEmployeeManagerHr() {
    return this.http.get<any[]>(this.getAllEmployeeManagerHRApi)
  }

  getAllEmployeeManager() {
    return this.http.get<any[]>(this.getAllEmployeeManagerApi)
  }

  getAllEmployee() {
    return this.http.get<any[]>(this.getAllEmployeeApi)
  }

  getAllManager() {
    return this.http.get<any[]>(this.getAllManagerApi)
  }


  getUserById(Id: number) {
    return this.http.get<any[]>(this.getUserbyIdApi, {
      params: { Id: Id.toString() }
    });
  }

  getManagerTeam(userId: number) {
    return this.http.get<any[]>(`${this.getManagerTeamApi}?managerId=${userId}`, {});
  }

  getEmployeeByDepartment(data: any) {
    return this.http.get<any[]>(this.getemoployeeByDepartmentApi, { params: data });
  }

  assignManager(employeeId: any, managerId: any) {
    return this.http.post(`${this.AssignManagerApi}?userId=${employeeId}&managerId=${managerId}`, {});
  }

  // ---------------notifications relaated service----------

  getNotifications(userId: number) {
    return this.http.get<any[]>(`${this.getnotificationsApi}?userId=${userId}`);
  }

  markAsRead(notificationId: number, userId: number) {
    return this.http.post(`${this.markAsReadApi}?notificationId=${notificationId}&UserId=${userId}`, {});
  }

  markAllAsRead(userId: number) {
    return this.http.put(`${this.markAllAsReadApi}?UserId=${userId}`, {});
  }

  // ------------------------forgot password section-----------------------

  sendEmailOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiurl}/User/SendForgotPasswordOtp?email=${email}`, {});
  }

  verifyEmailOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiurl}/User/VerifyForgotPasswordOtp?email=${email}&otp=${otp}`, {});
  }

  changePassword(email: string, newPassword: string, confirmPassword:string): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiurl}/User/changePassword`, { email: email, newPassword: newPassword, confirmPassword: confirmPassword });
  }

}
