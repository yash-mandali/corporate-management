import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { TimesheetService } from '../../services/timesheet-service/timesheet-service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../services/toast-service/toast';

@Component({
  selector: 'app-manager-dashboard',
  imports: [FormsModule, RouterLink],
  templateUrl: './managerdashboard.html',
  styleUrl: './managerdashboard.css',
})
export class ManagerDashboard implements OnInit, OnDestroy {
  leaveUserName = signal<any[]>([]);
  // ── Core state ──
  managerId = signal<any>(null);
  managerInfo = signal<any>(null);
  ManagerTeam = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  pendingLeaves = signal<any[]>([]);
  pendingTimesheets = signal<any[]>([]);

  // ── Loading flags ──
  attLoading = signal(false);
  leaveLoading = signal(false);
  tsLoading = signal(false);

  // ── Action state ──
  actionLoading = signal<any>(null);
  tsActionLoading = signal<any>(null);
  rejectModal = signal<any | null>(null);
  rejectReason = '';

  // ── Filter ──
  attFilter = signal<'all' | 'in' | 'out' | 'absent'>('all');

  // ── Date strings ──
  greeting = '';
  todayDate = '';
  todayDay = '';

  // ── Manager's own attendance ──
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

  // ── Date display (used in the card) ──
  todayNum = '';
  todayMonth = '';

  // ── Color pool for avatars ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085',
    '#2c3e50', '#1e8449',
  ];

  // ── Computed: summary ──
  totalEmployees = computed(() => this.ManagerTeam().length);
  pendingLeaveCount = computed(() => this.pendingLeaves().length);
  pendingTimesheetCount = computed(() => this.pendingTimesheets().length);

  todayPresent = computed(() => {
    const today = this.localDate(new Date());
    return this.allAttendance().filter(r =>
      r.date?.toString().startsWith(today) && r.isCheckIn
    ).length;
  });

  todayAbsent = computed(() => {
    const today = this.localDate(new Date());
    const checkedIn = new Set(
      this.allAttendance()
        .filter(r => r.date?.toString().startsWith(today) && r.isCheckIn)
        .map(r => r.userId)
    );
    return this.ManagerTeam().filter(u => !checkedIn.has(u.id)).length;
  });

  todayPresentPct = computed(() => {
    const total = this.totalEmployees();
    if (!total) return 0;
    return Math.round((this.todayPresent() / total) * 100);
  });

  absentPct = computed(() => {
    const total = this.totalEmployees();
    if (!total) return 0;
    return Math.round((this.todayAbsent() / total) * 100);
  });

  // SVG ring offset
  ringOffset = computed(() => {
    const pct = this.todayPresentPct();
    return 213.6 - (213.6 * pct) / 100;
  });

  // ── Computed: today's attendance enriched ──
  todayAttendance = computed(() => {
    const today = this.localDate(new Date());
    const recs = this.allAttendance().filter(r => r.date?.toString().startsWith(today));
    const recMap = new Map(recs.map(r => [r.userId, r]));

    return this.ManagerTeam().map(u => {
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

  // ── Computed: filtered by tab, active users always on top ──
  filteredAttendance = computed(() => {
    const f = this.attFilter();
    const all = this.todayAttendance();

    let list = all;
    if (f === 'in') list = all.filter(e => e.isCheckIn && !e.isCheckOut);
    else if (f === 'out') list = all.filter(e => e.isCheckOut);
    else if (f === 'absent') list = all.filter(e => !e.isCheckIn);

    // 0 = active (checked in, not out)  →  1 = done (checked out)  →  2 = absent
    return list.slice().sort((a, b) => {
      const rank = (e: any) =>
        e.isCheckIn && !e.isCheckOut ? 0 : e.isCheckOut ? 1 : 2;
      return rank(a) - rank(b);
    });
  });

  // Show only first 5 in dashboard
  slicedAttendance = computed(() => this.filteredAttendance().slice(0, 5));

  managerName = computed(() => this.managerInfo()?.userName || 'Manager');

  constructor(
    private auth: Authservice,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private timesheetService: TimesheetService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.setGreeting();
    const id = this.auth.getUserId();
    if (id) {
      this.managerId.set(id);
      this.loadManagerInfo();
      this.loadManagerTeam();
      this.loadTodayAttendance();
      this.loadTeamPendingLeaves();
      this.leaveService.autorejectLeave().subscribe();
      this.loadPendingTimesheets();
      this.attendanceService.autoCheckout().subscribe();
      this.restoreTodayAttendance();
    }
  }
  ngOnDestroy() {
    this.stopTimer();
    if (this.autoCheckoutTimeout) { clearTimeout(this.autoCheckoutTimeout); }
  }
  restoreTodayAttendance() {
    this.attendanceService.getByUID(this.managerId()).subscribe({
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
    this.attendanceService.checkIn(this.managerId()).subscribe({
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
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    );
  }

  calcWorkHours(from: Date, to: Date): string {
    const d = to.getTime() - from.getTime();
    return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
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

  // ── Data loaders ──
  loadManagerInfo() {
    this.userService.getUserById(this.managerId()).subscribe({
      next: res => {
        this.managerInfo.set(res)       
      },
      error: err => console.error('loadManagerInfo:', err)
    });
  }

  loadManagerTeam() {
    this.userService.getManagerTeam(this.managerId()).subscribe({
      next: (res: any) => {
        this.ManagerTeam.set(Array.isArray(res) ? res : res ? [res] : []);
      },
      error: err => console.error('ManagerTeam:', err)
    });
  }

  loadTodayAttendance() {
    this.attLoading.set(true);
    this.attendanceService.getTeamAllattendance(this.managerId()).subscribe({
      next: (res: any) => {
        this.allAttendance.set(Array.isArray(res) ? res : res ? [res] : []);
        this.attLoading.set(false);
      },
      error: err => { console.error('loadAttendance:', err); this.attLoading.set(false); }
    });
  }

  loadTeamPendingLeaves() {
    this.leaveLoading.set(true);
    this.leaveService.getTeamAllPendingleaves(this.managerId()).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res)
          ? res[0]?.data ?? res
          : res?.data ?? (res ? [res] : []);
        this.pendingLeaves.set(list);
      //  console.log("pending leaves: ",this.pendingLeaves());
        
        this.leaveLoading.set(false);
      },
      error: err => { console.error('loadPendingLeaves:', err); this.leaveLoading.set(false); }
    });
  }

  loadPendingTimesheets() {
    this.tsLoading.set(true);
    this.timesheetService.getEntryByStatus('Submitted').subscribe({
      next: (res: any) => {
        this.pendingTimesheets.set(Array.isArray(res) ? res : res ? [res] : []);
        this.tsLoading.set(false);
      },
      error: err => { console.error('loadPendingTimesheets:', err); this.tsLoading.set(false); }
    });
  }

  // ── Leave actions ──
  approveLeave(leaveRequestId: any) {
    this.actionLoading.set(leaveRequestId);
    this.leaveService.managerApproveleave(leaveRequestId).subscribe({
      next: () => {
        this.pendingLeaves.update(l => l.filter(x => x.leaveRequestId !== leaveRequestId));
        this.actionLoading.set(null);
        this.toast.success('Leave approved.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to approve.');
        this.actionLoading.set(null);
      }
    });
  }

  rejectLeave(leaveRequestId: any) {
    this.actionLoading.set(leaveRequestId);
    this.leaveService.managerRejectleave(leaveRequestId).subscribe({
      next: () => {
        this.pendingLeaves.update(l => l.filter(x => x.leaveRequestId !== leaveRequestId));
        this.actionLoading.set(null);
        this.toast.success('Leave rejected.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to reject.');
        this.actionLoading.set(null);
      }
    });
  }

  // ── Timesheet actions ──
  approveTimesheet(timesheetId: any) {
    this.tsActionLoading.set(timesheetId);
    this.timesheetService.managerApproveEntry(timesheetId).subscribe({
      next: () => {
        this.pendingTimesheets.update(l => l.filter(x => x.timesheetId !== timesheetId));
        this.tsActionLoading.set(null);
        this.toast.success('Timesheet approved.');
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
        this.pendingTimesheets.update(l => l.filter(x => x.timesheetId !== entry.timesheetId));
        this.tsActionLoading.set(null);
        this.closeRejectModal();
        this.toast.success('Timesheet rejected.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to reject.');
        this.tsActionLoading.set(null);
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
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
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

  formatTsHours(totalHours: string): string {
    if (!totalHours) return '—';
    const [h, m] = totalHours.toString().split(':').map(Number);
    if (!h && !m) return '—';
    return m ? `${h}h ${m}m` : `${h}h`;
  }
}