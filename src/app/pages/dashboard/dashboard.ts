import { Component, computed, signal } from '@angular/core';
import { Authservice } from '../../services/Auth-service/authservice';
import { LeaveService } from '../../services/leave-service/leave-service';
import { UserService } from '../../services/user-service/user-service';
import { RouterLink } from '@angular/router';
import { AttendanceService } from '../../services/attendance-service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  myLeaves = signal<any[]>([]);
  isLoading = false;
  Id = signal<any | number | null>(null);
  userInfo = signal<any>(null);

  // ── Attendance state ──
  checkedIn = signal(false);
  checkedOut = signal(false);
  checkInTime = signal<string | null>(null);
  checkOutTime = signal<string | null>(null);
  attendanceLoading = signal(false);

  // ── Elapsed timer ──
  private elapsedInterval: any;
  private checkInDate: Date | null = null;
  elapsedTime = signal('00:00:00');

  // ── Work hours ──
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

  // ── Greeting + Date ──
  greeting = '';
  todayDay = '';
  todayDate = '';

  constructor(
    private auth: Authservice,
    private leaveService: LeaveService,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private toast:ToastrService
  ) { }

  ngOnInit() {
    this.setGreeting();
    const id = this.auth.getUserId();
    if (id) {
      this.Id.set(id);
      this.loadLeaves();
      this.loadUser();
      // this.loadTodayAttendance();
    }
    console.log("dashboard userId:" + id);

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
    this.leaveService.getMyleaveList(this.Id()).subscribe({
      next: (res) => { this.myLeaves.set(res); this.isLoading = false; },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  loadUser() {
    this.userService.getUserById(this.Id()).subscribe({
      next: (res) => this.userInfo.set(res),
      error: (err) => console.error(err)
    });
  }

  // ── Load today's attendance (so state survives refresh) ──
  // loadTodayAttendance() {
  //   this.attendanceService.getTodayAttendance(this.userId()).subscribe({
  //     next: (res: any) => {
  //       if (res?.clockIn) {
  //         this.checkInTime.set(this.formatTime(res.clockIn));
  //         this.checkInDate = new Date(res.clockIn);
  //         this.checkedIn.set(true);
  //         if (res?.clockOut) {
  //           this.checkOutTime.set(this.formatTime(res.clockOut));
  //           this.checkedOut.set(true);
  //           this.workHours.set(this.calcWorkHours(this.checkInDate, new Date(res.clockOut)));
  //         } else {
  //           this.startTimer();
  //         }
  //       }
  //     },
  //     error: () => { /* no record yet — stay at initial state */ }
  //   });
  // }

  // ── Check In ──
  checkIn() {
    if (this.attendanceLoading()) return;
    this.attendanceLoading.set(true);
    console.log("checkin called");

    this.attendanceService.checkIn(this.Id()).subscribe({
      next: (res) => {
        console.log(res);
        this.toast.success(res.message)
        this.attendanceLoading.set(false);
      },
      error: (err) => {
        console.log(err);
        this.attendanceLoading.set(false);
      }
    });
  }

  // ── Check Out ──
  checkOut() {
    if (this.attendanceLoading()) return;
    this.attendanceLoading.set(true);
    this.attendanceService.checkOut(this.Id()).subscribe({
      next: (res: any) => {
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
        console.error(err);
        this.attendanceLoading.set(false);
      }
    });
  }

  // ── Elapsed timer ──
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
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    );
  }

  calcWorkHours(from: Date, to: Date): string {
    const diffMs = to.getTime() - from.getTime();
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  formatTime(isoOrTime: string): string {
    if (!isoOrTime) return '';
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return isoOrTime;
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
