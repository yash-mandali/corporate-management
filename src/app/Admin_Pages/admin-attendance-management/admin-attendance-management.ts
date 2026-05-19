import { Component, computed, signal, OnInit } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { ToastService } from '../../services/toast-service/toast';

interface AdminAttendanceRecord {
  rowKey: string;
  aId: number | null;
  userId: number;
  userName: string;
  roleName: string;
  department: string;
  initials: string;
  date: string;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: string | null;
  isCheckIn: boolean;
  isCheckOut: boolean;
  status: 'Present' | 'Absent' | 'Late' | string;
  isGeneratedAbsent: boolean;
}

@Component({
  selector: 'app-admin-attendance-management',
  imports: [LowerCasePipe],
  templateUrl: './admin-attendance-management.html',
  styleUrl: './admin-attendance-management.css',
})
export class AdminAttendanceManagement implements OnInit {

  allUsers = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  isLoading = signal(false);
  selectedRecord = signal<AdminAttendanceRecord | null>(null);

  fromDate = signal(this.localDate(new Date()));
  toDate = signal(this.localDate(new Date()));
  employeeFilter = signal<number | null>(null);
  departmentFilter = signal('');
  statusFilter = signal('all');
  searchQ = signal('');
  currentPage = signal(1);
  readonly pageSize = 10;
  showExportModal = signal(false);
  exportFromDate = signal(this.localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  exportToDate = signal(this.localDate(new Date()));
  exportUserId = signal<number |any | null>(null);
  exportDepartment = signal<any>('');
  isExporting = signal(false);

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085',
    '#2c3e50', '#1e8449',
  ];

  constructor(
    private userService: UserService,
    private attendanceService: AttendanceService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.loadAllUsers();
    this.loadAllAttendance();
  }


  loadAllUsers() {
    this.userService.getAllEmployeeManagerHr().subscribe({
      next: (res: any) => {
        this.allUsers.set(Array.isArray(res) ? res : res ? [res] : []);
      },
      error: err => console.error('loadAllUsers:', err)
    });
  }

  loadAllAttendance() {
    this.isLoading.set(true);

    this.attendanceService.getAllattendance().subscribe({
      next: (res: any) => {
        this.allAttendance.set(Array.isArray(res) ? res : res ? [res] : []);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('loadAllAttendance:', err);
        this.isLoading.set(false);
      }
    });
  }


  departments = computed(() => {
    const deps = this.allUsers()
      .map(u => this.getDepartment(u))
      .filter(dep => dep && dep !== '—');

    return [...new Set(deps)].sort();
  });


  dateRangeLabel = computed(() => {
    if (this.fromDate() === this.toDate()) {
      return this.formatDate(this.fromDate());
    }
    return `${this.formatDate(this.fromDate())} - ${this.formatDate(this.toDate())}`;
  });

  private datesInRange(): string[] {
    const start = new Date(this.fromDate() + 'T00:00:00');
    const end = new Date(this.toDate() + 'T00:00:00');

    if (start > end) return [];

    const dates: string[] = [];
    const cur = new Date(start);

    while (cur <= end) {
      dates.push(this.localDate(cur));
      cur.setDate(cur.getDate() + 1);
    }

    return dates;
  }

  summaryRecords = computed<AdminAttendanceRecord[]>(() => {
    const dates = this.datesInRange();
    const users = this.allUsers().filter(u => {
      const uid = Number(u.id);
      const department = this.getDepartment(u);
      const matchEmployee =
        !this.employeeFilter() || uid === this.employeeFilter();
      const matchDepartment =
        !this.departmentFilter() || department === this.departmentFilter();
      return matchEmployee && matchDepartment;
    });

    const attendanceMap = new Map<string, any>();
    this.allAttendance().forEach(r => {
      const date = this.normalizeDate(r.date);
      const userId = Number(r.userId ?? r.UserId);
      if (!date || !userId) return;
      attendanceMap.set(`${date}_${userId}`, r);
    });

    const rows: AdminAttendanceRecord[] = [];

    for (const date of dates) {
      for (const user of users) {
        const userId = Number(user.id);
        const rec = attendanceMap.get(`${date}_${userId}`);
        const department = this.getDepartment(user);

        if (rec) {
          const status = this.resolveStatus(rec);

          rows.push({
            rowKey: `${date}_${userId}`,
            aId: rec.aId ?? null,
            userId,
            userName: user.userName ?? 'Unknown',
            roleName: user.roleName ?? '—',
            department,
            initials: this.getInitials(user.userName),
            date,
            day: rec.day ?? this.getDayName(date),
            checkIn: rec.checkIn ?? null,
            checkOut: rec.checkOut ?? null,
            hours: rec.hours ?? null,
            isCheckIn: rec.isCheckIn ?? !!rec.checkIn,
            isCheckOut: rec.isCheckOut ?? !!rec.checkOut,
            status,
            isGeneratedAbsent: false,
          });
        } else {
          rows.push({
            rowKey: `${date}_${userId}`,
            aId: null,
            userId,
            userName: user.userName ?? 'Unknown',
            roleName: user.roleName ?? '—',
            department,
            initials: this.getInitials(user.userName),
            date,
            day: this.getDayName(date),
            checkIn: null,
            checkOut: null,
            hours: null,
            isCheckIn: false,
            isCheckOut: false,
            status: 'Absent',
            isGeneratedAbsent: true,
          });
        }
      }
    }

    return rows;
  });


  filteredRecords = computed(() => {
    const q = this.searchQ().trim().toLowerCase();
    const sf = this.statusFilter();
    const statusRank = (s: string) => {
      if (s === 'Present') return 0;
      if (s === 'Late') return 1;
      if (s === 'Absent') return 2;
      return 3;
    };

    return this.summaryRecords()
      .filter(r => {
        const matchSearch =
          !q ||
          r.userName.toLowerCase().includes(q) ||
          r.roleName.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          String(r.userId).includes(q) ||
          String(r.aId ?? '').includes(q);

        const matchStatus =
          sf === 'all' || r.status === sf;
        return matchSearch && matchStatus;
      })
      .slice()
      .sort((a, b) => {
        const dateDiff =
          new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        const statusDiff = statusRank(a.status) - statusRank(b.status);
        if (statusDiff !== 0) return statusDiff;

        return a.userName.localeCompare(b.userName);
      });
  });

  totalExpectedRecords = computed(() =>
    this.summaryRecords().filter(r => r.status !== 'Weekend').length
  );

  presentCount = computed(() =>
    this.summaryRecords().filter(r => r.status === 'Present' || r.status === 'Late').length
  );

  absentCount = computed(() =>
    this.summaryRecords().filter(r => r.status === 'Absent').length
  );

  lateCount = computed(() =>
    this.summaryRecords().filter(r => r.status === 'Late').length
  );

  attendanceRate = computed(() => {
    const total = this.totalExpectedRecords();
    return total ? Math.round((this.presentCount() / total) * 100) : 0;
  });

  totalHours = computed(() => {
    const mins = this.summaryRecords()
      .reduce((sum, r) => sum + this.parseHoursToMinutes(r.hours), 0);

    return this.minutesToText(mins);
  });

  avgHours = computed(() => {
    const worked = this.summaryRecords()
      .map(r => this.parseHoursToMinutes(r.hours))
      .filter(m => m > 0);

    if (!worked.length) return '0h';

    const avg = Math.round(worked.reduce((a, b) => a + b, 0) / worked.length);
    return this.minutesToText(avg);
  });


  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRecords().length / this.pageSize))
  );

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  pagedRecords = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;

    return this.filteredRecords().slice(start, start + this.pageSize);
  });


  setFromDate(val: string) {
    this.fromDate.set(val);

    if (new Date(this.fromDate()) > new Date(this.toDate())) {
      this.toDate.set(val);
    }

    this.resetPageAndSelection();
  }

  setToDate(val: string) {
    this.toDate.set(val);
    if (new Date(this.toDate()) < new Date(this.fromDate())) {
      this.fromDate.set(val);
    }
    this.resetPageAndSelection();
  }

  setEmployee(val: string) {
    this.employeeFilter.set(val ? Number(val) : null);
    this.resetPageAndSelection();
  }

  setDepartment(val: string) {
    this.departmentFilter.set(val);
    this.resetPageAndSelection();
  }

  setStatusFilter(f: string) {
    this.statusFilter.set(f);
    this.resetPageAndSelection();
  }

  setSearch(val: string) {
    this.searchQ.set(val);
    this.currentPage.set(1);
  }

  resetFilters() {
    this.fromDate.set(this.localDate(new Date()));
    this.toDate.set(this.localDate(new Date()));
    this.employeeFilter.set(null);
    this.departmentFilter.set('');
    this.statusFilter.set('all');
    this.searchQ.set('');
    this.resetPageAndSelection();
  }

  private resetPageAndSelection() {
    this.currentPage.set(1);
    this.selectedRecord.set(null);
  }

  selectRecord(r: AdminAttendanceRecord) {
    this.selectedRecord.set(
      this.selectedRecord()?.rowKey === r.rowKey ? null : r
    );
  }

  openExportModal() {
    this.exportFromDate.set(this.fromDate());
    this.exportToDate.set(this.toDate());
    this.exportUserId.set(this.employeeFilter());
    this.exportDepartment.set(this.departmentFilter());
    this.showExportModal.set(true);
  }

  closeExportModal() {
    if (this.isExporting()) return;
    this.showExportModal.set(false);
  }

  submitExcelExport() {
    if (this.isExporting()) return;

    this.isExporting.set(true);

    this.attendanceService
      .exportAttendanceReport(
        this.exportFromDate(),
        this.exportToDate(),
        this.exportUserId(),
        this.exportDepartment() || null
      )
      .subscribe({
        next: (response: Blob) => {
          const blob = new Blob([response], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });

          const url = window.URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = url;
          link.download = `Attendance_Report_${this.exportFromDate()}_to_${this.exportToDate()}.xlsx`;
          link.click();

          window.URL.revokeObjectURL(url);

          this.isExporting.set(false);
          this.showExportModal.set(false);
        },
        error: err => {
          this.isExporting.set(false);

          if (err.status === 404) {
            this.toast.error('No records found for selected filters.');
          } else {
            this.toast.error('Failed to export attendance report.');
          }

          console.error('Excel export error:', err);
        }
      });
  }

  getDepartment(u: any): string {
    return u.department || u.departmentName || u.deptName || '—';
  }

  resolveStatus(rec: any): string {
    if (rec.status) return rec.status;

    const isCheckIn = rec.isCheckIn ?? !!rec.checkIn;

    if (!isCheckIn) return 'Absent';

    const hour = this.getHour(rec.checkIn);
    return hour >= 9 ? 'Late' : 'Present';
  }

  getInitials(name: string): string {
    if (!name) return '?';

    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getColor(id: any): string {
    return this.colorPool[(Number(id) || 0) % this.colorPool.length];
  }

  getHour(timeStr: string): number {
    if (!timeStr) return 0;
    return parseInt(timeStr.toString().split(':')[0]) || 0;
  }

  normalizeDate(dateVal: any): string {
    if (!dateVal) return '';

    const str = dateVal.toString();

    if (str.includes('T')) {
      return str.split('T')[0];
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    return this.localDate(new Date(str));
  }

  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getDayName(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00')
      .toLocaleDateString('en-IN', { weekday: 'long' });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';

    return new Date(dateStr + 'T00:00:00')
      .toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
  }

  formatTime(timeStr: string | null): string {
    if (!timeStr) return '—';

    const clean = timeStr.toString().split('.')[0].substring(0, 5);
    const [h, m] = clean.split(':').map(Number);

    if (isNaN(h)) return '—';

    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  }

  parseHoursToMinutes(hours: string | null): number {
    if (!hours) return 0;

    const val = hours.toString().trim();

    if (val.includes('h') || val.includes('m')) {
      const h = val.match(/(\d+)\s*h/);
      const m = val.match(/(\d+)\s*m/);

      return (h ? Number(h[1]) : 0) * 60 + (m ? Number(m[1]) : 0);
    }

    if (val.includes(':')) {
      const [h, m] = val.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    }

    if (!isNaN(Number(val))) {
      const num = Number(val);
      return num < 24 ? Math.round(num * 60) : num;
    }

    return 0;
  }

  minutesToText(totalMins: number): string {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;

    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}