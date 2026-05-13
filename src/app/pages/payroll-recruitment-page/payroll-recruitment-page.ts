import { Component, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CommonModule } from '@angular/common';

import { PayrollService } from '../../services/payroll-service/payrollservice';
import { RecruitmentService } from '../../services/recruitment-service/recruitment-service';
import { UserService } from '../../services/user-service/user-service';
import { ToastService } from '../../services/toast-service/toast';
import { Authservice } from '../../services/Auth-service/authservice';

@Component({
  selector: 'app-emp-portal',
  imports: [FormsModule, CommonModule],
  templateUrl: './payroll-recruitment-page.html',
  styleUrl: './payroll-recruitment-page.css',
})
export class PayrollRecruitmentPage implements OnInit {

  currentUserId = signal<any>(0);
  Math = Math;

  activeTab = signal<'payroll' | 'jobs' | 'applied'>('payroll');
  payrollView = signal<'list' | 'card'>('list');
  jobView = signal<'list' | 'card'>('list');

  payrollLoading = signal(false);
  jobsLoading = signal(false);
  applyLoading = signal<number | null>(null);
  appliedJobsLoading = signal(false);

  myPayrolls = signal<any[]>([]);
  allJobs = signal<any[]>([]);
  myApplications = signal<any[]>([]);

  payrollStatusFilter = signal<'all' | 'Generated' | 'Paid'>('all');
  payrollYear = signal<number>(new Date().getFullYear());
  payrollMonth = signal<number>(0); // 0 = all
  payrollSearch = signal('');

  jobSearch = signal('');
  jobDeptFilter = signal('all');
  jobTypeFilter = signal('all');
  jobMonthFilter = signal<number>(0);  // 0 = all
  jobYearFilter = signal<number>(0);   // 0 = all

  appliedSearch = signal('');
  appliedStatusFilter = signal('all');
  appliedMonthFilter = signal<number>(0);
  appliedYearFilter = signal<number>(0);

  payslipModal = signal<any | null>(null);
  jobDetailModal = signal<any | null>(null);
  applyModal = signal<any | null>(null);
  resumeFile = signal<File | null>(null);
  applyError = signal<string | null>(null);
  applySuccess = signal(false);

  readonly currentYear = new Date().getFullYear();
  readonly availableYears = Array.from({ length: 5 }, (_, i) => this.currentYear - i);

  readonly months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  readonly departments = [
    'Human Resources (HR)', 'IT / Engineering', 'Software Development',
    'Quality Assurance (QA)', 'DevOps', 'UI/UX Design', 'Sales',
    'Marketing', 'Customer Support', 'Finance & Accounts', 'Administration',
  ];

  readonly empTypes = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'];

  readonly applicationStatuses = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

  // ── Computed: payroll ──
  filteredPayrolls = computed(() => {
    const sf = this.payrollStatusFilter();
    const yr = this.payrollYear();
    const mo = this.payrollMonth();
    const q = this.payrollSearch().toLowerCase().trim();
    return this.myPayrolls().filter(p => {
      const matchStatus = sf === 'all' || p.status === sf;
      const matchYear = !yr || p.year === yr;
      const matchMonth = !mo || p.month === mo;
      const monthLabel = this.getMonthName(p.month).toLowerCase();
      const matchQ = !q || monthLabel.includes(q) || String(p.year).includes(q);
      return matchStatus && matchYear && matchMonth && matchQ;
    });
  });

  totalEarned = computed(() => this.myPayrolls().filter(p => p.status === 'Paid').reduce((s, p) => s + (p.netSalary ?? 0), 0));
  totalPending = computed(() => this.myPayrolls().filter(p => p.status !== 'Paid').reduce((s, p) => s + (p.netSalary ?? 0), 0));
  paidCount = computed(() => this.myPayrolls().filter(p => p.status === 'Paid').length);
  pendingCount = computed(() => this.myPayrolls().filter(p => p.status !== 'Paid').length);

  visibleJobs = computed(() =>
    this.allJobs().filter(j => j.status !== 'Deleted' && j.status !== 'Closed' && j.status !== 'deleted')
  );

  filteredJobs = computed(() => {
    const q = this.jobSearch().toLowerCase().trim();
    const df = this.jobDeptFilter();
    const tf = this.jobTypeFilter();
    const mo = this.jobMonthFilter();
    const yr = this.jobYearFilter();
    return this.visibleJobs().filter(j => {
      const matchQ = !q || j.title?.toLowerCase().includes(q) || j.department?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q);
      const matchD = df === 'all' || j.department === df;
      const matchT = tf === 'all' || j.employment_type === tf;
      const postedDate = new Date(j.publish_date ?? j.created_At ?? '');
      const matchMo = !mo || postedDate.getMonth() + 1 === mo;
      const matchYr = !yr || postedDate.getFullYear() === yr;
      return matchQ && matchD && matchT && matchMo && matchYr;
    });
  });

  appliedJobIds = computed(() =>
    new Set(this.myApplications().map((a: any) => Number(a.jobId)))
  );

  // For "Applied Jobs" tab
  filteredApplied = computed(() => {
    const q = this.appliedSearch().toLowerCase().trim();
    const sf = this.appliedStatusFilter();
    const mo = this.appliedMonthFilter();
    const yr = this.appliedYearFilter();
    return this.myApplications().filter((a: any) => {
      const matchQ = !q || a.jobTitle?.toLowerCase().includes(q) || a.department?.toLowerCase().includes(q);
      const matchS = sf === 'all' || a.applicationStatus === sf;
      const d = new Date(a.appliedDate ?? '');
      const matchMo = !mo || d.getMonth() + 1 === mo;
      const matchYr = !yr || d.getFullYear() === yr;
      return matchQ && matchS && matchMo && matchYr;
    });
  });

  constructor(
    private payrollService: PayrollService,
    private recruitService: RecruitmentService,
    private userService: UserService,
    private toast: ToastService,
    private auth: Authservice
  ) { }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) {
      this.currentUserId.set(id);
      this.loadMyPayrolls();
      this.loadJobs();
      this.loadMyApplications();
    }

  }

  // ── Load payrolls ──
  loadMyPayrolls() {
    this.payrollLoading.set(true);
    this.payrollService.getPayrollByUserId(this.currentUserId()).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res;
        const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
        console.log("loadmypayrooll called:", list);
        this.myPayrolls.set(list.filter((p: any) => p.status === 'Generated' || p.status === 'Paid'));

        this.payrollLoading.set(false);
      },
      error: err => { console.error(err); this.payrollLoading.set(false); }
    });
  }

  // ── Load jobs ──
  loadJobs() {
    this.jobsLoading.set(true);
    this.recruitService.getAllJobs().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.allJobs.set(list);
        this.jobsLoading.set(false);
      },
      error: err => { console.error(err); this.jobsLoading.set(false); }
    });
  }

  loadMyApplications() {
    this.appliedJobsLoading.set(true);
    this.recruitService.getAllJobs().subscribe({
      next: (res: any) => {
        const jobs: any[] = Array.isArray(res) ? res : res?.data ?? [];
        const visibleJobs = jobs.filter(j => j.status !== 'Deleted' && j.status !== 'deleted');
        if (visibleJobs.length === 0) { this.appliedJobsLoading.set(false); return; }

        let completed = 0;
        const results: any[] = [];

        visibleJobs.forEach(job => {
          this.recruitService.getCandidatesByJobId(job.jobId).subscribe({
            next: (cRes: any) => {
              const candidates: any[] = cRes?.data ?? cRes ?? [];
              const mine = candidates.filter((c: any) => Number(c.userId) === Number(this.currentUserId()));
              mine.forEach(c => results.push({
                ...c,
                ...job,
                applicationId: c.applicationId,
                applicationStatus: c.applicationStatus,
                appliedDate: c.appliedDate,
                resumeUrl: c.resumeUrl,
                userId: c.userId,
                jobId: job.jobId,
                jobTitle: job.title,
                department: job.department,
                location: job.location,
                employment_type: job.employment_type,
              }));
              completed++;
              if (completed === visibleJobs.length) {
                this.myApplications.set(results);
                this.appliedJobsLoading.set(false);
              }
            },
            error: () => {
              completed++;
              if (completed === visibleJobs.length) {
                this.myApplications.set(results);
                this.appliedJobsLoading.set(false);
              }
            }
          });
        });
      },
      error: () => this.appliedJobsLoading.set(false)
    });
  }

  // ── Can user apply? ──
  canApplyJob(job: any): boolean {
    return job.status === 'Published' || job.status === 'Open';
  }

  getJobStatusMessage(job: any): string {
    const s = job.status?.toLowerCase();
    if (s === 'onhold' || s === 'on hold') return 'On Hold';
    if (s === 'closed') return 'Closed';
    if (s === 'draft') return 'Draft';
    return job.status;
  }

  getJobStatusIcon(job: any): string {
    const s = job.status?.toLowerCase();
    if (s === 'closed') return 'fa-lock';
    if (s === 'onhold' || s === 'on hold') return 'fa-pause-circle';
    if (s === 'draft') return 'fa-pencil-alt';
    return 'fa-info-circle';
  }

  getJobStatusColor(job: any): string {
    const s = job.status?.toLowerCase();
    if (s === 'closed') return '#c0392b';
    if (s === 'onhold' || s === 'on hold') return '#d68910';
    if (s === 'draft') return '#2980b9';
    return '#7f8c8d';
  }

  getJobStatusBg(job: any): string {
    const s = job.status?.toLowerCase();
    if (s === 'closed') return 'rgba(192,57,43,0.1)';
    if (s === 'onhold' || s === 'on hold') return 'rgba(214,137,16,0.12)';
    if (s === 'draft') return 'rgba(41,128,185,0.1)';
    return 'rgba(127,140,141,0.12)';
  }

  // ── Payslip modal ──
  openPayslip(p: any) { this.payslipModal.set(p); document.body.style.overflow = 'hidden'; }
  closePayslip() { this.payslipModal.set(null); document.body.style.overflow = ''; }
  printPayslip() { window.print(); }

  downloadPayslip(p: any) {
    const rows = [
      ['SALARY SLIP', this.getMonthName(p.month) + ' ' + p.year], [],
      ['Employee ID', `EMP-${p.userId}`], ['Month', this.getMonthName(p.month)],
      ['Year', p.year], ['Status', p.status], [],
      ['EARNINGS', '', 'DEDUCTIONS', ''],
      ['Basic Salary', p.basicSalary, 'PF (12%)', p.pf],
      ['Allowances', p.allowances, 'Tax Deduction', p.taxDeduction],
      ['', '', 'Leave Deduction', p.leaveDeduction],
      ['Total Earnings', p.grossSalary, 'Total Deductions', p.totalDeductions],
      [], ['NET SALARY', p.netSalary],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `payslip-${this.getMonthName(p.month)}-${p.year}.csv`;
    a.click();
  }

  // ── Job detail modal ──
  openJobDetail(job: any) { this.jobDetailModal.set(job); document.body.style.overflow = 'hidden'; }
  openAppliedJobDetail(app: any) {
    const job = this.allJobs().find(j => j.jobId === app.jobId);
    this.openJobDetail({ ...(job ?? {}), ...app, title: app.jobTitle ?? job?.title });
  }
  closeJobDetail() { this.jobDetailModal.set(null); document.body.style.overflow = ''; }

  // ── Apply modal ──
  openApplyModal(job: any) {
    if (this.appliedJobIds().has(job.jobId)) {
      this.toast.error('You have already applied for this job.');
      return;
    }
    this.applyModal.set(job);
    this.resumeFile.set(null);
    this.applyError.set(null);
    this.applySuccess.set(false);
    document.body.style.overflow = 'hidden';
  }
  closeApplyModal() {
    this.applyModal.set(null);
    this.resumeFile.set(null);
    this.applyError.set(null);
    document.body.style.overflow = '';
  }

  onResumeSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { this.applyError.set('Only PDF, DOC, DOCX files allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { this.applyError.set('File must be under 5 MB.'); return; }
    this.resumeFile.set(file);
    this.applyError.set(null);
  }

  clearResume() { this.resumeFile.set(null); }

  submitApplication() {
    const job = this.applyModal();
    if (!job) return;
    if (!this.resumeFile()) { this.applyError.set('Please upload your resume.'); return; }
    this.applyLoading.set(job.jobId);
    const fd = new FormData();
    fd.append('jobId', String(job.jobId));
    fd.append('userId', String(this.currentUserId()));
    fd.append('resume', this.resumeFile()!);

    this.recruitService.applyJob(fd).subscribe({
      next: () => {
        this.applySuccess.set(true);
        this.applyLoading.set(null);
        // Immediately update local state so it reflects without refresh
        const newApp = {
          jobId: job.jobId,
          jobTitle: job.title,
          department: job.department,
          location: job.location,
          employment_type: job.employment_type,
          applicationStatus: 'Applied',
          appliedDate: new Date().toISOString(),
          userId: this.currentUserId(),
        };
        this.myApplications.update(list => [...list, newApp]);
        setTimeout(() => this.closeApplyModal(), 1800);
        this.toast.success(`Applied for "${job.title}" successfully!`);
      },
      error: err => {
        this.applyError.set(err?.error?.message || 'Failed to submit application.');
        this.applyLoading.set(null);
      }
    });
  }

  // ── Helpers ──
  getMonthName(month: number): string {
    return new Date(2000, month - 1, 1).toLocaleString('en-IN', { month: 'long' });
  }

  formatDate(ds: string): string {
    if (!ds) return '—';
    const d = new Date(ds);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmt(n: number): string { return (n || 0).toLocaleString('en-IN'); }

  formatSalary(min: number, max: number, currency = 'INR'): string {
    const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency;
    const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
    return `${sym}${fmt(min)} – ${sym}${fmt(max)}`;
  }

  isDeadlinePast(ds: string): boolean { return !!ds && new Date(ds) < new Date(); }

  daysUntilDeadline(ds: string): number | null {
    if (!ds) return null;
    const diff = new Date(ds).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }

  getColor(id: any): string {
    return this.colorPool[(Number(id) || 0) % this.colorPool.length];
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  stageColor(stage: string): string {
    const m: Record<string, string> = {
      Applied: '#2980b9', Screening: '#d68910', Interview: '#8e44ad',
      Offer: '#09637e', Hired: '#27ae60', Rejected: '#c0392b'
    };
    return m[stage] ?? '#5a8a94';
  }

  stageBg(stage: string): string {
    const m: Record<string, string> = {
      Applied: 'rgba(41,128,185,0.1)', Screening: 'rgba(214,137,16,0.1)',
      Interview: 'rgba(142,68,173,0.1)', Offer: 'rgba(9,99,126,0.1)',
      Hired: 'rgba(39,174,96,0.1)', Rejected: 'rgba(192,57,43,0.1)'
    };
    return m[stage] ?? 'rgba(90,138,148,0.1)';
  }

  trackByPayrollId(i: number, p: any) { return p.payrollId ?? i; }
  trackByJobId(i: number, j: any) { return j.jobId ?? i; }
  trackByAppId(i: number, a: any) { return a.applicationId ?? i; }
}
