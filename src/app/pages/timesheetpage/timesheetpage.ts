import { Component, computed, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LowerCasePipe, SlicePipe } from '@angular/common';
import { Authservice } from '../../services/Auth-service/authservice';
import { TimesheetService } from '../../services/timesheet-service/timesheet-service';

@Component({
  selector: 'app-emp-timesheet',
  imports: [ReactiveFormsModule, LowerCasePipe],
  templateUrl: './timesheetpage.html',
  styleUrl: './timesheetpage.css',
})
export class Timesheetpage implements OnInit {

  userId = signal<number | null | any>(null);
  entries = signal<any[]>([]);
  isLoading = signal(false);
  saving = signal(false);
  submittingAll = signal(false);
  editingId = signal<number | null>(null);
  selectedEntry = signal<any | null>(null);
  selectedDate = signal<string | null>(null);
  formErr = signal<string | null>(null);
  searchQ = signal('');
  statusF = signal('all');
  modalOpen = signal(false);
  globalLoading = signal(false);
  globalLoadingMsg = signal('Please wait...');
  submittingId = signal<number | null>(null);
  deletingId = signal<number | null>(null);

  weekStart = new Date();
  todayStr = this.localDate(new Date());
  entryForm: FormGroup;

  constructor(
    private auth: Authservice,
    private timesheetService: TimesheetService,
    private fb: FormBuilder
  ) {
    const now = new Date();
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    this.weekStart = new Date(now);
    this.weekStart.setDate(now.getDate() + diff);
    this.weekStart.setHours(0, 0, 0, 0);

    this.entryForm = this.fb.group({
      workDate: [this.todayStr, Validators.required],
      projectName: ['', Validators.required],
      taskDescription: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      workType: ['', Validators.required],
    });
  }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) {
      this.userId.set(id);
      this.loadEntries();
    }
  }

  loadEntries() {
    this.isLoading.set(true);
    this.timesheetService.getEntryByUserId(this.userId()!).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res ? [res] : [];
        this.entries.set(list);
        this.isLoading.set(false);
      },
      error: err => { console.error('loadEntries error:', err); this.isLoading.set(false); }
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
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = this.localDate(d);
      const dow = d.getDay();
      const hours = this.entries()
        .filter(e => this.dateStr(e.workDate) === dateStr)
        .reduce((s, e) => s + this.totalHoursNum(e.totalHours), 0);
      return {
        name: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        num: d.getDate(), dateStr,
        isToday: dateStr === today,
        isWeekend: dow === 0 || dow === 6,
        hours: Math.round(hours * 10) / 10
      };
    });
  }

  prevWeek() {
    const w = new Date(this.weekStart);
    w.setDate(w.getDate() - 7);
    this.weekStart = w;
    this.selectedDate.set(null);
  }

  nextWeek() {
    if (this.isCurrentWeek()) return;
    const w = new Date(this.weekStart);
    w.setDate(w.getDate() + 7);
    this.weekStart = w;
    this.selectedDate.set(null);
  }

  isCurrentWeek(): boolean {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.weekStart <= today && today <= this.weekEnd;
  }

  selectDate(dateStr: string) {
    this.selectedDate.set(this.selectedDate() === dateStr ? null : dateStr);
  }

  barH(hours: number): string {
    return Math.min(100, Math.round((hours / 8) * 100)) + '%';
  }

  // ── Computed stats ──
  todayHours = computed(() => {
    const today = this.localDate(new Date());
    return Math.round(
      this.entries()
        .filter(e => this.dateStr(e.workDate) === today)
        .reduce((s, e) => s + this.totalHoursNum(e.totalHours), 0) * 10
    ) / 10;
  });

  weekHours = computed(() => {
    const ws = this.localDate(this.weekStart);
    const we = this.localDate(this.weekEnd);
    return Math.round(
      this.entries()
        .filter(e => { const d = this.dateStr(e.workDate); return d >= ws && d <= we; })
        .reduce((s, e) => s + this.totalHoursNum(e.totalHours), 0) * 10
    ) / 10;
  });

  weekProgress = computed(() => Math.min(110, Math.round((this.weekHours() / 40) * 100)));
  draftCount = computed(() => this.entries().filter(e => e.status === 'Draft').length);
  submittedCount = computed(() => this.entries().filter(e => e.status === 'Submitted').length);

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
      (e.taskDescription || '').toLowerCase().includes(q) ||
      (e.projectName || '').toLowerCase().includes(q)
    );
    const sf = this.statusF();
    if (sf !== 'all') list = list.filter(e => e.status === sf);
    return list.sort((a, b) => this.dateStr(a.workDate).localeCompare(this.dateStr(b.workDate)));
  });

  // ── Modal ──
  openModal() {
    this.editingId.set(null);
    this.formErr.set(null);
    this.entryForm.reset({
      workDate: this.selectedDate() || this.todayStr
    });
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  openEditModal(e: any) {
    this.editingId.set(e.timesheetId);
    this.formErr.set(null);
    this.entryForm.patchValue({
      workDate: this.dateStr(e.workDate),
      projectName: e.projectName,
      taskDescription: e.taskDescription,
      startTime: e.startTime?.substring(0, 5),
      endTime: e.endTime?.substring(0, 5),
      workType: e.workType,
    });
    this.modalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  showLoader(msg: string) {
    this.globalLoadingMsg.set(msg);
    this.globalLoading.set(true);
  }

  hideLoader() {
    this.globalLoading.set(false);
    this.globalLoadingMsg.set('Please wait...');
  }

  closeModal() {
    this.modalOpen.set(false);
    this.editingId.set(null);
    this.formErr.set(null);
    this.entryForm.reset({ workDate: this.selectedDate() || this.todayStr });
    document.body.style.overflow = '';
  }

  // ── Auto hours ──
  calcHoursStr(): string {
    const { startTime, endTime } = this.entryForm.value;
    if (!startTime || !endTime) return '—';
    const mins = this.timeDiff(startTime, endTime);
    if (mins <= 0) return '—';
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  calcHoursNum(): number {
    const { startTime, endTime } = this.entryForm.value;
    if (!startTime || !endTime) return 0;
    const mins = this.timeDiff(startTime, endTime);
    return mins > 0 ? Math.round((mins / 60) * 10) / 10 : 0;
  }

  timeError(): string | null {
    const { startTime, endTime } = this.entryForm.value;
    if (!startTime || !endTime) return null;
    if (this.timeDiff(startTime, endTime) <= 0) return 'End time must be after start time';
    if (this.calcHoursNum() > 12) return 'Single entry cannot exceed 12 hours';
    return null;
  }

  timeDiff(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  // ── CRUD ──
  saveEntry() {
    this.formErr.set(null);
    if (this.entryForm.invalid) { this.formErr.set('Please fill all required fields.'); return; }
    if (this.timeError()) { this.formErr.set(this.timeError()); return; }

    const { workDate, projectName, taskDescription, startTime, endTime, workType } = this.entryForm.value;
    this.saving.set(true);

    if (this.editingId()) {
      const payload = { timesheetId: this.editingId(), projectName, taskDescription, startTime, endTime, workType };
      this.showLoader('Updating entry...');
      this.timesheetService.updateEntry(payload).subscribe({
        next: () => { this.loadEntries(); this.closeModal(); this.saving.set(false); this.hideLoader(); },
        error: err => { console.error(err); this.formErr.set('Update failed. Please try again.'); this.saving.set(false); this.hideLoader(); }
      });
    } else {
      const payload = { userId: this.userId(), workDate, projectName, taskDescription, startTime, endTime, workType };
      this.showLoader('Adding entry...');
      this.timesheetService.addEntry(payload).subscribe({
        next: () => { this.loadEntries(); this.closeModal(); this.saving.set(false); this.hideLoader(); },
        error: err => { console.error(err); this.formErr.set('Failed to add entry. Please try again.'); this.saving.set(false); this.hideLoader(); }
      });
    }
  }

  cancelEdit() {
    this.closeModal();
  }

  deleteEntry(timesheetId: number) {
    this.deletingId.set(timesheetId);
    this.timesheetService.deleteEntry(timesheetId).subscribe({
      next: () => { this.deletingId.set(null); this.loadEntries(); },
      error: err => { console.error('delete error:', err); this.deletingId.set(null); }
    });
  }

  submitEntry(timesheetId: number) {
    this.submittingId.set(timesheetId);
    this.timesheetService.submitEntry(timesheetId).subscribe({
      next: () => { this.submittingId.set(null); this.loadEntries(); },
      error: err => { console.error('submit error:', err); this.submittingId.set(null); }
    });
  }

  submitAllDrafts() {
    const drafts = this.entries().filter(e => e.status === 'Draft');
    if (!drafts.length) return;
    this.submittingAll.set(true);
    this.showLoader(`Submitting ${drafts.length} entr${drafts.length > 1 ? 'ies' : 'y'}...`);
    let completed = 0;
    drafts.forEach(e => {
      this.timesheetService.submitEntry(e.timesheetId).subscribe({
        next: () => { completed++; if (completed === drafts.length) { this.loadEntries(); this.submittingAll.set(false); this.hideLoader(); } },
        error: () => { completed++; if (completed === drafts.length) { this.loadEntries(); this.submittingAll.set(false); this.hideLoader(); } }
      });
    });
  }

  selectEntry(e: any) {
    this.selectedEntry.set(this.selectedEntry()?.timesheetId === e.timesheetId ? null : e);
  }

  exportCSV() {
    const rows = [['Date', 'Project', 'Task', 'Start', 'End', 'Hours', 'Type', 'Status']];
    this.filteredEntries().forEach(e => rows.push([
      this.dateStr(e.workDate), e.projectName, e.taskDescription,
      e.startTime, e.endTime, e.totalHours, e.workType, e.status
    ]));
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'my-timesheet.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ──
  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  dateStr(raw: string): string {
    if (!raw) return '';
    return raw.split('T')[0];
  }

  totalHoursNum(totalHours: string): number {
    if (!totalHours) return 0;
    const parts = totalHours.toString().split(':');
    return parseInt(parts[0]) + (parseInt(parts[1] || '0') / 60);
  }

  formatTotalHours(totalHours: string): string {
    if (!totalHours) return '—';
    const parts = totalHours.toString().split(':');
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1] || '0');
    if (h === 0 && m === 0) return '—';
    if (m === 0) return `${h}h`;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const clean = timeStr.toString().split('.')[0].substring(0, 5);
    const [h, m] = clean.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(this.dateStr(dateStr) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  formatDateLong(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}