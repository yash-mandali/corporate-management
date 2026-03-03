import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  
  constructor(private http: HttpClient) { }
  
  apiurl = environment.ApiUrl;
  loginApi = `${this.apiurl}/User/Login`;
  signupApi = `${this.apiurl}/User/AddUser`;

  login(data: any) {
    return this.http.post(this.loginApi, data);
  }

  signup(data: any) {
    return this.http.post(this.signupApi, data);
  } 
}
