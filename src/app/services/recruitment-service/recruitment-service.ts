import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RecruitmentService {

  private apiurl = `${environment.ApiUrl}/Recruitment`;

  constructor(private http: HttpClient) { }


  getAllJobs() {
    return this.http.get<any>(`${this.apiurl}/getAllJobs`);
  }

  getJobById(jobId: any) {
    return this.http.get<any>(`${this.apiurl}/getJobById?jobId=${jobId}`);
  }

  createJob(data: any) {
    return this.http.post<any>(`${this.apiurl}/createJob`, data);
  }

  updateJob(data: any) {
    return this.http.put<any>(`${this.apiurl}/updateJob`, data);
  }

  deleteJob(jobId: any) {
    return this.http.delete<any>(`${this.apiurl}/deleteJob?jobId=${jobId}`);
  }

  publishJob(jobId: any) {
    return this.http.post<any>(`${this.apiurl}/publishJob?jobId=${jobId}`, { jobId });
  }

  onHoldJob(jobId: any) {
    return this.http.post<any>(`${this.apiurl}/OnHold?jobId=${jobId}`, { jobId });
  }
  
 //not used
  openJob(jobId: any) {
    return this.http.post<any>(`${this.apiurl}/openJob?jobId=${jobId}`, { jobId });
  }

  closeJob(jobId: any) {
    return this.http.post<any>(`${this.apiurl}/closeJob?jobId=${jobId}`, { jobId });
  }

  applyJob(formData: FormData) {
    return this.http.post<any>(`${this.apiurl}/applyJob`,formData);
  }

  getCandidatesByJobId(jobId: number) {
    return this.http.get<any>(`${this.apiurl}/getCandidatesByJobId?jobId=${jobId}`);
  }
}
