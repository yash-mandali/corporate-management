import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LeaveService } from '../../services/leave-service/leave-service';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';

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
    private attendanceService: AttendanceService
  ) { }

  ngOnInit() {
    this.setGreeting();
    const id = this.auth.getUserId();
    if (id) {
      this.userId.set(id);
      this.loadLeaves();
      this.loadUser();
      this.restoreTodayAttendance();
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  setGreeting() {
    const hour = new Date().getHours();
    this.greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const now = new Date();
    this.todayDay = now.toLocaleDateString('en-IN', { weekday: 'long' });
    this.todayDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

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

  restoreTodayAttendance() {
    this.attendanceService.getByUID(this.userId()).subscribe({
      next: (records: any[]) => {
        // Use LOCAL date to avoid UTC/IST timezone mismatch
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const todayRecord = records.find(r =>
          (r.date ?? '').toString().trim().startsWith(todayStr)
        );

        if (!todayRecord) return;

        const aid = todayRecord.aId ?? todayRecord.attendanceId ?? todayRecord.id;
        if (aid) this.attendanceId.set(aid);

        // Use isCheckIn boolean flag — more reliable than checking string value
        if (todayRecord.isCheckIn && todayRecord.checkIn) {
          const ciClean = todayRecord.checkIn.toString().split('.')[0]; // "18:16:31"
          const ciDate = new Date(`${todayStr}T${ciClean}`);
          this.checkInDate = isNaN(ciDate.getTime()) ? now : ciDate;
          this.checkInTime.set(this.formatTime(todayRecord.checkIn));
          this.checkedIn.set(true);
        }

        // Use isCheckOut boolean flag — checkOut is null when not yet checked out
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
          // Checked in but not out → resume live timer
          this.startTimer();
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
        // SP returns: SELECT CAST(SCOPE_IDENTITY() AS INT) AS AttendanceId
        const aid = res?.attendanceId ?? res?.AttendanceId ?? res?.aId;
        if (aid) this.attendanceId.set(aid);
        console.log('CheckIn — attendanceId stored:', aid);

        const now = new Date();
        this.checkInDate = now;
        this.checkInTime.set(this.formatTime(now.toISOString()));
        this.checkedIn.set(true);
        this.attendanceLoading.set(false);
        this.startTimer();
      },
      error: (err) => {
        console.error('CheckIn error:', err);
        this.attendanceLoading.set(false);
      }
    });
  }

  // ── Check Out ──
  checkOut() {
    if (this.attendanceLoading()) return;
    this.attendanceLoading.set(true);

    // SP param is @AttendenceId — pass the stored aId from checkIn
    this.attendanceService.checkOut(this.attendanceId()).subscribe({
      next: (res: any) => {
        console.log('CheckOut response:', res);
        const now = new Date();
        this.checkOutTime.set(this.formatTime(now.toISOString()));
        this.checkedOut.set(true);
        this.attendanceLoading.set(false);
        if (this.checkInDate) {
          this.workHours.set(this.calcWorkHours(this.checkInDate, now));
        }
        this.stopTimer();
      },
      error: (err) => {
        console.error('CheckOut error:', err);
        this.attendanceLoading.set(false);
      }
    });
  }

  // ── Timer ──
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
    const diffMs = Date.now() - this.checkInDate.getTime();
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    this.elapsedTime.set(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '00')}:${String(s).padStart(2, '0')}`
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