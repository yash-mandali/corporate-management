import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LeaveService } from '../../services/leave-service/leave-service';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboardpage',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboardpage implements OnInit, OnDestroy {

  // ── Leave state ──
  myLeaves = signal<any[]>([]);
  isLoading = false;
  userId = signal<any>(null);
  userInfo = signal<any>(null);

  // ── Attendance state ──
  checkedIn = signal(false);
  checkedOut = signal(false);
  checkInTime = signal<string | null>(null);
  checkOutTime = signal<string | null>(null);
  attendanceLoading = signal(false);
  attendanceId = signal<any>(null);

  // ── Elapsed live timer ──
  private elapsedInterval: any;
  private checkInDate: Date | null = null;
  elapsedTime = signal('00:00:00');
  workHours = signal<string | null>(null);

  // ── Auto checkout timer ──
  private autoCheckoutTimeout: any;

  // ── Computed leave stats ──
  totalLeaves = computed(() => this.myLeaves().length);
  pendingLeaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'pending').length);
  approvedLeaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'approved').length);
  rejectedLeaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'rejected').length);

  recentLeaves = computed(() =>
    [...this.myLeaves()]
      .sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime())
      .slice(0, 5)
  );

  userName = computed(() => this.userInfo()?.userName || 'Employee');

  greeting = '';
  todayDay = '';
  todayDate = '';

  constructor(
    private auth: Authservice,
    private leaveService: LeaveService,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private toast: ToastrService
  ) { }

  ngOnInit() {
    this.setGreeting();
    const id = this.auth.getUserId();
    if (id) {
      this.userId.set(id);
      this.loadLeaves();
      this.loadUser();
      this.attendanceService.autoCheckout().subscribe();
      this.restoreTodayAttendance();
    }
  }

  ngOnDestroy() {
    this.stopTimer();
    if (this.autoCheckoutTimeout) {
      clearTimeout(this.autoCheckoutTimeout);
      this.autoCheckoutTimeout = null;
    }
  }

  // ── Greeting + date ──
  setGreeting() {
    const hour = new Date().getHours();
    this.greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const now = new Date();
    this.todayDay = now.toLocaleDateString('en-IN', { weekday: 'long' });
    this.todayDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Data loaders ──
  loadLeaves() {
    this.isLoading = true;
    this.leaveService.getMyleaveList(this.userId()).subscribe({
      next: (res) => { this.myLeaves.set(res); this.isLoading = false; },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  loadUser() {
    this.userService.getUserById(this.userId()).subscribe({
      next: (res) => this.userInfo.set(res),
      error: (err) => console.error(err)
    });
  }

  // ── Restore today's attendance on page load ──
  restoreTodayAttendance() {
    this.attendanceService.getByUID(this.userId()).subscribe({
      next: (records: any[]) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const todayRecord = records.find(r =>
          (r.date ?? '').toString().trim().startsWith(todayStr)
        );

        if (!todayRecord) return;

        const aid = todayRecord.aId ?? todayRecord.attendanceId ?? todayRecord.id;
        if (aid) this.attendanceId.set(aid);

        if (todayRecord.isCheckIn && todayRecord.checkIn) {
          const ciClean = todayRecord.checkIn.toString().split('.')[0];
          const ciDate = new Date(`${todayStr}T${ciClean}`);
          this.checkInDate = isNaN(ciDate.getTime()) ? now : ciDate;
          this.checkInTime.set(this.formatTime(todayRecord.checkIn));
          this.checkedIn.set(true);
        }

        if (todayRecord.isCheckOut && todayRecord.checkOut) {
          const coClean = todayRecord.checkOut.toString().split('.')[0];
          const coDate = new Date(`${todayStr}T${coClean}`);
          this.checkOutTime.set(this.formatTime(todayRecord.checkOut));
          this.checkedOut.set(true);
          if (this.checkInDate) {
            this.workHours.set(this.calcWorkHours(
              this.checkInDate,
              isNaN(coDate.getTime()) ? now : coDate
            ));
          }
        } else if (todayRecord.isCheckIn) {
          // Still checked in — resume timer and schedule auto checkout
          this.startTimer();
          this.scheduleAutoCheckout();
        }
      },
      error: (err) => console.error('restoreTodayAttendance error:', err)
    });
  }

  // ── Check In ──
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
        this.scheduleAutoCheckout(); // schedule 11 PM auto checkout
        // this.toast.success('Checked in successfully!');
      },
      error: (err) => {
        console.error('CheckIn error:', err);
        this.toast.error(err?.error?.message ?? 'Check-in failed. Please try again.');
        this.attendanceLoading.set(false);
      }
    });
  }

  // ── Check Out ──
  checkOut() {
    if (this.attendanceLoading()) return;
    this.attendanceLoading.set(true);

    this.attendanceService.checkOut(this.attendanceId()).subscribe({
      next: (res: any) => {
        const now = new Date();
        this.checkOutTime.set(this.formatTime(now.toISOString()));
        this.checkedOut.set(true);
        this.attendanceLoading.set(false);
        if (this.checkInDate) {
          this.workHours.set(this.calcWorkHours(this.checkInDate, now));
        }
        this.stopTimer();
        // Cancel the scheduled auto checkout since user checked out manually
        if (this.autoCheckoutTimeout) {
          clearTimeout(this.autoCheckoutTimeout);
          this.autoCheckoutTimeout = null;
        }
        // this.toast.success('Checked out successfully!');
      },
      error: (err) => {
        console.error('CheckOut error:', err);
        this.toast.error(err?.error?.message ?? 'Check-out failed. Please try again.');
        this.attendanceLoading.set(false);
      }
    });
  }


  // ── Auto Checkout at 11 PM ──
  scheduleAutoCheckout() {
    // Clear any existing auto-checkout timer first
    if (this.autoCheckoutTimeout) {
      clearTimeout(this.autoCheckoutTimeout);
      this.autoCheckoutTimeout = null;
    }

    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(23, 0, 0, 0); // 11:00 PM today

    const msUntilCutoff = cutoff.getTime() - now.getTime();

    if (msUntilCutoff <= 0) {
      // Already past 11 PM — checkout immediately
      this.performAutoCheckout();
    } else {
      // Schedule checkout at exactly 11 PM
      this.autoCheckoutTimeout = setTimeout(() => {
        this.performAutoCheckout();
      }, msUntilCutoff);

      console.log(`Auto checkout scheduled in ${Math.round(msUntilCutoff / 60000)} minutes.`);
    }
  }

  performAutoCheckout() {
    // Guard: only run if checked in but not yet checked out
    if (!this.checkedIn() || this.checkedOut()) return;
    // Guard: must have a valid attendance ID to call the API
    if (!this.attendanceId()) {
      console.warn('Auto checkout: no attendanceId available.');
      return;
    }

    this.attendanceService.checkOut(this.attendanceId()).subscribe({
      next: () => {
        const now = new Date();
        this.checkOutTime.set(this.formatTime(now.toISOString()));
        this.checkedOut.set(true);
        if (this.checkInDate) {
          this.workHours.set(this.calcWorkHours(this.checkInDate, now));
        }
        this.stopTimer();
        this.autoCheckoutTimeout = null;
        this.toast.info('You were automatically checked out at 11:00 PM.', 'Auto Checkout', {
          timeOut: 8000,
          progressBar: true,
        });
      },
      error: (err) => {
        console.error('Auto checkout error:', err);
        this.toast.warning('Auto check-out failed. Please check out manually.', 'Auto Checkout Failed', {
          timeOut: 10000,
          progressBar: true,
        });
      }
    });
  }

  // ── Timer helpers ──
  startTimer() {
    this.stopTimer();
    this.updateElapsed();
    this.elapsedInterval = setInterval(() => this.updateElapsed(), 1000);
  }

  stopTimer() {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  updateElapsed() {
    if (!this.checkInDate) return;
    const diffMs = Date.now() - this.checkInDate.getTime();
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    this.elapsedTime.set(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    );
  }

  calcWorkHours(from: Date, to: Date): string {
    const diffMs = to.getTime() - from.getTime();
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    const clean = timeStr.toString().split('.')[0];
    const parts = clean.split(':');
    if (parts.length >= 2 && !timeStr.includes('T') && !timeStr.includes('-')) {
      let hour = parseInt(parts[0]);
      const min = parts[1];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${min} ${ampm}`;
    }
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  barWidth(count: number): string {
    const total = this.totalLeaves();
    if (!total) return '0%';
    return Math.round((count / total) * 100) + '%';
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