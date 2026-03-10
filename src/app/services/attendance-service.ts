import { HttpClient } from '@angular/common/http';
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
  getAllAttendance = `${this.apiurl}/Attendance/GetAllAttendance`;
  getByUserId = `${this.apiurl}/Attendance/getByUserId`;
  getByAttendanceId = `${this.apiurl}/Attendance/getByAttendanceId`;

  checkIn(Id: number) {
    return this.http.post<any>(`${this.checkInApi}?Id=${Id}`, {});
  }

  checkOut(AId: number) {
    return this.http.put<any>(`${this.checkOutApi}?AId=${AId}`, {AId})
  }

  getByUID(Id: number) {
    return this.http.get<any[]>(this.getByUserId, {
      params: { Id: Id.toString() }
    })
  }
  
  getByAID(Id: number) {
    return this.http.get<any[]>(this.getByAttendanceId, {
      params:{Id:Id.toString()}
    })
  }


  // getMyleaveList(Id: number) {
  //   return this.http.get<any[]>(this.getmyleavesApi, {
  //     params: { Id: Id.toString() }
  //   });
  // }

}
