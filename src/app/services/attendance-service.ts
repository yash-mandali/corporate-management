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
  checkOutApi = `${this.apiurl}/api/Attendance/CheckOut`;

  checkIn(Id: number) {
    return this.http.post<any>(`${this.checkInApi}?Id=${Id}`, {});
  }

  checkOut(Id: number) {
    return this.http.put<any>(this.checkOutApi, {
      params: { Id: Id.toString() }
    })
  }

}
