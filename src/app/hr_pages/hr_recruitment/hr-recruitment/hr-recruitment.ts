import { Component, computed, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecruitmentService } from '../../../services/recruitment-service/recruitment-service';
import { UserService } from '../../../services/user-service/user-service';
import { ToastService } from '../../../services/toast-service/toast';

type JobStatus = 'Draft' | 'Published' | 'OnHold' | 'Closed' | 'Deleted';
type CandStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';

const CAND_STAGES: CandStage[] = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const EMP_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'];
const DEPARTMENTS = [
  'Human Resources (HR)', 'IT / Engineering', 'Software Development',
  'Quality Assurance (QA)', 'DevOps', 'UI/UX Design', 'Sales',
  'Marketing', 'Customer Support', 'Finance & Accounts', 'Administration',
];

@Component({
  selector: 'app-hr-recruitment',
  imports: [ReactiveFormsModule],
  templateUrl: './hr-recruitment.html',
  styleUrl: './hr-recruitment.css',
})
export class HrRecruitment implements OnInit {

  readonly stages = CAND_STAGES;
  readonly departments = DEPARTMENTS;
  readonly empTypes = EMP_TYPES;
  readonly currencies = CURRENCIES;
  readonly Math = Math;

  // ── API data ──
  allJobs = signal<any[]>([]);
  candidatesMap = signal<Record<number, any[]>>({});
  allEmployees = signal<any[]>([]);
  stageOverrides = signal<Record<number, CandStage>>({});

  // ── Loading ──
  isLoading        = signal(false);
  actionLoading    = signal<any>(null);
  formSaving       = signal(false);
  formError        = signal<string | null>(null);
  resumeFile       = signal<File | null>(null);
  resumeUploading  = signal(false);
  resumeUploadedUrl = signal<string>('');

  // ── Tabs ──
  activeTab = signal<'jobs' | 'pipeline' | 'candidates'>('jobs');

  // ── Job filters ──
  jobSearch       = signal('');
  jobStatusFilter = signal('all');
  jobDeptFilter   = signal('all');

  // ── Candidate filters ──
  candSearch      = signal('');
  candJobFilter   = signal<number | 'all'>('all');
  candStageFilter = signal<CandStage | 'all'>('all');

  // ── Pipeline filters ──
  pipelineJobFilter = signal<number | 'all'>('all');
  pipelineSearch    = signal('');

  // ── Modals ──
  jobFormModal     = signal(false);
  editingJob       = signal<any | null>(null);
  jobDetailModal   = signal<any | null>(null);
  jobDetailCands   = signal<any[]>([]);
  jobDetailLoading = signal(false);
  candFormModal    = signal(false);
  candDetailModal  = signal<any | null>(null);
  deleteModal      = signal<{ id: number; name: string } | null>(null);
  // ── 'resume' added to union — calls publishJob API (SP allows Draft|OnHold → Published)
  statusModal      = signal<{ job: any; action: 'publish' | 'onhold' | 'close' | 'resume' } | null>(null);
  stageModal       = signal<{ cand: any; currentStage: CandStage } | null>(null);

  // ── Drag ──
  draggingId = signal<number | null>(null);
  dragOver   = signal<CandStage | null>(null);

  jobForm: FormGroup;
  candForm: FormGroup;

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];
  private readonly STAGE_STORAGE = 'hrms_recruit_stages';

  // ── Stats ──
  activeCount = computed(() => this.allJobs().filter(j => j.status === 'Published' || j.status === 'Open').length);
  draftCount  = computed(() => this.allJobs().filter(j => j.status === 'Draft').length);
  onHoldCount = computed(() => this.allJobs().filter(j => j.status === 'OnHold').length);
  totalCands  = computed(() => Object.values(this.candidatesMap()).flat().length);
  hiredCount  = computed(() => this.allCandidatesFlat().filter(c => c.stage === 'Hired').length);

  allCandidatesFlat = computed(() =>
    Object.values(this.candidatesMap()).flat().map(c => ({
      ...c,
      stage: (this.stageOverrides()[c.applicationId] ?? c.applicationStatus ?? 'Applied') as CandStage,
    }))
  );

  filteredJobs = computed(() => {
    const q  = this.jobSearch().toLowerCase().trim();
    const sf = this.jobStatusFilter();
    const df = this.jobDeptFilter();
    return this.allJobs().filter(j => {
      const st     = (j.status || '').toLowerCase();
      const matchQ = !q || j.title?.toLowerCase().includes(q) || j.department?.toLowerCase().includes(q);
      const matchS = sf === 'all'
        || (sf === 'published' && (st === 'published' || st === 'open'))
        || sf === st;
      const matchD = df === 'all' || j.department === df;
      return matchQ && matchS && matchD;
    });
  });

  candidatesByStage = computed(() => {
    const q  = this.pipelineSearch().toLowerCase().trim();
    const jf = this.pipelineJobFilter();
    const filtered = this.allCandidatesFlat().filter(c =>
      (!q || c.fullName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) &&
      (jf === 'all' || c.jobId === Number(jf))
    );
    const map: Record<string, any[]> = {};
    CAND_STAGES.forEach(s => map[s] = []);
    filtered.forEach(c => (map[c.stage] ??= []).push(c));
    return map;
  });

  filteredCandidates = computed(() => {
    const q  = this.candSearch().toLowerCase().trim();
    const jf = this.candJobFilter();
    const sf = this.candStageFilter();
    return this.allCandidatesFlat().filter(c =>
      (!q || c.fullName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) &&
      (jf === 'all' || c.jobId === Number(jf)) &&
      (sf === 'all' || c.stage === sf)
    );
  });

  constructor(
    private fb: FormBuilder,
    private recruitService: RecruitmentService,
    private userService: UserService,
    private toast: ToastService
  ) {
    this.jobForm = this.fb.group({
      title:               ['', Validators.required],
      description:         ['', Validators.required],
      department:          ['', Validators.required],
      location:            ['', Validators.required],
      employment_type:     ['Full-Time', Validators.required],
      experience_required: ['', Validators.required],
      vacancies:           [1, [Validators.required, Validators.min(1)]],
      required_skills:     [''],
      qualifications:      [''],
      responsibilities:    [''],
      salary_min:          [0, [Validators.required, Validators.min(0)]],
      salary_max:          [0, [Validators.required, Validators.min(0)]],
      currency:            ['INR'],
      publish_date:        [''],
      application_deadline:[''],
    });
    this.candForm = this.fb.group({
      jobId:     ['', Validators.required],
      userId:    ['', Validators.required],
      resumeUrl: [''],
    });
  }

  ngOnInit() {
    this.loadStageOverrides();
    this.loadJobs();
    this.loadAllEmployees();
  }

  // ── Load ──
  loadJobs() {
    this.isLoading.set(true);
    this.recruitService.getAllJobs().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.allJobs.set(list);
        this.isLoading.set(false);
        list.forEach((j: any) => this.loadJobCandidates(j.jobId));
      },
      error: err => { console.error(err); this.isLoading.set(false); }
    });
  }

  loadJobCandidates(jobId: number) {
    this.recruitService.getCandidatesByJobId(jobId).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.candidatesMap.update(m => ({ ...m, [jobId]: list.map((c: any) => ({ ...c, jobId })) }));
      },
      error: () => {}
    });
  }

  loadAllEmployees() {
    this.userService.getAllEmployee().subscribe({
      next: (res: any) => this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []),
      error: err => console.error(err)
    });
  }

  jobCandidates(jobId: number) {
    return (this.candidatesMap()[jobId] ?? []).map(c => ({
      ...c,
      stage: (this.stageOverrides()[c.applicationId] ?? c.applicationStatus ?? 'Applied') as CandStage,
    }));
  }

  // ── Job form ──
  openAddJob() {
    this.editingJob.set(null); this.formError.set(null);
    this.jobForm.reset({ employment_type: 'Full-Time', vacancies: 1, currency: 'INR', salary_min: 0, salary_max: 0 });
    this.jobFormModal.set(true); document.body.style.overflow = 'hidden';
  }

  openEditJob(job: any) {
    if (job.status !== 'Draft') { this.toast.error('Only Draft jobs can be edited.'); return; }
    this.editingJob.set(job); this.formError.set(null);
    this.jobForm.patchValue({
      title: job.title, description: job.description, department: job.department,
      location: job.location, employment_type: job.employment_type,
      experience_required: job.experience_required, vacancies: job.vacancies,
      required_skills: job.required_skills ?? '', qualifications: job.qualifications ?? '',
      responsibilities: job.responsibilities ?? '', salary_min: job.salary_min,
      salary_max: job.salary_max, currency: job.currency ?? 'INR',
      application_deadline: job.application_deadline?.substring(0, 10) ?? '',
    });
    this.jobFormModal.set(true); document.body.style.overflow = 'hidden';
  }

  closeJobForm() {
    this.jobFormModal.set(false); this.editingJob.set(null);
    this.formError.set(null); document.body.style.overflow = '';
  }

  saveJob() {
    this.formError.set(null);
    if (this.jobForm.invalid) { this.jobForm.markAllAsTouched(); this.formError.set('Please fill all required fields.'); return; }
    const v = this.jobForm.value;
    if (v.salary_min > v.salary_max) { this.formError.set('Min salary cannot exceed max salary.'); return; }
    this.formSaving.set(true);

    if (this.editingJob()) {
      const payload = { jobId: this.editingJob().jobId, ...v };
      delete payload.publish_date;
      this.recruitService.updateJob(payload).subscribe({
        next: () => { this.loadJobs(); this.formSaving.set(false); this.closeJobForm(); this.toast.success('Job updated.'); },
        error: err => { this.formSaving.set(false); this.formError.set(err?.error?.message || 'Update failed.'); }
      });
    } else {
      this.recruitService.createJob(v).subscribe({
        next: () => { this.loadJobs(); this.formSaving.set(false); this.closeJobForm(); this.toast.success('Job saved as Draft.'); },
        error: err => { this.formSaving.set(false); this.formError.set(err?.error?.message || 'Failed to create job.'); }
      });
    }
  }

  // ── Status actions ──
  openStatusModal(job: any, action: 'publish' | 'onhold' | 'close' | 'resume') {
    this.statusModal.set({ job, action }); document.body.style.overflow = 'hidden';
  }
  closeStatusModal() { this.statusModal.set(null); document.body.style.overflow = ''; }

  confirmStatusChange() {
    const m = this.statusModal(); if (!m) return;
    const jobId = m.job.jobId;
    this.closeStatusModal();
    this.actionLoading.set(jobId);

    // 'resume' uses same publishJob API — SP allows Draft|OnHold → Published/Open
    const call$ = m.action === 'publish' ? this.recruitService.publishJob(jobId)
      : m.action === 'resume'  ? this.recruitService.publishJob(jobId)
      : m.action === 'onhold'  ? this.recruitService.onHoldJob(jobId)
      : this.recruitService.closeJob(jobId);

    const msg = { publish: 'published', resume: 'resumed — now Open', onhold: 'put on hold', close: 'closed' };
    call$.subscribe({
      next: () => { this.loadJobs(); this.actionLoading.set(null); this.toast.success(`Job ${msg[m.action]}.`); },
      error: err => { this.toast.error(err?.error?.message || 'Action failed.'); this.actionLoading.set(null); }
    });
  }

  // ── Delete ──
  confirmDeleteJob(job: any) {
    this.deleteModal.set({ id: job.jobId, name: job.title }); document.body.style.overflow = 'hidden';
  }
  closeDeleteModal() { this.deleteModal.set(null); document.body.style.overflow = ''; }

  executeDelete() {
    const m = this.deleteModal(); if (!m) return;
    this.closeDeleteModal();
    this.actionLoading.set(m.id);
    this.recruitService.deleteJob(m.id).subscribe({
      next: () => {
        this.allJobs.update(list => list.filter(j => j.jobId !== m.id));
        this.candidatesMap.update(map => { const n = { ...map }; delete n[m.id]; return n; });
        this.actionLoading.set(null); this.toast.success('Job deleted.');
      },
      error: err => { this.toast.error(err?.error?.message || 'Delete failed.'); this.actionLoading.set(null); }
    });
  }

  // ── Job detail ──
  openJobDetail(job: any) {
    this.jobDetailModal.set(job);
    this.jobDetailCands.set(this.jobCandidates(job.jobId));
    this.jobDetailLoading.set(true);
    this.recruitService.getJobById(job.jobId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.jobDetailModal.set(data ?? job);
        this.recruitService.getCandidatesByJobId(job.jobId).subscribe({
          next: (cr: any) => {
            const list = (Array.isArray(cr) ? cr : cr?.data ?? []).map((c: any) => ({
              ...c, jobId: job.jobId,
              stage: (this.stageOverrides()[c.applicationId] ?? c.applicationStatus ?? 'Applied') as CandStage,
            }));
            this.candidatesMap.update(m => ({ ...m, [job.jobId]: list }));
            this.jobDetailCands.set(list);
            this.jobDetailLoading.set(false);
          },
          error: () => this.jobDetailLoading.set(false)
        });
      },
      error: () => { this.jobDetailLoading.set(false); }
    });
    document.body.style.overflow = 'hidden';
  }
  closeJobDetail() { this.jobDetailModal.set(null); this.jobDetailCands.set([]); document.body.style.overflow = ''; }

  // ── Apply job ──
  openAddCandidate(jobId?: number) {
    this.formError.set(null);
    this.resumeFile.set(null);
    this.resumeUploadedUrl.set('');
    this.candForm.reset({ jobId: jobId ?? '', userId: '', resumeUrl: '' });
    this.candFormModal.set(true); document.body.style.overflow = 'hidden';
  }
  closeCandForm() { this.candFormModal.set(false); this.formError.set(null); document.body.style.overflow = ''; }

  // ── File selection ──
  onResumeFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      this.formError.set('Only PDF, DOC, DOCX files are allowed.');
      input.value = ''; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.formError.set('File size must be under 5 MB.');
      input.value = ''; return;
    }
    this.resumeFile.set(file);
    this.formError.set(null);
    this.candForm.patchValue({ resumeUrl: file.name });
  }

  clearResumeFile() {
    this.resumeFile.set(null);
    this.resumeUploadedUrl.set('');
    this.candForm.patchValue({ resumeUrl: '' });
  }

  saveCandidate() {
    this.formError.set(null);
    if (this.candForm.invalid) { this.candForm.markAllAsTouched(); this.formError.set('Select job and employee.'); return; }
    const v = this.candForm.value;
    this.doApplyJob(v.jobId, v.userId);
  }

  private doApplyJob(jobId: any, userId: any) {
    this.formSaving.set(true);
    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('userId', userId);
    if (this.resumeFile()) {
      formData.append('resume', this.resumeFile()!);
    }
    this.recruitService.applyJob(formData).subscribe({
      next: () => {
        this.loadJobCandidates(Number(jobId));
        this.formSaving.set(false);
        this.closeCandForm();
        this.toast.success('Application submitted successfully.');
      },
      error: err => {
        this.formSaving.set(false);
        this.formError.set(err?.error?.message || 'Failed to submit application.');
      }
    });
  }

  // ── Candidate detail ──
  openCandDetail(c: any) { this.candDetailModal.set(c); document.body.style.overflow = 'hidden'; }
  closeCandDetail()       { this.candDetailModal.set(null); document.body.style.overflow = ''; }

  // ── Stage modal ──
  openStageModal(cand: any, event?: Event) {
    event?.stopPropagation();
    this.stageModal.set({ cand, currentStage: cand.stage });
    document.body.style.overflow = 'hidden';
  }
  closeStageModal() { this.stageModal.set(null); document.body.style.overflow = ''; }

  moveStage(applicationId: number, stage: CandStage) {
    this.stageOverrides.update(m => ({ ...m, [applicationId]: stage }));
    this.saveStageOverrides();
    if (this.candDetailModal()?.applicationId === applicationId)
      this.candDetailModal.update(c => c ? { ...c, stage } : c);
    if (this.stageModal()?.cand?.applicationId === applicationId)
      this.stageModal.update(m => m ? { ...m, cand: { ...m.cand, stage }, currentStage: stage } : m);
  }

  confirmStageMove(stage: CandStage) {
    const m = this.stageModal(); if (!m) return;
    this.moveStage(m.cand.applicationId, stage);
    this.closeStageModal();
    this.toast.success(`${m.cand.fullName} moved to ${stage}.`);
  }

  // ── Drag & Drop ──
  onDragStart(id: number) { this.draggingId.set(id); }
  onDragOver(stage: CandStage, e: DragEvent) { e.preventDefault(); this.dragOver.set(stage); }
  onDragLeave() { this.dragOver.set(null); }
  onDrop(stage: CandStage) {
    const id = this.draggingId();
    if (id !== null) { this.moveStage(id, stage); this.toast.success(`Moved to ${stage}.`); }
    this.draggingId.set(null); this.dragOver.set(null);
  }

  // ── localStorage ──
  loadStageOverrides() {
    try { const r = localStorage.getItem(this.STAGE_STORAGE); if (r) this.stageOverrides.set(JSON.parse(r)); } catch {}
  }
  saveStageOverrides() {
    try { localStorage.setItem(this.STAGE_STORAGE, JSON.stringify(this.stageOverrides())); } catch {}
  }

  // ── Resume download ──
  downloadResume(cand: any) {
    if (!cand.resumeUrl) return;
    const url = `https://localhost:44346${cand.resumeUrl}`;
    const a = document.createElement('a');
    a.href = url;
    const ext = url.includes('.pdf') ? '.pdf' : url.includes('.doc') ? '.doc' : '';
    a.download = `resume_${(cand.fullName || 'candidate').replace(/ /g, '_')}${ext}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── Salary display ──
  formatSalary(min: number, max: number, currency = 'INR'): string {
    const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency;
    const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
    return `${sym}${fmt(min)} – ${sym}${fmt(max)}`;
  }

  // ── Helpers ──
  statusColor(status: string): string {
    const m: Record<string, string> = {
      published: '#27ae60', open: '#27ae60', draft: '#2980b9',
      onhold: '#d68910', closed: '#c0392b', deleted: '#5a8a94'
    };
    return m[(status || '').toLowerCase()] ?? '#5a8a94';
  }
  statusLabel(s: string): string { return s === 'Published' ? 'Published' : s; }

  stageColor(stage: string): string {
    const m: Record<string, string> = {
      Applied: '#2980b9', Screening: '#d68910', Interview: '#8e44ad',
      Offer: '#09637e', Hired: '#27ae60', Rejected: '#c0392b'
    };
    return m[stage] ?? '#5a8a94';
  }
  stageIcon(stage: string): string {
    const m: Record<string, string> = {
      Applied: 'inbox', Screening: 'search', Interview: 'comments',
      Offer: 'file-contract', Hired: 'check-circle', Rejected: 'times-circle'
    };
    return m[stage] ?? 'circle';
  }

  // ── Status flow guards ──
  // Draft → Publish (first time only)
  canPublish(s: string)  { return s === 'Draft'; }
  // OnHold → Resume/Open (calls same publishJob API — SP allows Draft|OnHold)
  canResume(s: string)   { return s === 'OnHold'; }
  // Published/Open → OnHold
  canOnHold(s: string)   { return s === 'Published' || s === 'Open'; }
  // Published/Open/OnHold → Closed
  canClose(s: string)    { return s === 'Published' || s === 'Open' || s === 'OnHold'; }
  // Only Draft jobs can be edited (SP enforced)
  canEdit(s: string)     { return s === 'Draft'; }
  // Published or Open = both treated as active (add applicant, etc.)
  isActiveJob(s: string) { return s === 'Published' || s === 'Open'; }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  getColor(id: any): string {
    let hash = 0; const s = String(id);
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return this.colorPool[Math.abs(hash) % this.colorPool.length];
  }
  formatDate(ds: string): string {
    if (!ds) return '—';
    return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  daysAgo(ds: string): string {
    if (!ds) return '';
    const d = Math.floor((Date.now() - new Date(ds).getTime()) / 86400000);
    if (d === 0) return 'Today'; if (d === 1) return 'Yesterday';
    if (d < 30) return `${d}d ago`; return this.formatDate(ds);
  }
  isDeadlinePast(ds: string): boolean { return !!ds && new Date(ds) < new Date(); }
}