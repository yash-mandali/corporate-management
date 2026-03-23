import { Component, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LowerCasePipe } from '@angular/common';
import { UserService } from '../../services/user-service/user-service';
import { TimesheetService } from '../../services/timesheet-service/timesheet-service';
import { ToastrService } from 'ngx-toastr';
import { Authservice } from '../../services/Auth-service/authservice';

@Component({
  selector: 'app-manager-timesheet',
  imports: [FormsModule, LowerCasePipe],
  templateUrl: './managertimesheet.html',
  styleUrl: './managertimesheet.css',
})
export class ManagerTimesheetpage implements OnInit {

  // ── State ──
  managerId = signal<any>(null);
  allEntries = signal<any[]>([]);
  allUsers = signal<any[]>([]);
  tsLoading = signal(false);
  tsActionLoading = signal<any>(null);
  selectedEntry = signal<any | null>(null);
  rejectModal = signal<any | null>(null);
  rejectReason = '';

  // ── Tabs & filters ──
  activeTab = signal<'approvals' | 'history' | 'tracker'>('approvals');
  searchQ = signal('');
  statusFilter = signal('all');
  currentPage = signal(1);
  readonly pageSize = 10;

  // ── Tracker ──
  trackerSearch = signal('');
  weekStart = new Date();

  // ── Color pool ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed stats ──
  submittedCount = computed(() => this.allEntries().filter(e => e.status === 'Submitted').length);
  approvedCount = computed(() => this.allEntries().filter(e => e.status === 'Approved').length);
  rejectedCount = computed(() => this.allEntries().filter(e => e.status === 'Rejected').length);
  draftCount = computed(() => this.allEntries().filter(e => e.status === 'Draft').length);

  totalApprovedHours = computed(() => {
    return Math.round(
      this.allEntries()
        .filter(e => e.status === 'Approved')
        .reduce((s, e) => s + this.parseHours(e.totalHours), 0) * 10
    ) / 10;
  });

  // ── Approvals tab ──
  submittedEntries = computed(() =>
    this.allEntries()
      .filter(e => e.status === 'Submitted')
      .sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime())
  );

  // ── History tab ──
  filteredEntries = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const sf = this.statusFilter();
    return this.allEntries()
      .filter(e => {
        const matchQ = !q ||
          (e.userName || '').toLowerCase().includes(q) ||
          (e.projectName || '').toLowerCase().includes(q) ||
          (e.taskDescription || '').toLowerCase().includes(q);
        const matchS = sf === 'all' || e.status === sf;
        return matchQ && matchS;
      })
      .sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEntries().length / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedEntries = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEntries().slice(s, s + this.pageSize);
  });

  // ── Tracker tab ──
  weekLabel = computed(() => {
    const end = new Date(this.weekStart);
    end.setDate(end.getDate() + 6);
    const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${this.weekStart.toLocaleDateString('en-IN', o)} – ${end.toLocaleDateString('en-IN', o)}`;
  });

  trackerRows = computed(() => {
    const ws = this.localDate(this.weekStart);
    const end = new Date(this.weekStart); end.setDate(end.getDate() + 6);
    const we = this.localDate(end);
    const today = this.localDate(new Date());

    return this.allUsers().map(u => {
      const userEntries = this.allEntries().filter(e =>
        e.userId === u.id &&
        (e.status === 'Approved' || e.status === 'Submitted') &&
        this.dateStr(e.workDate) >= ws && this.dateStr(e.workDate) <= we
      );

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(this.weekStart);
        d.setDate(d.getDate() + i);
        const ds = this.localDate(d);
        const dow = d.getDay();
        const hrs = userEntries
          .filter(e => this.dateStr(e.workDate) === ds)
          .reduce((s, e) => s + this.parseHours(e.totalHours), 0);
        return {
          name: d.toLocaleDateString('en-IN', { weekday: 'short' }),
          dateStr: ds,
          hours: Math.round(hrs * 10) / 10,
          isToday: ds === today,
          isWeekend: dow === 0 || dow === 6,
        };
      });

      const weekTotal = Math.round(days.reduce((s, d) => s + d.hours, 0) * 10) / 10;
      return { userId: u.id, userName: u.userName, roleName: u.roleName, days, weekTotal };
    });
  });

  filteredTrackerRows = computed(() => {
    const q = this.trackerSearch().toLowerCase().trim();
    return this.trackerRows().filter(r => !q || r.userName.toLowerCase().includes(q));
  });

  constructor(
    private userService: UserService,
    private timesheetService: TimesheetService,
    private auth:Authservice,
    private toast: ToastrService
  ) {
    // set Monday as week start
    const now = new Date();
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    this.weekStart = new Date(now);
    this.weekStart.setDate(now.getDate() + diff);
    this.weekStart.setHours(0, 0, 0, 0);
  }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) {
      this.managerId.set(id);
      this.loadTeamUsers();
      this.loadAllEntries();
     }  
  }

  loadTeamUsers() {
    this.userService.getManagerTeam(this.managerId()).subscribe({
      next: (res: any) => this.allUsers.set(Array.isArray(res) ? res : res ? [res] : []),
      error: err => console.error('loadAllemployees:', err)
    });
  }

  loadAllEntries() {
    this.tsLoading.set(true);
    this.timesheetService.getTeamAllEntry(this.managerId()).subscribe({
      next: (res: any) => {
        this.allEntries.set(Array.isArray(res) ? res : res ? [res] : []);
        this.tsLoading.set(false);
      },
      error: err => { console.error('loadAllEntries:', err); this.tsLoading.set(false); }
    });
  }

  // ── Actions ──
  approveEntry(timesheetId: any) {
    this.tsActionLoading.set(timesheetId);
    this.timesheetService.managerApproveEntry(timesheetId).subscribe({
      next: () => {
        this.allEntries.update(list =>
          list.map(e => e.timesheetId === timesheetId ? { ...e, status: 'Approved' } : e)
        );
        this.tsActionLoading.set(null);
        // this.toast.success('Timesheet approved.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to approve.');
        this.tsActionLoading.set(null);
      }
    });
  }

  openRejectModal(entry: any) {
    this.rejectReason = '';
    this.rejectModal.set(entry);
    document.body.style.overflow = 'hidden';
  }

  closeRejectModal() {
    this.rejectModal.set(null);
    this.rejectReason = '';
    document.body.style.overflow = '';
  }

  confirmReject() {
    const entry = this.rejectModal();
    if (!entry || !this.rejectReason.trim()) return;
    this.tsActionLoading.set(entry.timesheetId);
    this.timesheetService.managerRejectEntry(entry.timesheetId, this.rejectReason.trim()).subscribe({
      next: () => {
        this.allEntries.update(list =>
          list.map(e => e.timesheetId === entry.timesheetId
            ? { ...e, status: 'Rejected', rejectReason: this.rejectReason.trim() }
            : e)
        );
        this.tsActionLoading.set(null);
        this.closeRejectModal();
        // this.toast.success('Timesheet rejected.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to reject.');
        this.tsActionLoading.set(null);
      }
    });
  }

  // ── Filter helpers ──
  onSearch(val: string) { this.searchQ.set(val); this.currentPage.set(1); }
  setFilter(f: string) { this.statusFilter.set(f); this.currentPage.set(1); }

  // ── Week navigation ──
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
    const end = new Date(this.weekStart); end.setDate(end.getDate() + 6);
    return this.weekStart <= today && today <= end;
  }

  // ── Bar helpers ──
  weekBarPct(hours: number): number { return Math.min(110, Math.round((hours / 40) * 100)); }
  dayBarPct(hours: number): number { return Math.min(100, Math.round((hours / 8) * 100)); }

  // ── Helpers ──
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getColor(id: any): string {
    return this.colorPool[(Number(id) || 0) % this.colorPool.length];
  }

  parseHours(h: string): number {
    if (!h) return 0;
    const p = h.toString().split(':');
    return parseInt(p[0] || '0') + (parseInt(p[1] || '0') / 60);
  }

  formatHours(h: string): string {
    if (!h) return '—';
    const p = h.toString().split(':');
    const hr = parseInt(p[0] || '0'), mn = parseInt(p[1] || '0');
    if (!hr && !mn) return '—';
    return mn ? `${hr}h ${mn}m` : `${hr}h`;
  }

  workTypeClass(type: string): string {
    const t = (type || '').toLowerCase();
    if (t === 'development') return 'wt-dev';
    if (t === 'meeting') return 'wt-meet';
    if (t === 'testing') return 'wt-test';
    if (t === 'research') return 'wt-res';
    if (t === 'design') return 'wt-design';
    if (t === 'review') return 'wt-review';
    if (t === 'editing') return 'wt-edit';
    return 'wt-dev';
  }

  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  dateStr(raw: string): string { return raw ? raw.split('T')[0] : ''; }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr.split('T')[0] + 'T00:00:00')
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const clean = timeStr.toString().split('.')[0].substring(0, 5);
    const [h, m] = clean.split(':').map(Number);
    if (isNaN(h)) return '—';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
}