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
  signupApi = `${this.apiurl}/User/AddUser`;
  updateApi = `${this.apiurl}/User/UpdateUser`;
  getUserbyIdApi = `${this.apiurl}/User/getUserById`;
  getManagerTeamApi = `${this.apiurl}/User/getManagerTeam`;
  getAlluserApi = `${this.apiurl}/User/getAllUsers`;
  getAllEmployeeApi = `${this.apiurl}/User/getAllEmployee`;
  getAllManagerApi = `${this.apiurl}/User/getAllManagers`;


  login(data: any) {
    return this.http.post(this.loginApi, data);
  }

  logout(userId: any) {
    return this.http.post(`${this.logoutApi}?userId=${userId}`,{})
  }

  signup(data: any) {
    return this.http.post(this.signupApi, data);
  }

  updateUser(data: any) {
    return this.http.put(this.updateApi, data);
  }


  getAllUser() {
    return this.http.get<any[]>(this.getAlluserApi)
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
// /User/getManagerTeam ? managerId = 20
}
