import { Component, computed, signal } from '@angular/core';
import { Authservice } from '../../services/Auth-service/authservice';
import { AttendanceService } from '../../services/attendance-service';

export interface AttendanceRecord {
  date: string;       // 'YYYY-MM-DD'
  weekday: string;
  clockIn: string;    // '09:02 AM'
  clockOut: string;   // '06:15 PM'
  workHours: string;  // '9h 13m'
  status: 'present' | 'absent' | 'late' | 'weekend';
  statusLabel: string;
}

export interface CalendarCell {
  day: number;
  date: string;
  weekday: string;
  isToday: boolean;
  isWeekend: boolean;
  status: string;
  statusLabel: string;
  record: AttendanceRecord | null;
}

@Component({
  selector: 'app-attendance-page',
  imports: [],
  templateUrl: './attendance-page.html',
  styleUrl: './attendance-page.css',
})
  
export class AttendancePage {
  userId = signal<any>(null);
  records = signal<AttendanceRecord[]>([]);
  selectedDay = signal<CalendarCell | null>(null);
  tableFilter = 'all';

  // Current viewed month
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth(); // 0-indexed

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth).toLocaleDateString('en-IN', {
      month: 'long', year: 'numeric'
    });
  }

  // ── Computed stats ──
  presentCount = computed(() => this.records().filter(r => r.status === 'present').length);
  absentCount = computed(() => this.records().filter(r => r.status === 'absent').length);
  lateCount = computed(() => this.records().filter(r => r.status === 'late').length);

  totalHours = computed(() => {
    let total = 0;
    this.records().forEach(r => {
      if (r.workHours) {
        const hMatch = r.workHours.match(/(\d+)h/);
        const mMatch = r.workHours.match(/(\d+)m/);
        total += (hMatch ? parseInt(hMatch[1]) : 0) * 60 + (mMatch ? parseInt(mMatch[1]) : 0);
      }
    });
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}.${Math.round(m / 60 * 10)}` : `${h}`;
  });

  attendanceRate = computed(() => {
    const workdays = this.records().filter(r => r.status !== 'weekend').length;
    if (!workdays) return 0;
    const attended = this.records().filter(r => r.status === 'present' || r.status === 'late').length;
    return Math.round((attended / workdays) * 100);
  });

  // ── Calendar cells ──
  calendarCells = computed(() => {
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const today = new Date();
    const cells: (CalendarCell | null)[] = [];

    // leading empty cells
    for (let i = 0; i < firstDay; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${this.viewYear}-${String(this.viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(this.viewYear, this.viewMonth, d);
      const dow = dateObj.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isToday = today.getFullYear() === this.viewYear && today.getMonth() === this.viewMonth && today.getDate() === d;
      const record = this.records().find(r => r.date === dateStr) || null;
      const status = isWeekend ? 'weekend' : (record?.status || '');
      cells.push({
        day: d, date: dateStr,
        weekday: dateObj.toLocaleDateString('en-IN', { weekday: 'long' }),
        isToday, isWeekend, status,
        statusLabel: record?.statusLabel || (isWeekend ? 'Weekend' : ''),
        record
      });
    }
    return cells;
  });

  // ── Filtered table records ──
  filteredRecords = computed(() => {
    const recs = this.records().filter(r => r.status !== 'weekend');
    if (this.tableFilter === 'all') return recs;
    return recs.filter(r => r.status === this.tableFilter);
  });

  constructor(
    private auth: Authservice,
    private attendanceService: AttendanceService
  ) { }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) {
      this.userId.set(id);
      // this.loadAttendance();
    }
  }

  // loadAttendance() {
  //   this.attendanceService.getMyAttendance(this.userId(), this.viewMonth + 1, this.viewYear).subscribe({
  //     next: (res: any[]) => {
  //       const mapped: AttendanceRecord[] = res.map(r => ({
  //         date: r.date?.split('T')[0] ?? r.date,
  //         weekday: new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' }),
  //         clockIn: r.clockIn ?? '',
  //         clockOut: r.clockOut ?? '',
  //         workHours: r.workHours ?? '',
  //         status: r.status?.toLowerCase() as any,
  //         statusLabel: r.status ?? '',
  //       }));
  //       this.records.set(mapped);
  //       this.selectedDay.set(null);
  //     },
  //     error: err => console.error(err)
  //   });
  // }

  prevMonth() {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
    // this.loadAttendance();
  }

  nextMonth() {
    if (this.isCurrentMonth()) return;
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
    // this.loadAttendance();
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.viewYear === now.getFullYear() && this.viewMonth === now.getMonth();
  }

  selectDay(cell: CalendarCell) {
    this.selectedDay.set(cell);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
