import { Component, computed, signal, OnInit } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { TimesheetService } from '../../services/timesheet-service/timesheet-service';

@Component({
  selector: 'app-manager-team',
  imports: [LowerCasePipe],
  templateUrl: './managerteamspage.html',
  styleUrl: './managerteamspage.css',
})
export class Managerteampage implements OnInit {

  // ── Raw data ──
  rawUsers = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  allLeaves = signal<any[]>([]);
  allTimesheets = signal<any[]>([]);
  isLoading = signal(false);

  // ── UI state ──
  viewMode = signal<'grid' | 'list'>('grid');
  searchQ = signal('');
  statusFilter = signal('all');
  selectedEmployee = signal<any | null>(null);

  // ── Color pool ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Enriched employees ──
  enrichedEmployees = computed(() => {
    const today = this.localDate(new Date());
    const todayAtt = this.allAttendance().filter(r => r.date?.toString().startsWith(today));
    const todayMap = new Map(todayAtt.map(r => [r.userId, r]));

    // Current month attendance
    const now = new Date();
    const monthAtt = this.allAttendance().filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });

    // Current week range
    const { ws, we } = this.currentWeekRange();
    const weekTs = this.allTimesheets().filter(t =>
      (t.status === 'Approved' || t.status === 'Submitted') &&
      this.dateStr(t.workDate) >= ws && this.dateStr(t.workDate) <= we
    );

    return this.rawUsers().map(u => {
      // Today status
      const todayRec = todayMap.get(u.id);
      const isActive = !!(todayRec?.isCheckIn);

      // Monthly attendance
      const userMonthAtt = monthAtt.filter(r => r.userId === u.id && r.status !== 'Weekend');
      const workdays = userMonthAtt.length;
      const presentDays = userMonthAtt.filter(r => r.status === 'Present').length;
      const lateDays = userMonthAtt.filter(r => r.status === 'Late').length;
      const absentDays = userMonthAtt.filter(r => r.status === 'Absent').length;
      const attendanceRate = workdays
        ? Math.round(((presentDays + lateDays) / workdays) * 100)
        : 0;

      // Week hours
      const weekHours = Math.round(
        weekTs.filter(t => t.userId === u.id)
          .reduce((s: number, t: any) => s + this.parseHours(t.totalHours), 0) * 10
      ) / 10;

      // Leaves
      const userLeaves = this.allLeaves().filter(l => l.userId === u.id);
      const pendingLeaves = userLeaves.filter(l => l.status === 'Pending').length;
      const approvedLeaves = userLeaves.filter(l => l.status === 'Approved').length;
      const rejectedLeaves = userLeaves.filter(l => l.status === 'Rejected').length;
      const totalLeaves = userLeaves.length;

      return {
        ...u,
        isActive, attendanceRate,
        presentDays, lateDays, absentDays,
        weekHours, pendingLeaves, approvedLeaves, rejectedLeaves, totalLeaves,
      };
    });
  });

  // ── Filtered list ──
  filteredEmployees = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const sf = this.statusFilter();
    return this.enrichedEmployees().filter(emp => {
      const matchQ = !q ||
        (emp.userName || '').toLowerCase().includes(q) ||
        (emp.roleName || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q);
      const matchS = sf === 'all'
        || (sf === 'active' && emp.isActive)
        || (sf === 'offline' && !emp.isActive);
      return matchQ && matchS;
    });
  });

  // ── Counts ──
  totalEmployees = computed(() => this.enrichedEmployees().length);
  activeCount = computed(() => this.enrichedEmployees().filter(e => e.isActive).length);
  offlineCount = computed(() => this.enrichedEmployees().filter(e => !e.isActive).length);

  // ── Selected employee timesheets (last 5) ──
  selectedEmpTimesheets = computed(() => {
    const emp = this.selectedEmployee();
    if (!emp) return [];
    return this.allTimesheets()
      .filter(t => t.userId === emp.id)
      .sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime())
      .slice(0, 3);
  });

  constructor(
    private userService: UserService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private timesheetService: TimesheetService
  ) { }

  ngOnInit() {
    this.isLoading.set(true);
    this.loadAllData();
  }

  loadAllData() {
    let pending = 3;
    const done = () => { if (--pending === 0) this.isLoading.set(false); };

    this.userService.getAllEmployee().subscribe({
      next: (res: any) => { this.rawUsers.set(Array.isArray(res) ? res : res ? [res] : []); done(); },
      error: err => { console.error('users:', err); done(); }
    });

    this.attendanceService.getAllattendance().subscribe({
      next: (res: any) => { this.allAttendance.set(Array.isArray(res) ? res : res ? [res] : []); done(); },
      error: err => { console.error('attendance:', err); done(); }
    });

    this.leaveService.getAllLeaves().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? (res ? [res] : []);
        this.allLeaves.set(list); done();
      },
      error: err => { console.error('leaves:', err); done(); }
    });

    this.timesheetService.getAllEntry().subscribe({
      next: (res: any) => { this.allTimesheets.set(Array.isArray(res) ? res : res ? [res] : []); },
      error: err => console.error('timesheets:', err)
    });
  }

  // ── Detail drawer ──
  openDetail(emp: any) {
    this.selectedEmployee.set(emp);
    document.body.style.overflow = 'hidden';
  }

  closeDetail() {
    this.selectedEmployee.set(null);
    document.body.style.overflow = '';
  }

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
    return mn ? `${hr}h ${mn}m` : `${hr}h`;
  }

  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  dateStr(raw: string): string { return raw ? raw.split('T')[0] : ''; }

  currentWeekRange(): { ws: string; we: string } {
    const now = new Date();
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { ws: this.localDate(mon), we: this.localDate(sun) };
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr.split('T')[0] + 'T00:00:00')
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  workTypeClass(type: string): string {
    const t = (type || '').toLowerCase();
    if (t === 'development') return 'wt-dev';
    if (t === 'meeting') return 'wt-meet';
    if (t === 'testing') return 'wt-test';
    if (t === 'research') return 'wt-res';
    if (t === 'design') return 'wt-design';
    if (t === 'review') return 'wt-review';
    return 'wt-dev';
  }
}