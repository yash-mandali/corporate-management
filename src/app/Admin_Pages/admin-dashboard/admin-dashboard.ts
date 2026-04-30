import { Component, computed, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { PayrollService } from '../../services/payroll-service/payrollservice';
import { RecruitmentService } from '../../services/recruitment-service/recruitment-service';
import { Authservice } from '../../services/Auth-service/authservice';
import { ToastService } from '../../services/toast-service/toast';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, NgClass],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {

  // ── Raw data signals ──
  adminInfo = signal<any>(null);
  allUsers = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  allLeaves = signal<any[]>([]);
  pendingLeaves = signal<any[]>([]);
  allPayroll = signal<any[]>([]);
  allJobs = signal<any[]>([]);
  allTimesheets = signal<any[]>([]);

  // ── Loading signals ──
  empLoading = signal(false);
  attLoading = signal(false);
  leaveLoading = signal(false);
  payrollLoading = signal(false);
  recruitLoading = signal(false);
  actionLoading = signal<any>(null);

  // ── UI filter signals ──
  attFilter = signal<'all' | 'present' | 'absent'>('all');
  userRoleFilter = signal<'all' | 'Employee' | 'Manager' | 'HR'>('all');

  // ── Date strings ──
  greeting = '';
  todayDate = '';
  todayDay = '';

  // ── Color pool (same as hr-dashboard) ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed: user stats ──
  adminName = computed(() => this.adminInfo()?.userName || 'Admin');

  totalUsers = computed(() => this.allUsers().length);

  totalEmployees = computed(() =>
    this.allUsers().length
  );

  newJoineesCount = computed(() => {
    const now = new Date();
    return this.allUsers().filter(u => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  });

  todayAttendance = computed(() => {
    const today = this.localDate(new Date());
    const recs = this.allAttendance().filter(r => r.date?.toString().startsWith(today));
    const recMap = new Map(recs.map(r => [r.userId, r]));

    return this.allUsers().map(u => {
      const rec: any = recMap.get(u.id) ?? {};
      return {
        userId: u.id,
        userName: u.userName,
        roleName: u.roleName,
        department: u.department,
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
    const t = this.totalUsers();
    return t ? Math.round((this.todayPresent() / t) * 100) : 0;
  });

  absentPct = computed(() => {
    const t = this.totalUsers();
    return t ? Math.round((this.todayAbsent() / t) * 100) : 0;
  });

  // ── Computed: user role filter ──
  filteredUsers = computed(() => {
    const role = this.userRoleFilter();
    const all = this.allUsers();
    if (role === 'all') return all;
    return all.filter(u => u.roleName === role);
  });

  slicedUsers = computed(() => this.filteredUsers().slice(0, 3));

  // ── Computed: department breakdown ──
  deptBreakdown = computed(() => {
    const deptMap = new Map<string, number>();
    this.allUsers().forEach(u => {
      const dept = u.department || 'Unassigned';
      deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
    });
    const sorted = [...deptMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const max = sorted[0]?.count || 1;
    return sorted.map(d => ({ ...d, pct: Math.round((d.count / max) * 100) }));
  });

  // ── Computed: leave ──
  pendingLeaveCount = computed(() => this.pendingLeaves().length);

  // ── Computed: recent leaves (top 3, sorted by appliedOn desc) ──
  recentLeaves = computed(() =>
    this.allLeaves()
      .slice()
      .sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime())
      .slice(0, 3)
  );

  currentMonthPayroll = computed(() => {
    const now = new Date();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return this.allPayroll().filter(p =>
      p.month === month && p.year === year
    );
  });

  paidPayrollCount = computed(() =>
    this.allPayroll().filter(p => p.status === 'Paid').length
  );

  unpaidPayrollCount = computed(() =>
    this.allPayroll().filter(p => p.status === 'Generated').length
  );

  paidPayrollPct = computed(() => {
    const total = this.allPayroll().length;
    return total ? Math.round((this.paidPayrollCount() / total) * 100) : 0;
  });

  unpaidPayrollPct = computed(() => {
    const total = this.allPayroll().length;
    return total ? Math.round((this.unpaidPayrollCount() / total) * 100) : 0;
  });

  // ── Computed: jobs ──
  openJobCount = computed(() =>
    this.allJobs().filter(j =>
      j.status === 'Published' || j.status === 'Open'
    ).length
  );

  // ── Computed: timesheets ──
  pendingTimesheetCount = computed(() =>
    this.allTimesheets().filter(t => t.status === 'Submitted').length
  );

  constructor(
    private auth: Authservice,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private payrollService: PayrollService,
    private recruitmentService: RecruitmentService,
    private toast: ToastService,
  ) { }

  ngOnInit() {
    this.setGreeting();
    const id: any = this.auth.getUserId();
    if (id) {
      this.userService.getUserById(id).subscribe({
        next: res => this.adminInfo.set(res),
        error: err => console.error(err),
      });
    }
    this.loadUsers();
    this.loadAttendance();
    this.loadLeaves();
    this.loadPayroll();
    this.loadJobs();
    this.leaveService.autorejectLeave().subscribe();
  }

  // ── Data loaders ──

  setGreeting() {
    const h = new Date().getHours();
    this.greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    const now = new Date();
    this.todayDate = now.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    this.todayDay = now.toLocaleDateString('en-IN', { weekday: 'long' });
  }

  loadUsers() {
    this.empLoading.set(true);
    this.userService.getAllEmployeeManagerHr().subscribe({
      next: (res: any) => {
        this.allUsers.set(Array.isArray(res) ? res : res ? [res] : []);
        this.empLoading.set(false);
      },
      error: err => { console.error(err); this.empLoading.set(false); },
    });
  }

  loadAttendance() {
    this.attLoading.set(true);
    this.attendanceService.getAllattendance().subscribe({
      next: (res: any) => {
        this.allAttendance.set(Array.isArray(res) ? res : res ? [res] : []);
        this.attLoading.set(false);
      },
      error: err => { console.error(err); this.attLoading.set(false); },
    });
  }

  loadLeaves() {
    this.leaveLoading.set(true);
    this.leaveService.getAllLeaves().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? (res ? [res] : []);
        this.allLeaves.set(list);
        this.pendingLeaves.set(
          list.filter((l: any) =>
            l.status === 'pending' || l.status === 'ManagerApproved'
          )
        );
        this.leaveLoading.set(false);
      },
      error: err => { console.error(err); this.leaveLoading.set(false); },
    });
  }

  loadPayroll() {
    this.payrollLoading.set(true);
    const now = new Date();
    const currentMonth = now.getMonth();
    this.payrollService.getAllPayrollByMonth(currentMonth).subscribe({
      next: (res: any) => {
        this.allPayroll.set(Array.isArray(res?.data) ? res.data : []);
        this.payrollLoading.set(false);
      },
      error: err => { console.error(err); this.payrollLoading.set(false); },
    });
  }

  loadJobs() {
    this.recruitLoading.set(true);
    this.recruitmentService.getAllJobs().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res ? [res] : [];
        this.allJobs.set(list.filter((j: any) => j.status !== 'Deleted'));
        this.recruitLoading.set(false);
      },
      error: err => { console.error(err); this.recruitLoading.set(false); },
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

  getRoleBadgeClass(roleName: string): string {
    const map: Record<string, string> = {
      Employee: 'employee',
      Manager: 'manager',
      HR: 'hr',
      Admin: 'admin',
    };
    return map[roleName] ?? 'employee';
  }

  getLeaveStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'pending',
      ManagerApproved: 'manager-approved',
      Approved: 'approved',
      ManagerRejected: 'rejected',
      Rejected: 'rejected',
      AutoRejected: 'rejected',
    };
    return map[status] ?? 'pending';
  }

  getLeaveStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      ManagerApproved: 'Mgr Approved',
      Approved: 'Approved',
      ManagerRejected: 'Rejected',
      Rejected: 'Rejected',
      AutoRejected: 'Auto Rejected',
    };
    return map[status] ?? status;
  }

  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const clean = timeStr.toString().split('.')[0].substring(0, 5);
    const [h, m] = clean.split(':').map(Number);
    if (isNaN(h)) return '—';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  formatAmount(amount: number): string {
    if (amount == null) return '—';
    return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getMonthLabel(month: number): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return months[(month ?? 1) - 1] ?? '—';
  }
}