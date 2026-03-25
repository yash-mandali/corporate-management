import { Component, computed, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LowerCasePipe } from '@angular/common';
import { Authservice } from '../../services/Auth-service/authservice';
import { TimesheetService } from '../../services/timesheet-service/timesheet-service';

@Component({
  selector: 'app-emp-timesheet',
  imports: [ReactiveFormsModule, LowerCasePipe],
  templateUrl: './timesheetpage.html',
  styleUrl: './timesheetpage.css',
})
export class Timesheetpage implements OnInit {

  // ── State ──
  userId      = signal<any>(null);
  entries     = signal<any[]>([]);
  isLoading   = signal(false);
  saving      = signal(false);
  editingId   = signal<number | null>(null);
  formErr     = signal<string | null>(null);
  modalOpen   = signal(false);

  // ── Per-row action tracking ──
  submittingId  = signal<number | null>(null);
  deletingId    = signal<number | null>(null);
  submittingAll = signal(false);

  // ── Global overlay loader ──
  globalLoading    = signal(false);
  globalLoadingMsg = signal('Please wait...');

  // ── Filters ──
  searchQ      = signal('');
  statusF      = signal('all');
  selectedDate = signal<string | null>(null);

  // ── Pagination ──
  currentPage    = signal(1);
  readonly pageSize = 5;

  // ── Week ──
  weekStart = new Date();
  todayStr  = this.localDate(new Date());
  entryForm: FormGroup;

  constructor(
    private auth: Authservice,
    private timesheetService: TimesheetService,
    private fb: FormBuilder
  ) {
    // Set Monday as week start
    const now  = new Date();
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    this.weekStart = new Date(now);
    this.weekStart.setDate(now.getDate() + diff);
    this.weekStart.setHours(0, 0, 0, 0);

    this.entryForm = this.fb.group({
      workDate:        [this.todayStr, Validators.required],
      projectName:     ['', Validators.required],
      taskDescription: ['', Validators.required],
      startTime:       ['', Validators.required],
      endTime:         ['', Validators.required],
      workType:        ['', Validators.required],
    });
  }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) { this.userId.set(id); this.loadEntries(); }
  }

  loadEntries() {
    this.isLoading.set(true);
    this.timesheetService.getEntryByUserId(this.userId()).subscribe({
      next: (res: any) => {
        this.entries.set(Array.isArray(res) ? res : res ? [res] : []);
        this.isLoading.set(false);
      },
      error: err => { console.error(err); this.isLoading.set(false); }
    });
  }

  // ── Week helpers ──
  get weekEnd(): Date {
    const d = new Date(this.weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }

  get weekRange(): string {
    const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${this.weekStart.toLocaleDateString('en-IN', o)} – ${this.weekEnd.toLocaleDateString('en-IN', o)}`;
  }

  get weekDays() {
    const today = this.localDate(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d   = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      const ds  = this.localDate(d);
      const dow = d.getDay();
      const hrs = this.entries()
        .filter(e => this.dateStr(e.workDate) === ds)
        .reduce((s, e) => s + this.hoursNum(e.totalHours), 0);
      return {
        name: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        num:  d.getDate(), dateStr: ds,
        isToday:   ds === today,
        isWeekend: dow === 0 || dow === 6,
        hours: Math.round(hrs * 10) / 10,
      };
    });
  }

  prevWeek() {
    const w = new Date(this.weekStart);
    w.setDate(w.getDate() - 7);
    this.weekStart = w;
    this.selectedDate.set(null);
    this.currentPage.set(1);
  }

  nextWeek() {
    if (this.isCurrentWeek()) return;
    const w = new Date(this.weekStart);
    w.setDate(w.getDate() + 7);
    this.weekStart = w;
    this.selectedDate.set(null);
    this.currentPage.set(1);
  }

  isCurrentWeek(): boolean {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.weekStart <= today && today <= this.weekEnd;
  }

  selectDate(ds: string) {
    this.selectedDate.set(this.selectedDate() === ds ? null : ds);
    this.currentPage.set(1);
  }

  barH(h: number): string { return Math.min(100, Math.round((h / 8) * 100)) + '%'; }

  // ── Computed stats ──
  todayHours = computed(() => {
    const today = this.localDate(new Date());
    return Math.round(
      this.entries().filter(e => this.dateStr(e.workDate) === today)
        .reduce((s, e) => s + this.hoursNum(e.totalHours), 0) * 10
    ) / 10;
  });

  weekHours = computed(() => {
    const ws = this.localDate(this.weekStart);
    const we = this.localDate(this.weekEnd);
    return Math.round(
      this.entries()
        .filter(e => { const d = this.dateStr(e.workDate); return d >= ws && d <= we; })
        .reduce((s, e) => s + this.hoursNum(e.totalHours), 0) * 10
    ) / 10;
  });

  weekProgress   = computed(() => Math.min(110, Math.round((this.weekHours() / 40) * 100)));
  draftCount     = computed(() => this.entries().filter(e => e.status === 'Draft').length);
  submittedCount = computed(() => this.entries().filter(e => e.status === 'Submitted').length);

  // ── Filtered + paginated ──
  filteredEntries = computed(() => {
    const ws = this.localDate(this.weekStart);
    const we = this.localDate(this.weekEnd);
    let list = this.entries().filter(e => {
      const d = this.dateStr(e.workDate);
      return d >= ws && d <= we;
    });
    if (this.selectedDate()) list = list.filter(e => this.dateStr(e.workDate) === this.selectedDate());
    const q = this.searchQ().toLowerCase();
    if (q) list = list.filter(e =>
      (e.projectName || '').toLowerCase().includes(q) ||
      (e.taskDescription || '').toLowerCase().includes(q)
    );
    if (this.statusF() !== 'all') list = list.filter(e => e.status === this.statusF());
    // API returns descending order (latest first) — preserve it, no re-sort
    return list;
  });

  totalPages  = computed(() => Math.max(1, Math.ceil(this.filteredEntries().length / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedEntries = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEntries().slice(s, s + this.pageSize);
  });

  setFilter(f: string) { this.statusF.set(f); this.currentPage.set(1); }

  // ── Modal ──
  openModal() {
    this.editingId.set(null);
    this.formErr.set(null);
    this.entryForm.reset({ workDate: this.selectedDate() || this.todayStr });
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  openEditModal(e: any) {
    this.editingId.set(e.timesheetId);
    this.formErr.set(null);
    this.entryForm.patchValue({
      workDate:        this.dateStr(e.workDate),
      projectName:     e.projectName,
      taskDescription: e.taskDescription,
      startTime:       e.startTime?.substring(0, 5),
      endTime:         e.endTime?.substring(0, 5),
      workType:        e.workType,
    });
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.modalOpen.set(false);
    this.editingId.set(null);
    this.formErr.set(null);
    this.entryForm.reset({ workDate: this.selectedDate() || this.todayStr });
    document.body.style.overflow = '';
  }

  // ── CRUD — sp params match exactly ──
  saveEntry() {
    this.formErr.set(null);
    if (this.entryForm.invalid) { this.formErr.set('Please fill all required fields.'); return; }
    if (this.timeError())       { this.formErr.set(this.timeError()); return; }

    const { workDate, projectName, taskDescription, startTime, endTime, workType } = this.entryForm.value;
    this.saving.set(true);
    this.showLoader(this.editingId() ? 'Updating entry...' : 'Adding entry...');

    if (this.editingId()) {
      // sp_UpdateTimesheetEntry: @TimesheetId, @ProjectName, @TaskDescription, @StartTime, @EndTime, @WorkType
      // Only works when Status = 'Draft'
      this.timesheetService.updateEntry({ timesheetId: this.editingId(), projectName, taskDescription, startTime, endTime, workType })
        .subscribe({
          next: () => { this.loadEntries(); this.closeModal(); this.saving.set(false); this.hideLoader(); },
          error: err => { this.formErr.set('Update failed.'); this.saving.set(false); this.hideLoader(); console.error(err); }
        });
    } else {
      // sp_AddTimesheetEntry: @UserId, @WorkDate, @ProjectName, @TaskDescription, @StartTime, @EndTime, @WorkType
      this.timesheetService.addEntry({ userId: this.userId(), workDate, projectName, taskDescription, startTime, endTime, workType })
        .subscribe({
          next: () => { this.loadEntries(); this.closeModal(); this.saving.set(false); this.hideLoader(); },
          error: err => { this.formErr.set('Failed to add entry.'); this.saving.set(false); this.hideLoader(); console.error(err); }
        });
    }
  }

  deleteEntry(id: number) {
    // sp_deleteTimesheetEntry: @sheetId
    this.deletingId.set(id);
    this.timesheetService.deleteEntry(id).subscribe({
      next: () => { this.deletingId.set(null); this.loadEntries(); },
      error: err => { this.deletingId.set(null); console.error(err); }
    });
  }

  submitEntry(id: number) {
    // sp_SubmitTimesheet: @sheetId — only Draft → Submitted
    this.submittingId.set(id);
    this.timesheetService.submitEntry(id).subscribe({
      next: () => { this.submittingId.set(null); this.loadEntries(); },
      error: err => { this.submittingId.set(null); console.error(err); }
    });
  }

  submitAllDrafts() {
    const drafts = this.entries().filter(e => e.status === 'Draft');
    if (!drafts.length) return;
    this.submittingAll.set(true);
    this.showLoader(`Submitting ${drafts.length} entr${drafts.length > 1 ? 'ies' : 'y'}...`);
    let done = 0;
    drafts.forEach(e =>
      this.timesheetService.submitEntry(e.timesheetId).subscribe({
        next: () => { if (++done === drafts.length) { this.loadEntries(); this.submittingAll.set(false); this.hideLoader(); } },
        error: () => { if (++done === drafts.length) { this.loadEntries(); this.submittingAll.set(false); this.hideLoader(); } }
      })
    );
  }

  // ── Loader helpers ──
  showLoader(msg: string) { this.globalLoadingMsg.set(msg); this.globalLoading.set(true); }
  hideLoader()             { this.globalLoading.set(false); }

  // ── Form helpers ──
  calcHoursStr(): string {
    const { startTime, endTime } = this.entryForm.value;
    const mins = this.timeDiff(startTime, endTime);
    if (mins <= 0) return '—';
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  calcHoursNum(): number {
    const { startTime, endTime } = this.entryForm.value;
    const mins = this.timeDiff(startTime, endTime);
    return mins > 0 ? Math.round((mins / 60) * 10) / 10 : 0;
  }

  timeError(): string | null {
    const { startTime, endTime } = this.entryForm.value;
    if (!startTime || !endTime) return null;
    if (this.timeDiff(startTime, endTime) <= 0) return 'End time must be after start time';
    if (this.calcHoursNum() > 12) return 'Cannot exceed 12 hours';
    return null;
  }

  timeDiff(start: string, end: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  // ── Export CSV ──
  exportCSV() {
    const rows = [['Date','Project','Task','Start','End','Hours','Type','Status']];
    this.filteredEntries().forEach(e => rows.push([
      this.dateStr(e.workDate), e.projectName, e.taskDescription,
      e.startTime, e.endTime, e.totalHours, e.workType, e.status
    ]));
    const csv  = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'my-timesheet.csv';
    a.click();
  }

  // ── Shared helpers ──
  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  dateStr(raw: string): string { return raw ? raw.split('T')[0] : ''; }

  hoursNum(h: string): number {
    if (!h) return 0;
    const p = h.toString().split(':');
    return parseInt(p[0] || '0') + (parseInt(p[1] || '0') / 60);
  }

  formatHours(h: string): string {
    if (!h) return '—';
    const p  = h.toString().split(':');
    const hr = parseInt(p[0] || '0'), mn = parseInt(p[1] || '0');
    if (!hr && !mn) return '—';
    return mn ? `${hr}h ${mn}m` : `${hr}h`;
  }

  formatTime(t: string): string {
    if (!t) return '—';
    const clean = t.toString().split('.')[0].substring(0, 5);
    const [h, m] = clean.split(':').map(Number);
    if (isNaN(h)) return '—';
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  formatDate(ds: string): string {
    if (!ds) return '—';
    return new Date(this.dateStr(ds) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  formatDateLong(ds: string): string {
    if (!ds) return '';
    return new Date(ds + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}