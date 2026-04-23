import { Component, computed, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { RecruitmentService } from '../../services/recruitment-service/recruitment-service';
import { PayrollService } from '../../services/payroll-service/payrollservice';
import { ToastService } from '../../services/toast-service/toast';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {

  // ── Raw data ──
  adminInfo = signal<any>(null);
  allUsers = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  allLeaves = signal<any[]>([]);
  allPayroll = signal<any[]>([]);
  allJobs = signal<any[]>([]);

  // ── Loading ──
  usersLoading = signal(false);
  attLoading = signal(false);
  leaveLoading = signal(false);
  payrollLoading = signal(false);
  jobsLoading = signal(false);

  // ── UI state ──
  greeting = '';
  todayDate = '';
  todayDay = '';
  selectedDept = signal('all');
  activityTab = signal<'leaves' | 'attendance' | 'users'>('leaves');

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Admin info ──
  adminName = computed(() => this.adminInfo()?.userName ?? 'Admin');

  // ── User stats ──
  totalUsers = computed(() => this.allUsers().length);
  totalEmployees = computed(() => this.allUsers().filter(u => (u.roleName ?? u.role ?? '').toLowerCase() === 'employee').length);
  totalManagers = computed(() => this.allUsers().filter(u => (u.roleName ?? u.role ?? '').toLowerCase() === 'manager').length);
  totalHR = computed(() => this.allUsers().filter(u => (u.roleName ?? u.role ?? '').toLowerCase() === 'hr').length);

  activeUsers = computed(() =>
    this.allUsers().filter(u => u.isActive !== false && u.isDeleted !== true).length
  );

  newThisMonth = computed(() => {
    const now = new Date();
    return this.allUsers().filter(u => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  });

  // ── Departments ──
  departments = computed(() => {
    const depts = new Set(this.allUsers().map(u => u.department).filter(Boolean));
    return Array.from(depts) as string[];
  });

  deptBreakdown = computed(() => {
    const map: Record<string, number> = {};
    this.allUsers().forEach(u => {
      if (u.department) map[u.department] = (map[u.department] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  });

  // ── Attendance today ──
  todayAttendance = computed(() => {
    const today = this.localDate(new Date());
    return this.allAttendance().filter(r => r.date?.toString().startsWith(today));
  });

  presentToday = computed(() => this.todayAttendance().filter(r => r.isCheckIn).length);
  absentToday = computed(() =>
    Math.max(0, this.activeUsers() - this.presentToday())
  );
  lateToday = computed(() =>
    this.todayAttendance().filter(r => {
      if (!r.checkIn) return false;
      const t = new Date(r.checkIn);
      return t.getHours() > 9 || (t.getHours() === 9 && t.getMinutes() > 15);
    }).length
  );
  attendanceRate = computed(() => {
    const total = this.activeUsers();
    if (!total) return 0;
    return Math.round((this.presentToday() / total) * 100);
  });

  // ── Leave stats ──
  pendingLeaves = computed(() =>
    this.allLeaves().filter(l => (l.status ?? '').toLowerCase() === 'pending')
  );
  approvedLeaves = computed(() =>
    this.allLeaves().filter(l => ['approved', 'managerapproved'].includes((l.status ?? '').toLowerCase()))
  );
  todayLeaveCount = computed(() => {
    const today = this.localDate(new Date());
    return this.allLeaves().filter(l =>
      ['approved', 'managerapproved'].includes((l.status ?? '').toLowerCase()) &&
      l.fromDate?.toString().startsWith(today)
    ).length;
  });

  // ── Payroll stats (current month) ──
  payrollGenerated = computed(() =>
    this.allPayroll().filter(p => p.status === 'Generated').length
  );
  payrollPaid = computed(() =>
    this.allPayroll().filter(p => p.status === 'Paid').length
  );
  totalNetPayroll = computed(() =>
    this.allPayroll().reduce((sum, p) => sum + (p.netSalary ?? 0), 0)
  );

  // ── Recruitment stats ──
  activeJobs = computed(() =>
    this.allJobs().filter(j => j.status === 'Published' || j.status === 'Open').length
  );
  draftJobs = computed(() => this.allJobs().filter(j => j.status === 'Draft').length);

  // ── Recent users (last 5 joined) ──
  recentUsers = computed(() =>
    [...this.allUsers()]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6)
  );

  // ── Recent leaves (pending first, then latest) ──
  recentLeaves = computed(() => {
    const sorted = [...this.allLeaves()].sort((a, b) => {
      const ap = (a.status ?? '').toLowerCase() === 'pending';
      const bp = (b.status ?? '').toLowerCase() === 'pending';
      if (ap !== bp) return ap ? -1 : 1;
      return new Date(b.appliedDate ?? b.createdAt ?? 0).getTime() - new Date(a.appliedDate ?? a.createdAt ?? 0).getTime();
    });
    return sorted.slice(0, 6);
  });

  // ── Today's attendance list (latest check-ins) ──
  recentAttendance = computed(() =>
    [...this.todayAttendance()]
      .sort((a, b) => new Date(b.checkIn ?? 0).getTime() - new Date(a.checkIn ?? 0).getTime())
      .slice(0, 6)
  );

  // ── Filtered users ──
  filteredUsers = computed(() => {
    const dept = this.selectedDept();
    const users = dept === 'all' ? this.allUsers() : this.allUsers().filter(u => u.department === dept);
    return [...users]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 8);
  });

  constructor(
    private auth: Authservice,
    private userService: UserService,
    private attService: AttendanceService,
    private leaveService: LeaveService,
    private payrollService: PayrollService,
    private recruitService: RecruitmentService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.setGreeting();
    const id:any = this.auth.getUserId();
    if (id) {
      this.userService.getUserById(id).subscribe({
        next: (res: any) => this.adminInfo.set(res),
        error: err => console.error(err)
      });
    }
    this.loadAll();
  }

  loadAll() {
    this.loadUsers();
    this.loadAttendance();
    this.loadLeaves();
    this.loadPayroll();
    this.loadJobs();
  }

  loadUsers() {
    this.usersLoading.set(true);
    this.userService.getAllEmployeeManagerHr().subscribe({
      next: (res: any) => {
        this.allUsers.set(Array.isArray(res) ? res : res?.data ?? []);
        this.usersLoading.set(false);
      },
      error: () => this.usersLoading.set(false)
    });
  }

  loadAttendance() {
    this.attLoading.set(true);
    this.attService.getAllattendance().subscribe({
      next: (res: any) => {
        this.allAttendance.set(Array.isArray(res) ? res : res?.data ?? []);
        this.attLoading.set(false);
      },
      error: () => this.attLoading.set(false)
    });
  }

  loadLeaves() {
    this.leaveLoading.set(true);
    this.leaveService.getAllLeaves().subscribe({
      next: (res: any) => {
        this.allLeaves.set(Array.isArray(res) ? res : res?.data ?? []);
        this.leaveLoading.set(false);
      },
      error: () => this.leaveLoading.set(false)
    });
  }

  loadPayroll() {
    this.payrollLoading.set(true);
    const month = new Date().getMonth() + 1;
    this.payrollService.getAllPayrollByMonth(month).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        const year = new Date().getFullYear();
        this.allPayroll.set(list.filter((p: any) => p.year === year));
        this.payrollLoading.set(false);
      },
      error: () => this.payrollLoading.set(false)
    });
  }

  loadJobs() {
    this.jobsLoading.set(true);
    this.recruitService.getAllJobs().subscribe({
      next: (res: any) => {
        this.allJobs.set(Array.isArray(res) ? res : res?.data ?? []);
        this.jobsLoading.set(false);
      },
      error: () => this.jobsLoading.set(false)
    });
  }

  // ── Helpers ──
  private setGreeting() {
    const h = new Date().getHours();
    this.greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    this.todayDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    this.todayDay = new Date().toLocaleDateString('en-IN', { weekday: 'long' });
  }

  private localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getColor(id: any): string {
    let hash = 0; const s = String(id);
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return this.colorPool[Math.abs(hash) % this.colorPool.length];
  }

  formatCurrency(n: number): string {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
  }

  formatDate(ds: string): string {
    if (!ds) return '—';
    return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(ds: string): string {
    if (!ds) return '—';
    return new Date(ds).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  leaveStatusColor(s: string): string {
    const m: Record<string, string> = {
      pending: '#d68910', approved: '#27ae60', managerapproved: '#27ae60',
      rejected: '#c0392b', managerrejected: '#c0392b', withdrawn: '#5a8a94',
    };
    return m[(s ?? '').toLowerCase()] ?? '#5a8a94';
  }

  leaveStatusLabel(s: string): string {
    const m: Record<string, string> = {
      pending: 'Pending', approved: 'Approved', managerapproved: 'Approved',
      rejected: 'Rejected', managerrejected: 'Rejected', withdrawn: 'Withdrawn',
    };
    return m[(s ?? '').toLowerCase()] ?? s;
  }

  roleColor(role: string): string {
    const m: Record<string, string> = { admin: '#c0392b', hr: '#8e44ad', manager: '#2980b9', employee: '#27ae60' };
    return m[(role ?? '').toLowerCase()] ?? '#5a8a94';
  }

  deptBarWidth(count: number): string {
    const max = Math.max(...this.deptBreakdown().map(d => d.count), 1);
    return `${Math.round((count / max) * 100)}%`;
  }
}