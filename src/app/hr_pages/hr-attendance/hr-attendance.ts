import { Component, computed, signal, OnInit } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { ToastService } from '../../services/toast-service/toast';

@Component({
  selector: 'app-hr-attendance',
  imports: [LowerCasePipe],
  templateUrl: './hr-attendance.html',
  styleUrl: './hr-attendance.css',
})
export class HrAttendancePage implements OnInit {

  allUsers = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  isLoading = signal(false);
  selectedRecord = signal<any | null>(null);

  fromDate = signal(this.localDate(new Date()));
  toDate = signal(this.localDate(new Date()));
  departmentFilter = signal('');
  statusFilter = signal('all');
  searchQ = signal('');
  currentPage = signal(1);
  readonly pageSize = 10;
  showExportModal = signal(false);
  exportFromDate = signal(this.localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  exportToDate = signal(this.localDate(new Date()));
  exportUserId = signal<number | any | null>(null);
  exportDepartment = signal<any>('');
  isExporting = signal(false);

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085',
    '#2c3e50', '#1e8449',
  ];

  departments = computed(() => {
    const deps = this.allUsers()
      .map(u => u.department)
      .filter(Boolean);
    return [...new Set(deps)].sort() as string[];
  });

  dateRangeLabel = computed(() => {
    if (this.fromDate() === this.toDate()) {
      return this.formatDate(this.fromDate());
    }
    return `${this.formatDate(this.fromDate())} – ${this.formatDate(this.toDate())}`;
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

  summaryRecords = computed(() => {
    const dates = this.datesInRange();

    const users = this.allUsers().filter(u => {
      const dep = u.department || '—';
      return !this.departmentFilter() || dep === this.departmentFilter();
    });

    const attendanceMap = new Map<string, any>();
    this.allAttendance().forEach(r => {
      const date = this.normalizeDate(r.date);
      const userId = Number(r.userId ?? r.UserId);
      if (!date || !userId) return;
      attendanceMap.set(`${date}_${userId}`, r);
    });

    const rows: any[] = [];

    for (const date of dates) {
      for (const u of users) {
        const userId = Number(u.id);
        const rec = attendanceMap.get(`${date}_${userId}`);

        if (rec) {
          const isCheckIn = rec.isCheckIn ?? !!rec.checkIn;
          const isCheckOut = rec.isCheckOut ?? !!rec.checkOut;
          let status = 'Absent';
          if (rec.status) {
            status = rec.status;
          } else if (isCheckIn) {
            status = this.getHour(rec.checkIn) >= 9 ? 'Late' : 'Present';
          }

          rows.push({
            rowKey: `${date}_${userId}`,
            userId,
            userName: u.userName ?? 'Unknown',
            roleName: u.roleName ?? '—',
            department: u.department || '—',
            initials: this.getInitials(u.userName),
            date,
            day: rec.day ?? this.getDayName(date),
            isCheckIn, isCheckOut,
            checkIn: rec.checkIn ?? null,
            checkOut: rec.checkOut ?? null,
            hours: rec.hours ?? null,
            status,
          });
        } else {
          rows.push({
            rowKey: `${date}_${userId}`,
            userId,
            userName: u.userName ?? 'Unknown',
            roleName: u.roleName ?? '—',
            department: u.department || '—',
            initials: this.getInitials(u.userName),
            date,
            day: this.getDayName(date),
            isCheckIn: false,
            isCheckOut: false,
            checkIn: null,
            checkOut: null,
            hours: null,
            status: 'Absent',
          });
        }
      }
    }

    return rows;
  });

  filteredRecords = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const sf = this.statusFilter();

    const statusRank = (s: string) => {
      if (s === 'Present') return 0;
      if (s === 'Late') return 1;
      if (s === 'Absent') return 2;
      return 3;
    };

    return this.summaryRecords()
      .filter(r => {
        const matchSearch = !q ||
          r.userName.toLowerCase().includes(q) ||
          r.roleName?.toLowerCase().includes(q) ||
          r.department?.toLowerCase().includes(q);
        const matchStatus = sf === 'all' || r.status === sf;
        return matchSearch && matchStatus;
      })
      .slice()
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return statusRank(a.status) - statusRank(b.status);
      });
  });

  totalEmployees = computed(() => this.allUsers().length);
  presentCount = computed(() => this.summaryRecords().filter(r => r.status === 'Present' || r.status === 'Late').length);
  absentCount = computed(() => this.summaryRecords().filter(r => r.status === 'Absent').length);
  lateCount = computed(() => this.summaryRecords().filter(r => r.status === 'Late').length);

  presentPct = computed(() => {
    const t = this.summaryRecords().length;
    return t ? Math.round((this.presentCount() / t) * 100) : 0;
  });
  absentPct = computed(() => {
    const t = this.summaryRecords().length;
    return t ? Math.round((this.absentCount() / t) * 100) : 0;
  });
  latePct = computed(() => {
    const t = this.summaryRecords().length;
    return t ? Math.round((this.lateCount() / t) * 100) : 0;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRecords().length / this.pageSize)));
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

  constructor(
    private auth: Authservice,
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
      next: (res: any) => this.allUsers.set(Array.isArray(res) ? res : res ? [res] : []),
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
      error: err => { console.error('loadAllAttendance:', err); this.isLoading.set(false); }
    });
  }

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

  setDepartment(val: string) {
    this.departmentFilter.set(val);
    this.resetPageAndSelection();
  }

  setFilter(f: string) {
    this.statusFilter.set(f);
    this.resetPageAndSelection();
  }

  resetFilters() {
    this.fromDate.set(this.localDate(new Date()));
    this.toDate.set(this.localDate(new Date()));
    this.departmentFilter.set('');
    this.statusFilter.set('all');
    this.searchQ.set('');
    this.resetPageAndSelection();
  }

  private resetPageAndSelection() {
    this.currentPage.set(1);
    this.selectedRecord.set(null);
  }

  selectRecord(r: any) {
    this.selectedRecord.set(this.selectedRecord()?.rowKey === r.rowKey ? null : r);
  }

  isToday(): boolean {
    const today = this.localDate(new Date());
    return this.fromDate() === today && this.toDate() === today;
  }

  goToday() {
    this.fromDate.set(this.localDate(new Date()));
    this.toDate.set(this.localDate(new Date()));
    this.resetPageAndSelection();
  }

  openExportModal() {
    this.exportFromDate.set(this.fromDate());
    this.exportToDate.set(this.toDate());
    this.exportUserId.set(null);
    this.exportDepartment.set(this.departmentFilter());
    this.showExportModal.set(true);
  }

  closeExportModal() {
    if (this.isExporting()) return;
    this.showExportModal.set(false);
  }

  submitExport() {
    if (this.isExporting()) return;

    this.isExporting.set(true);

    this.attendanceService
      .exportAttendanceReport(
        this.exportFromDate(),
        this.exportToDate(),
        this.exportUserId() || null,
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
        error: (error) => {
          this.isExporting.set(false);
          if (error.status === 404) {
            this.toast.error('No records found for the selected filters.');
          } else {
            this.toast.error('Failed to export report. Please try again.');
          }
        }
      });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getColor(id: any): string {
    return this.colorPool[(Number(id) || 0) % this.colorPool.length];
  }

  getHour(timeStr: string): number {
    if (!timeStr) return 0;
    return parseInt(timeStr.toString().split(':')[0]) || 0;
  }

  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  normalizeDate(dateVal: any): string {
    if (!dateVal) return '';
    const str = dateVal.toString();
    if (str.includes('T')) return str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    return this.localDate(new Date(str));
  }

  getDayName(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const clean = timeStr.toString().split('.')[0].substring(0, 5);
    const [h, m] = clean.split(':').map(Number);
    if (isNaN(h)) return '—';
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}