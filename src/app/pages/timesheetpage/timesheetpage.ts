import { Component, computed, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LowerCasePipe } from '@angular/common';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
// import { TimesheetService } from '../../services/timesheet-service/timesheet-service';

export interface TimesheetEntry {
  id: number;
  date: string;
  project: string;
  task: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  workType: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  managerComment?: string;
}

@Component({
  selector: 'app-emp-timesheet',
  imports: [ReactiveFormsModule, LowerCasePipe],
  templateUrl: './Timesheetpage.html',
  styleUrl: './Timesheetpage.css',
})
export class Timesheetpage implements OnInit {

  userId = signal<any>(null);
  userInfo = signal<any>(null);
  entries = signal<TimesheetEntry[]>([]);

  // Form state
  editingId = signal<number | null>(null);
  formErr = signal<string | null>(null);
  saving = signal(false);

  // Filters
  searchQ = signal('');
  statusFilter = signal('all');
  selectedDate = signal<string | null>(null);

  // Week
  weekStart = new Date();
  submitting = signal(false);
  todayStr = this.localDateStr(new Date());

  entryForm: FormGroup;

  constructor(
    private auth: Authservice,
    private userService: UserService,
    private fb: FormBuilder,
    // private timesheetService: TimesheetService
  ) {
    // Set Monday as week start
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    this.weekStart = new Date(now);
    this.weekStart.setDate(now.getDate() + diff);
    this.weekStart.setHours(0, 0, 0, 0);

    this.entryForm = this.fb.group({
      date: [this.todayStr, Validators.required],
      project: ['', Validators.required],
      task: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      workType: ['', Validators.required],
    });
  }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) {
      this.userId.set(id);
      this.loadUser();
      this.loadEntries();
    }
  }

  loadUser() {
    this.userService.getUserById(this.userId()).subscribe({
      next: res => this.userInfo.set(res),
      error: err => console.error(err)
    });
  }

  loadEntries() {
    // Stub — replace with: this.timesheetService.getByUserId(this.userId()).subscribe(...)
    const t = this.todayStr;
    const y1 = this.prevDay(1),
      y2 = this.prevDay(2),
      y3 = this.prevDay(3);
    this.entries.set([
      { id: 1, date: t, project: 'HRMS Portal', task: 'Built timesheet UI component', startTime: '09:00', endTime: '12:30', totalHours: 3.5, workType: 'Development', status: 'Draft' },
      { id: 2, date: t, project: 'HRMS Portal', task: 'Team standup and sprint review', startTime: '13:00', endTime: '14:00', totalHours: 1, workType: 'Meeting', status: 'Draft' },
      { id: 3, date: y1, project: 'API Integration', task: 'CheckIn/Checkout API debugging', startTime: '09:30', endTime: '17:30', totalHours: 8, workType: 'Development', status: 'Submitted' },
      { id: 4, date: y2, project: 'Testing Suite', task: 'Leave module E2E test cases', startTime: '10:00', endTime: '13:00', totalHours: 3, workType: 'Testing', status: 'Approved' },
      { id: 5, date: y3, project: 'HRMS Portal', task: 'Competitor research & analysis', startTime: '09:00', endTime: '11:00', totalHours: 2, workType: 'Research', status: 'Rejected', managerComment: 'Please add more detail' },
    ]);
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
    const today = this.localDateStr(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = this.localDateStr(d);
      const dow = d.getDay();
      const hours = this.entries().filter(e => e.date === dateStr).reduce((s, e) => s + e.totalHours, 0);
      return {
        name: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        num: d.getDate(),
        dateStr,
        isToday: dateStr === today,
        isWeekend: dow === 0 || dow === 6,
        hours
      };
    });
  }

  prevWeek() {
    const w = new Date(this.weekStart);
    w.setDate(w.getDate() - 7);
    this.weekStart = w;
  }

  nextWeek() {
    if (this.isCurrentWeek()) return;
    const w = new Date(this.weekStart);
    w.setDate(w.getDate() + 7);
    this.weekStart = w;
  }

  isCurrentWeek(): boolean {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.weekStart <= today && today <= this.weekEnd;
  }

  selectDate(dateStr: string) {
    this.selectedDate.set(this.selectedDate() === dateStr ? null : dateStr);
    // Pre-fill date in form
    this.entryForm.patchValue({ date: dateStr });
  }

  dayBarH(hours: number): string {
    return Math.min(100, Math.round((hours / 8) * 100)) + '%';
  }

  // ── Computed stats ──
  todayHours = computed(() =>
    this.entries().filter(e => e.date === this.todayStr).reduce((s, e) => s + e.totalHours, 0)
  );

  weekHours = computed(() => {
    const s = this.localDateStr(this.weekStart);
    const e = this.localDateStr(this.weekEnd);
    return this.entries().filter(en => en.date >= s && en.date <= e).reduce((t, en) => t + en.totalHours, 0);
  });

  overtimeHours = computed(() => Math.max(0, this.weekHours() - 40));
  weekProgress = computed(() => Math.min(110, Math.round((this.weekHours() / 40) * 100)));
  draftCount = computed(() => this.entries().filter(e => e.status === 'Draft').length);

  // ── Filtered entries ──
  filteredEntries = computed(() => {
    let list = [...this.entries()];
    const ws = this.localDateStr(this.weekStart);
    const we = this.localDateStr(this.weekEnd);
    list = list.filter(e => e.date >= ws && e.date <= we);
    if (this.selectedDate()) list = list.filter(e => e.date === this.selectedDate());
    const q = this.searchQ().toLowerCase();
    if (q) list = list.filter(e => e.task.toLowerCase().includes(q) || e.project.toLowerCase().includes(q));
    const sf = this.statusFilter();
    if (sf !== 'all') list = list.filter(e => e.status === sf);
    return list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  });

  // ── Auto hours ──
  calcHours(): string {
    const { startTime, endTime } = this.entryForm.value;
    if (!startTime || !endTime) return '—';
    const diff = this.timeDiffMins(startTime, endTime);
    if (diff <= 0) return '—';
    const h = Math.floor(diff / 60), m = diff % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  calcHoursNum(): number {
    const { startTime, endTime } = this.entryForm.value;
    if (!startTime || !endTime) return 0;
    const diff = this.timeDiffMins(startTime, endTime);
    return diff > 0 ? Math.round((diff / 60) * 10) / 10 : 0;
  }

  hoursError(): string | null {
    const { startTime, endTime, date } = this.entryForm.value;
    if (!startTime || !endTime) return null;
    const diff = this.timeDiffMins(startTime, endTime);
    if (diff <= 0) return 'End time must be after start time';
    const newHrs = diff / 60;
    if (newHrs > 12) return 'Single entry cannot exceed 12 hours';
    if (date) {
      const existing = this.entries()
        .filter(e => e.date === date && e.id !== this.editingId())
        .reduce((s, e) => s + e.totalHours, 0);
      if (existing + newHrs > 24) return `Exceeds 24h limit for this day (${existing}h logged)`;
    }
    return null;
  }

  timeDiffMins(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  // ── CRUD ──
  editEntry(e: TimesheetEntry) {
    this.editingId.set(e.id);
    this.formErr.set(null);
    this.entryForm.patchValue({ date: e.date, project: e.project, task: e.task, startTime: e.startTime, endTime: e.endTime, workType: e.workType });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.formErr.set(null);
    this.entryForm.reset({ date: this.todayStr });
  }

  saveEntry() {
    this.formErr.set(null);
    if (this.entryForm.invalid) { this.formErr.set('Please fill all required fields.'); return; }
    if (this.hoursError()) { this.formErr.set(this.hoursError()); return; }

    const { date, project, task, startTime, endTime, workType } = this.entryForm.value;
    const totalHours = this.calcHoursNum();
    this.saving.set(true);

    setTimeout(() => {
      const id = this.editingId();
      if (id) {
        this.entries.update(list => list.map(e =>
          e.id === id ? { ...e, date, project, task, startTime, endTime, totalHours, workType, status: 'Draft' } : e
        ));
        this.editingId.set(null);
      } else {
        this.entries.update(list => [...list, {
          id: Date.now(), date, project, task, startTime, endTime, totalHours, workType, status: 'Draft'
        }]);
      }
      this.entryForm.reset({ date: this.selectedDate() || this.todayStr });
      this.formErr.set(null);
      this.saving.set(false);
    }, 400);
    // Replace with: this.timesheetService.save(payload).subscribe(...)
  }

  deleteEntry(id: number) {
    this.entries.update(list => list.filter(e => e.id !== id));
  }

  submitTimesheet() {
    if (this.draftCount() === 0) return;
    this.submitting.set(true);
    setTimeout(() => {
      this.entries.update(list => list.map(e =>
        e.status === 'Draft' ? { ...e, status: 'Submitted' } : e
      ));
      this.submitting.set(false);
    }, 700);
    // Replace with: this.timesheetService.submit(this.userId()).subscribe(...)
  }

  exportExcel() {
    const rows = [['Date', 'Project', 'Task', 'Start', 'End', 'Hours', 'Type', 'Status']];
    this.filteredEntries().forEach(e =>
      rows.push([e.date, e.project, e.task, e.startTime, e.endTime, String(e.totalHours), e.workType, e.status])
    );
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'my-timesheet.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  exportPDF() { window.print(); }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  formatDateFull(d: string): string {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  prevDay(n: number): string {
    const d = new Date(); d.setDate(d.getDate() - n);
    return this.localDateStr(d);
  }
}