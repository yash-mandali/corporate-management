import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RecruitmentService {

  private base = `${environment.ApiUrl}/Recruitment`;

  constructor(private http: HttpClient) { }


  getAllJobs() {
    return this.http.get<any>(`${this.base}/getAllJobs`);
  }

  getJobById(jobId: any) {
    return this.http.get<any>(`${this.base}/getJobById?jobId=${jobId}`);
  }

  createJob(data: any) {
    return this.http.post<any>(`${this.base}/createJob`, data);
  }


  updateJob(data: any) {
    return this.http.put<any>(`${this.base}/updateJob`, data);
  }

  deleteJob(jobId: any) {
    return this.http.delete<any>(`${this.base}/deleteJob?jobId=${jobId}`);
  }

  publishJob(jobId: any) {
    return this.http.post<any>(`${this.base}/publishJob?jobId=${jobId}`, { jobId });
  }

  onHoldJob(jobId: any) {
    return this.http.post<any>(`${this.base}/OnHold?jobId=${jobId}`, { jobId });
  }

  closeJob(jobId: any) {
    return this.http.post<any>(`${this.base}/closed?jobId=${jobId}`, { jobId });
  }

  // applyJob(JobId:any, UserId: any) {
  //   return this.http.post<any>(`${this.base}/applyJob?jobId=${JobId}&userId=${UserId}`, { jobId: JobId, userId: UserId });
  // }

  // applyJob(JobId: any, UserId: any, ResumeUrl: any = '') {
  //   return this.http.post<any>(
  //     `${this.base}/applyJob`,
  //     { jobId: JobId, userId: UserId, resumeUrl: ResumeUrl }
  //   );
  // }

  applyJob(formData: FormData) {
    return this.http.post<any>(`${this.base}/applyJob`,formData);
  }

  getCandidatesByJobId(jobId: number) {
    return this.http.get<any>(`${this.base}/getCandidatesByJobId?jobId=${jobId}`);
  }
}
