import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { LowerCasePipe } from '@angular/common';
import { LeaveService } from '../../services/leave-service/leave-service';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { TimesheetService } from '../../services/timesheet-service/timesheet-service';
import { ToastrService } from 'ngx-toastr';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboardpage',
  imports: [RouterLink, LowerCasePipe, DatePipe,SlicePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboardpage implements OnInit, OnDestroy {

  // ── State ──
  myLeaves = signal<any[]>([]);
  myAttendance = signal<any[]>([]);
  isLoading = false;
  userId = signal<any>(null);
  userInfo = signal<any>(null);

  // ── Attendance check-in ──
  checkedIn = signal(false);
  checkedOut = signal(false);
  checkInTime = signal<string | null>(null);
  checkOutTime = signal<string | null>(null);
  attendanceLoading = signal(false);
  attendanceId = signal<any>(null);
  private elapsedInterval: any;
  private checkInDate: Date | null = null;
  elapsedTime = signal('00:00:00');
  workHours = signal<string | null>(null);
  private autoCheckoutTimeout: any;

  // ── Timesheet state ──
  myTimesheets = signal<any[]>([]);
  tsLoading = signal(false);

  tsWeekHours = computed(() => {
    const { start, end } = this.currentWeekRange();
    return Math.round(
      this.myTimesheets()
        .filter(t => { const d = this.dateStr(t.workDate); return d >= start && d <= end; })
        .reduce((s, t) => s + this.parseTsHours(t.totalHours), 0) * 10
    ) / 10;
  });

  tsTodayHours = computed(() => {
    const today = this.localDate(new Date());
    return Math.round(
      this.myTimesheets()
        .filter(t => this.dateStr(t.workDate) === today)
        .reduce((s, t) => s + this.parseTsHours(t.totalHours), 0) * 10
    ) / 10;
  });

  tsWeekProgress = computed(() => Math.min(110, Math.round((this.tsWeekHours() / 40) * 100)));
  tsDraftCount = computed(() => this.myTimesheets().filter(t => t.status === 'Draft').length);
  tsSubmittedCount = computed(() => this.myTimesheets().filter(t => t.status === 'Submitted').length);
  tsApprovedCount = computed(() => this.myTimesheets().filter(t => t.status === 'Approved').length);

  recentTimesheets = computed(() => {
    const { start, end } = this.currentWeekRange();
    return [...this.myTimesheets()]
      .filter(t => { const d = this.dateStr(t.workDate); return d >= start && d <= end; })
      .sort((a, b) => this.dateStr(b.workDate).localeCompare(this.dateStr(a.workDate)))
      .slice(0, 3);
  });

  // ── Today header ──
  greeting = '';
  todayDay = '';
  todayDate = '';
  todayNum = '';
  todayMonth = '';

  // ── Leave computed ──
  totalLeaves = computed(() => this.myLeaves().length);
  pendingLeaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'pending').length);
  approvedLeaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'approved').length);
  rejectedLeaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'rejected').length);
  recentLeaves = computed(() =>
    [...this.myLeaves()]
      .sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime())
      .slice(0, 3)
  );

  // ── Attendance computed ──
  presentCount = computed(() => this.myAttendance().filter(r => r.status === 'Present').length);
  absentCount = computed(() => this.myAttendance().filter(r => r.status === 'Absent').length);
  lateCount = computed(() => this.myAttendance().filter(r => r.status === 'Late').length);

  attendanceRate = computed(() => {
    const workdays = this.myAttendance().filter(r => r.status !== 'Weekend').length;
    if (!workdays) return 0;
    const attended = this.myAttendance().filter(r => r.status === 'Present' || r.status === 'Late').length;
    return Math.round((attended / workdays) * 100);
  });

  attPct = (count: number): string => {
    const total = this.myAttendance().filter(r => r.status !== 'Weekend').length;
    if (!total) return '0%';
    return Math.min(100, Math.round((count / total) * 100)) + '%';
  };

  // ── User ──
  userName = computed(() => this.userInfo()?.userName || 'Employee');
  initials = computed(() => {
    const name = this.userInfo()?.userName || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'E';
  });

  constructor(
    private auth: Authservice,
    private leaveService: LeaveService,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private timesheetService: TimesheetService,
    private toast: ToastrService
  ) { }

  ngOnInit() {
    this.setDateInfo();
    const id = this.auth.getUserId();
    if (id) {
      this.userId.set(id);
      this.loadUser();
      this.loadLeaves();
      this.loadAttendance();
      this.loadTimesheets();
      this.attendanceService.autoCheckout().subscribe();
      this.restoreTodayAttendance();

      // console.log("check userinfo: ",this.userInfo());
      
    }
  }

  ngOnDestroy() {
    this.stopTimer();
    if (this.autoCheckoutTimeout) { clearTimeout(this.autoCheckoutTimeout); }
  }

  setDateInfo() {
    const hour = new Date().getHours();
    this.greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const now = new Date();
    this.todayDay = now.toLocaleDateString('en-IN', { weekday: 'long' });
    this.todayDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    this.todayNum = String(now.getDate());
    this.todayMonth = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  loadLeaves() {
    this.isLoading = true;
    this.leaveService.getMyleaveList(this.userId()).subscribe({
      next: res => { this.myLeaves.set(res); this.isLoading = false; },
      error: err => { console.error(err); this.isLoading = false; }
    });
  }

  loadUser() {
    this.userService.getUserById(this.userId()).subscribe({
      next: res => {
        this.userInfo.set(res),
          console.log("loaduser:: ",this.userInfo());
     
      },
      error: err => console.error(err)
    });
  }

  loadAttendance() {
    this.attendanceService.getByUID(this.userId()).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res ? [res] : [];
        this.myAttendance.set(list);
      },
      error: err => console.error('loadAttendance error:', err)
    });
  }

  restoreTodayAttendance() {
    this.attendanceService.getByUID(this.userId()).subscribe({
      next: (records: any[]) => {
        const now = new Date();
        const todayStr = this.localDate(now);
        const rec = records.find(r => (r.date ?? '').toString().trim().startsWith(todayStr));
        if (!rec) return;

        const aid = rec.aId ?? rec.attendanceId ?? rec.id;
        if (aid) this.attendanceId.set(aid);

        if (rec.isCheckIn && rec.checkIn) {
          const ciDate = new Date(`${todayStr}T${rec.checkIn.toString().split('.')[0]}`);
          this.checkInDate = isNaN(ciDate.getTime()) ? now : ciDate;
          this.checkInTime.set(this.formatTime(rec.checkIn));
          this.checkedIn.set(true);
        }

        if (rec.isCheckOut && rec.checkOut) {
          const coDate = new Date(`${todayStr}T${rec.checkOut.toString().split('.')[0]}`);
          this.checkOutTime.set(this.formatTime(rec.checkOut));
          this.checkedOut.set(true);
          if (this.checkInDate) {
            this.workHours.set(this.calcWorkHours(this.checkInDate, isNaN(coDate.getTime()) ? now : coDate));
          }
        } else if (rec.isCheckIn) {
          this.startTimer();
          this.scheduleAutoCheckout();
        }
      },
      error: err => console.error('restoreTodayAttendance error:', err)
    });
  }

  checkIn() {
    if (this.attendanceLoading()) return;
    this.attendanceLoading.set(true);
    this.attendanceService.checkIn(this.userId()).subscribe({
      next: (res: any) => {
        const aid = res?.attendanceId ?? res?.AttendanceId ?? res?.aId;
        if (aid) this.attendanceId.set(aid);
        const now = new Date();
        this.checkInDate = now;
        this.checkInTime.set(this.formatTime(now.toISOString()));
        this.checkedIn.set(true);
        this.attendanceLoading.set(false);
        this.startTimer();
        this.scheduleAutoCheckout();
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Check-in failed.');
        this.attendanceLoading.set(false);
      }
    });
  }

  checkOut() {
    if (this.attendanceLoading()) return;
    this.attendanceLoading.set(true);
    this.attendanceService.checkOut(this.attendanceId()).subscribe({
      next: () => {
        const now = new Date();
        this.checkOutTime.set(this.formatTime(now.toISOString()));
        this.checkedOut.set(true);
        this.attendanceLoading.set(false);
        if (this.checkInDate) this.workHours.set(this.calcWorkHours(this.checkInDate, now));
        this.stopTimer();
        if (this.autoCheckoutTimeout) { clearTimeout(this.autoCheckoutTimeout); this.autoCheckoutTimeout = null; }
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Check-out failed.');
        this.attendanceLoading.set(false);
      }
    });
  }

  scheduleAutoCheckout() {
    if (this.autoCheckoutTimeout) { clearTimeout(this.autoCheckoutTimeout); }
    const now = new Date();
    const cutoff = new Date(); cutoff.setHours(21, 0, 0, 0);
    const ms = cutoff.getTime() - now.getTime();
    if (ms <= 0) this.performAutoCheckout();
    else this.autoCheckoutTimeout = setTimeout(() => this.performAutoCheckout(), ms);
  }

  performAutoCheckout() {
    if (!this.checkedIn() || this.checkedOut() || !this.attendanceId()) return;
    this.attendanceService.checkOut(this.attendanceId()).subscribe({
      next: () => {
        const now = new Date();
        this.checkOutTime.set(this.formatTime(now.toISOString()));
        this.checkedOut.set(true);
        if (this.checkInDate) this.workHours.set(this.calcWorkHours(this.checkInDate, now));
        this.stopTimer();
        // this.toast.info('Auto checked out at 9:00 PM.', 'Auto Checkout', { timeOut: 8000, progressBar: true });
      },
      error: () => this.toast.warning('Auto check-out failed.', 'Auto Checkout Failed', { timeOut: 10000, progressBar: true })
    });
  }

  startTimer() {
    this.stopTimer();
    this.updateElapsed();
    this.elapsedInterval = setInterval(() => this.updateElapsed(), 1000);
  }

  stopTimer() {
    if (this.elapsedInterval) { clearInterval(this.elapsedInterval); this.elapsedInterval = null; }
  }

  updateElapsed() {
    if (!this.checkInDate) return;
    const d = Date.now() - this.checkInDate.getTime();
    const h = Math.floor(d / 3600000);
    const m = Math.floor((d % 3600000) / 60000);
    const s = Math.floor((d % 60000) / 1000);
    this.elapsedTime.set(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '00')}:${String(s).padStart(2, '0')}`);
  }

  calcWorkHours(from: Date, to: Date): string {
    const d = to.getTime() - from.getTime();
    return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
  }

  loadTimesheets() {
    this.tsLoading.set(true);
    this.timesheetService.getEntryByUserId(this.userId()).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res ? [res] : [];
        this.myTimesheets.set(list);
        this.tsLoading.set(false);
      },
      error: err => { console.error('loadTimesheets:', err); this.tsLoading.set(false); }
    });
  }

  parseTsHours(totalHours: string): number {
    if (!totalHours) return 0;
    const p = totalHours.toString().split(':');
    return parseInt(p[0]) + (parseInt(p[1] || '0') / 60);
  }

  formatTsHours(totalHours: string): string {
    if (!totalHours) return '—';
    const p = totalHours.toString().split(':');
    const h = parseInt(p[0]), m = parseInt(p[1] || '0');
    if (h === 0 && m === 0) return '—';
    if (m === 0) return h + 'h';
    if (h === 0) return m + 'm';
    return h + 'h ' + m + 'm';
  }

  dateStr(raw: string): string {
    if (!raw) return '';
    return raw.split('T')[0];
  }

  currentWeekRange(): { start: string; end: string } {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: this.localDate(mon), end: this.localDate(sun) };
  }

  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    const clean = timeStr.toString().split('.')[0];
    const parts = clean.split(':');
    if (parts.length >= 2 && !timeStr.includes('T') && !timeStr.includes('-')) {
      let h = parseInt(parts[0]);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${parts[1]} ${ampm}`;
    }
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  typeColor(type: string): string {
    if (type?.includes('Annual')) return 'teal';
    if (type?.includes('Sick')) return 'red';
    if (type?.includes('Emergency')) return 'amber';
    if (type?.includes('Comp')) return 'green';
    return 'teal';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
}