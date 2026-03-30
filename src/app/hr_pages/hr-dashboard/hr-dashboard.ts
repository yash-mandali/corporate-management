import { Component, computed, signal, OnInit } from '@angular/core';
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
export class HrDashboard implements OnInit {

  // ── Raw data ──
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

  // ── Date strings ──
  greeting = '';
  todayDate = '';
  todayDay = '';

  // ── Color pool ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed ──
  hrName = computed(() => this.hrInfo()?.userName || 'HR Manager');
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

  // ── Attendance computed ──
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

    // Active on top → done → absent
    return list.slice().sort((a, b) => {
      const rank = (e: any) =>
        e.isCheckIn && !e.isCheckOut ? 0 : e.isCheckOut ? 1 : 2;
      return rank(a) - rank(b);
    });
  });

  slicedAttendance = computed(() => this.filteredAttendance().slice(0, 3));

  todayPresent = computed(() =>
    this.todayAttendance().filter(e => e.isCheckIn).length
  );

  todayAbsent = computed(() =>
    this.todayAttendance().filter(e => !e.isCheckIn).length
  );

  todayPresentPct = computed(() => {
    const t = this.totalEmployees();
    return t ? Math.round((this.todayPresent() / t) * 100) : 0;
  });

  absentPct = computed(() => {
    const t = this.totalEmployees();
    return t ? Math.round((this.todayAbsent() / t) * 100) : 0;
  });

  // ── Leave computed ──
  pendingLeaveCount = computed(() => this.pendingLeaves().length);

  // leaveStats = computed(() => ({
  //   pending: this.allLeaves().filter(l => l.status === 'ManagerApproved').length,
  //   approved: this.allLeaves().filter(l => l.status === 'Approved').length,
  //   rejected: this.allLeaves().filter(l => l.status === 'Rejected').length,
  //   withdrawn: this.allLeaves().filter(l => l.status === 'Withdrawn').length,
  // }));

  // leaveBarPct(count: number): number {
  //   const total = this.allLeaves().length;
  //   return total ? Math.round((count / total) * 100) : 0;
  // }

  constructor(
    private auth: Authservice,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.setGreeting();
    const id:any = this.auth.getUserId();
    if (id) {
      this.userService.getUserById(id).subscribe({
        next: res => this.hrInfo.set(res),
        error: err => console.error(err)
      });
    }
    this.loadEmployees();
    this.loadAttendance();
    this.loadManagerApprovedLeaves();
  }

  setGreeting() {
    const h = new Date().getHours();
    this.greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    const now = new Date();
    this.todayDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    this.todayDay = now.toLocaleDateString('en-IN', { weekday: 'long' });
  }

  loadEmployees() {
    this.empLoading.set(true);
    this.userService.getAllEmployee().subscribe({
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
    // Load all leaves for stats
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

  // ── Leave actions (HR uses ManagerApprove/Reject) ──
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
    const clean = timeStr.toString().split('.')[0].substring(0, 5);
    const [h, m] = clean.split(':').map(Number);
    if (isNaN(h)) return '—';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
}