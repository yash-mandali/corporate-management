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

  // ── State ──
  allUsers = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  isLoading = signal(false);
  selectedRecord = signal<any | null>(null);

  // ── Filters ──
  selectedDate = signal(this.localDate(new Date()));
  statusFilter = signal('all');
  searchQ = signal('');
  currentPage = signal(1);
  readonly pageSize = 8;

  // ── Export Modal ──
  showExportModal = signal(false);
  exportFromDate = signal(this.localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  exportToDate = signal(this.localDate(new Date()));
  exportUserId = signal<number |any| null>(null);
  exportDepartment = signal<any>('');
  isExporting = signal(false);

  // ── Color pool ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085',
    '#2c3e50', '#1e8449',
  ];

  // ── Derive unique departments from users ──
  departments = computed(() => {
    const deps = this.allUsers()
      .map(u => u.department)
      .filter(Boolean);
    return [...new Set(deps)] as string[];
  });

  // ── Computed: records for selected date enriched with user info ──
  dayRecords = computed(() => {
    const date = this.selectedDate();
    const recMap = new Map(
      this.allAttendance()
        .filter(r => r.date?.toString().startsWith(date))
        .map(r => [r.userId, r])
    );

    return this.allUsers().map(u => {
      const rec: any = recMap.get(u.id) ?? {};
      const isCheckIn = rec.isCheckIn ?? false;
      const isCheckOut = rec.isCheckOut ?? false;

      let status = 'Absent';
      if (isCheckIn) {
        const checkInHour = this.getHour(rec.checkIn);
        status = checkInHour >= 9 ? 'Late' : 'Present';
      }
      if (rec.status) status = rec.status;

      return {
        userId: u.id,
        userName: u.userName,
        roleName: u.roleName,
        initials: this.getInitials(u.userName),
        isCheckIn, isCheckOut,
        checkIn: rec.checkIn ?? null,
        checkOut: rec.checkOut ?? null,
        hours: rec.hours ?? null,
        status,
      };
    });
  });

  // ── Computed: after search + status filter ──
  filteredRecords = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const sf = this.statusFilter();

    const statusRank = (s: string) => {
      if (s === 'Present') return 0;
      if (s === 'Late') return 1;
      if (s === 'Absent') return 2;
      return 3;
    };

    return this.dayRecords()
      .filter(r => {
        const matchSearch = !q || r.userName.toLowerCase().includes(q) || r.roleName?.toLowerCase().includes(q);
        const matchStatus = sf === 'all' || r.status === sf;
        return matchSearch && matchStatus;
      })
      .slice()
      .sort((a, b) => statusRank(a.status) - statusRank(b.status));
  });

  // ── Stats ──
  totalEmployees = computed(() => this.allUsers().length);
  presentCount = computed(() => this.dayRecords().filter(r => r.status === 'Present' || r.status === 'Late').length);
  absentCount = computed(() => this.dayRecords().filter(r => r.status === 'Absent').length);
  lateCount = computed(() => this.dayRecords().filter(r => r.status === 'Late').length);

  presentPct = computed(() => {
    const t = this.totalEmployees();
    return t ? Math.round(((this.presentCount() + this.lateCount()) / t) * 100) : 0;
  });
  absentPct = computed(() => {
    const t = this.totalEmployees();
    return t ? Math.round((this.absentCount() / t) * 100) : 0;
  });
  latePct = computed(() => {
    const t = this.totalEmployees();
    return t ? Math.round((this.lateCount() / t) * 100) : 0;
  });

  // ── Pagination ──
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRecords().length / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedRecords = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRecords().slice(start, start + this.pageSize);
  });

  // ── Date label ──
  selectedDateLabel = computed(() => {
    const d = new Date(this.selectedDate() + 'T00:00:00');
    const today = this.localDate(new Date());
    const yesterday = this.localDate(new Date(Date.now() - 86400000));
    if (this.selectedDate() === today) return 'Today · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (this.selectedDate() === yesterday) return 'Yesterday · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  });

  constructor(
    private auth: Authservice,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private toast:ToastService
  ) { }

  ngOnInit() {
    this.loadAllUsers();
    this.loadAllAttendance();
  }

  loadAllUsers() {
    this.userService.getAllEmployee().subscribe({
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

  // ── Date navigation ──
  onDateChange(val: string) {
    this.selectedDate.set(val);
    this.currentPage.set(1);
    this.selectedRecord.set(null);
  }

  prevDay() {
    const d = new Date(this.selectedDate() + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    this.onDateChange(this.localDate(d));
  }

  nextDay() {
    if (this.isToday()) return;
    const d = new Date(this.selectedDate() + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    this.onDateChange(this.localDate(d));
  }

  goToday() {
    this.onDateChange(this.localDate(new Date()));
  }

  isToday(): boolean {
    return this.selectedDate() === this.localDate(new Date());
  }

  setFilter(f: string) {
    this.statusFilter.set(f);
    this.currentPage.set(1);
    this.selectedRecord.set(null);
  }

  selectRecord(r: any) {
    this.selectedRecord.set(this.selectedRecord()?.userId === r.userId ? null : r);
  }

  // ── Export Modal ──
  openExportModal() {
    this.exportFromDate.set(this.localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    this.exportToDate.set(this.localDate(new Date()));
    this.exportUserId.set(null);
    this.exportDepartment.set('');
    this.showExportModal.set(true);
  }

  closeExportModal() {
    if (this.isExporting()) return;
    this.showExportModal.set(false);
  }

  submitExport() {
    if (this.isExporting()) return;

    this.isExporting.set(true);

    const payload = {
      fromDate: this.exportFromDate(),
      toDate: this.exportToDate(),
      userId: this.exportUserId() || null,
      department: this.exportDepartment() || null,
    };

    this.attendanceService
      .exportAttendanceReport(
        payload.fromDate,
        payload.toDate,
        payload.userId,
        payload.department
      )
      .subscribe({
        next: (response: Blob) => {

          const blob = new Blob([response], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });

          const url = window.URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = url;
          link.download = 'Attendance_Report.xlsx';
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
          console.log('Export error:', error);
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

  getHour(timeStr: string): number {
    if (!timeStr) return 0;
    return parseInt(timeStr.toString().split(':')[0]) || 0;
  }

  localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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