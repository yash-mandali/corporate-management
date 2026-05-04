import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { Authservice } from '../../services/Auth-service/authservice';
import { ToastService } from '../../services/toast-service/toast';

@Component({
  selector: 'app-hr-dashboard',
  imports: [RouterLink],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css',
})
export class HrDashboard implements OnInit, OnDestroy {

  // ── Raw data ──
  hrId = signal<any>(null);
  hrInfo = signal<any>(null);
  allEmployees = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  allLeaves = signal<any[]>([]);
  pendingLeaves = signal<any[]>([]);

  // ── Loading ──
  empLoading = signal(false);
  attLoading = signal(false);
  leaveLoading = signal(false);
  actionLoading = signal<any>(null);

  // ── Filters ──
  attFilter = signal<'all' | 'present' | 'absent'>('all');

  // ── HR's own attendance ──
  checkedIn = signal(false);
  checkedOut = signal(false);
  checkInTime = signal<string | null>(null);
  checkOutTime = signal<string | null>(null);
  attendanceLoading = signal(false);
  attendanceId = signal<any>(null);
  elapsedTime = signal('00:00:00');
  workHours = signal<string | null>(null);
  private elapsedInterval: any;
  private checkInDate: Date | null = null;
  private autoCheckoutTimeout: any;

  // ── Date strings ──
  greeting = '';
  todayDate = '';
  todayDay = '';
  todayNum = '';
  todayMonth = '';

  // ── Color pool ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed ──
  hrName = computed(() => this.hrInfo()?.userName || 'HR');
  totalEmployees = computed(() => this.allEmployees().length);

  newJoineesCount = computed(() => {
    const now = new Date();
    return this.allEmployees().filter(e => {
      if (!e.createdAt) return false;
      const d = new Date(e.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  });

  recentEmployees = computed(() =>
    [...this.allEmployees()]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 3)
  );

  todayAttendance = computed(() => {
    const today = this.localDate(new Date());
    const recs = this.allAttendance().filter(r => r.date?.toString().startsWith(today));
    const recMap = new Map(recs.map(r => [r.userId, r]));

    return this.allEmployees().map(u => {
      const rec: any = recMap.get(u.id) ?? {};
      return {
        userId: u.id,
        userName: u.userName,
        roleName: u.roleName,
        initials: this.getInitials(u.userName),
        avatarColor: this.getColor(u.id),
        isCheckIn: rec.isCheckIn ?? false,
        isCheckOut: rec.isCheckOut ?? false,
        checkIn: rec.checkIn ?? null,
        checkOut: rec.checkOut ?? null,
        hours: rec.hours ?? null,
      };
    });
  });

  filteredAttendance = computed(() => {
    const f = this.attFilter();
    const all = this.todayAttendance();
    let list = all;
    if (f === 'present') list = all.filter(e => e.isCheckIn);
    else if (f === 'absent') list = all.filter(e => !e.isCheckIn);
    return list.slice().sort((a, b) => {
      const rank = (e: any) =>
        e.isCheckIn && !e.isCheckOut ? 0 : e.isCheckOut ? 1 : 2;
      return rank(a) - rank(b);
    });
  });

  slicedAttendance = computed(() => this.filteredAttendance().slice(0, 3));
  todayPresent = computed(() => this.todayAttendance().filter(e => e.isCheckIn).length);
  todayAbsent = computed(() => this.todayAttendance().filter(e => !e.isCheckIn).length);

  todayPresentPct = computed(() => {
    const t = this.totalEmployees();
    return t ? Math.round((this.todayPresent() / t) * 100) : 0;
  });

  absentPct = computed(() => {
    const t = this.totalEmployees();
    return t ? Math.round((this.todayAbsent() / t) * 100) : 0;
  });

  pendingLeaveCount = computed(() => this.pendingLeaves().length);

  constructor(
    private auth: Authservice,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.setGreeting();
    const id: any = this.auth.getUserId();
    if (id) {
      this.hrId.set(id);
      this.userService.getUserById(id).subscribe({
        next: res => this.hrInfo.set(res),
        error: err => console.error(err)
      });
      this.attendanceService.autoCheckout().subscribe();
      this.restoreTodayAttendance();
    }
    this.loadEmployees();
    this.loadAttendance();
    this.loadManagerApprovedLeaves();
    this.leaveService.autorejectLeave().subscribe();
  }

  ngOnDestroy() {
    this.stopTimer();
    if (this.autoCheckoutTimeout) { clearTimeout(this.autoCheckoutTimeout); }
  }

  setGreeting() {
    const h = new Date().getHours();
    this.greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    const now = new Date();
    this.todayDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    this.todayDay = now.toLocaleDateString('en-IN', { weekday: 'long' });
    this.todayNum = String(now.getDate());
    this.todayMonth = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  // ── HR's own attendance ──
  restoreTodayAttendance() {
    this.attendanceService.getByUID(this.hrId()).subscribe({
      next: (records: any[]) => {
        const todayStr = this.localDate(new Date());
        const rec = records.find(r => (r.date ?? '').toString().trim().startsWith(todayStr));
        if (!rec) return;

        const aid = rec.aId ?? rec.attendanceId ?? rec.id;
        if (aid) this.attendanceId.set(aid);

        if (rec.isCheckIn && rec.checkIn) {
          const ciDate = new Date(`${todayStr}T${rec.checkIn.toString().split('.')[0]}`);
          this.checkInDate = isNaN(ciDate.getTime()) ? new Date() : ciDate;
          this.checkInTime.set(this.formatTime(rec.checkIn));
          this.checkedIn.set(true);
        }

        if (rec.isCheckOut && rec.checkOut) {
          const coDate = new Date(`${todayStr}T${rec.checkOut.toString().split('.')[0]}`);
          this.checkOutTime.set(this.formatTime(rec.checkOut));
          this.checkedOut.set(true);
          if (this.checkInDate) {
            this.workHours.set(this.calcWorkHours(
              this.checkInDate,
              isNaN(coDate.getTime()) ? new Date() : coDate
            ));
          }
        } else if (rec.isCheckIn) {
          this.startTimer();
          this.scheduleAutoCheckout();
        }
      },
      error: err => console.error('restoreTodayAttendance:', err)
    });
  }

  async checkIn() {
    if (this.attendanceLoading()) return;
    this.attendanceLoading.set(true);
    this.attendanceService.checkIn(this.hrId()).subscribe({
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

  async checkOut() {
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
        if (this.autoCheckoutTimeout) {
          clearTimeout(this.autoCheckoutTimeout);
          this.autoCheckoutTimeout = null;
        }
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
      },
      error: () => this.toast.warning('Auto check-out failed.', 'Auto Checkout Failed')
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
    this.elapsedTime.set(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '00')}:${String(s).padStart(2, '0')}`
    );
  }

  calcWorkHours(from: Date, to: Date): string {
    const d = to.getTime() - from.getTime();
    return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
  }

  // ── Data loaders ──
  loadEmployees() {
    this.empLoading.set(true);
    this.userService.getAllEmployeeManager().subscribe({
      next: (res: any) => {
        this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []);
        this.empLoading.set(false);
      },
      error: err => { console.error(err); this.empLoading.set(false); }
    });
  }

  loadAttendance() {
    this.attLoading.set(true);
    this.attendanceService.getAllattendance().subscribe({
      next: (res: any) => {
        this.allAttendance.set(Array.isArray(res) ? res : res ? [res] : []);
        this.attLoading.set(false);
      },
      error: err => { console.error(err); this.attLoading.set(false); }
    });
  }

  loadManagerApprovedLeaves() {
    this.leaveLoading.set(true);
    this.leaveService.getAllLeaves().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? (res ? [res] : []);
        this.allLeaves.set(list);
        this.pendingLeaves.set(list.filter((l: any) => l.status === 'ManagerApproved'));
        this.leaveLoading.set(false);
      },
      error: err => { console.error(err); this.leaveLoading.set(false); }
    });
  }

  approveLeave(leaveRequestId: any) {
    this.actionLoading.set(leaveRequestId);
    this.leaveService.HrApproveleave(leaveRequestId).subscribe({
      next: () => {
        this.pendingLeaves.update(l => l.filter(x => x.leaveRequestId !== leaveRequestId));
        this.allLeaves.update(l => l.map(x =>
          x.leaveRequestId === leaveRequestId ? { ...x, status: 'Approved' } : x
        ));
        this.actionLoading.set(null);
        this.toast.success('Leave approved successfully.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to approve leave.');
        this.actionLoading.set(null);
      }
    });
  }

  rejectLeave(leaveRequestId: any) {
    this.actionLoading.set(leaveRequestId);
    this.leaveService.HrRejectleave(leaveRequestId).subscribe({
      next: () => {
        this.pendingLeaves.update(l => l.filter(x => x.leaveRequestId !== leaveRequestId));
        this.allLeaves.update(l => l.map(x =>
          x.leaveRequestId === leaveRequestId ? { ...x, status: 'Rejected' } : x
        ));
        this.actionLoading.set(null);
        this.toast.success('Leave rejected.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to reject leave.');
        this.actionLoading.set(null);
      }
    });
  }

  // ── Helpers ──
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getColor(id: any): string {
    return this.colorPool[(Number(id) || 0) % this.colorPool.length];
  }

  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const clean = timeStr.toString().split('.')[0];
    const parts = clean.split(':');
    if (timeStr.includes('T') || (timeStr.includes('-') && timeStr.length > 8)) {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    if (parts.length >= 2) {
      let h = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      if (isNaN(h) || isNaN(m)) return '—';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    }
    return '—';
  }
}