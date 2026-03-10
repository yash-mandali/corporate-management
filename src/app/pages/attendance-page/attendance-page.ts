import { Component, computed, signal } from '@angular/core';
import { LowerCasePipe, SlicePipe } from '@angular/common';
import { Authservice } from '../../services/Auth-service/authservice';
import { AttendanceService } from '../../services/attendance-service';

export interface AttendanceRecord {
  aId: number;
  date: string;       // 'YYYY-MM-DD'
  day: string;        // 'Monday'
  checkIn: string;    // '09:02:00.000'
  checkOut: string;   // '18:15:00.000'
  hours: string;      // '9h 13m'
  status: string;     // 'Present' | 'Absent' | 'Late' | 'Weekend'
}

@Component({
  selector: 'app-attendance-page',
  imports: [LowerCasePipe, SlicePipe],
  templateUrl: './attendance-page.html',
  styleUrl: './attendance-page.css',
})
export class AttendancePage {

  Id = signal<any | number | null>(null);
  records = signal<AttendanceRecord[]>([]);
  selectedRecord = signal<AttendanceRecord | null>(null);
  tableFilter = signal('all');

  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();

  get monthLabel(): string {
    return new Date(this.viewYear, this.viewMonth).toLocaleDateString('en-IN', {
      month: 'long', year: 'numeric'
    });
  }

  // ── Computed stats (status is Capitalized from API) ──
  presentCount = computed(() => this.records().filter(r => r.status === 'Present').length);
  absentCount = computed(() => this.records().filter(r => r.status === 'Absent').length);
  lateCount = computed(() => this.records().filter(r => r.status === 'Late').length);

  totalHours = computed(() => {
    let totalMins = 0;
    this.records().forEach(r => {
      if (!r.hours) return;
      const val = String(r.hours).trim();

      if (val.includes('h') || val.includes('m')) {
        // "9h 13m" or "9h" or "45m"
        const h = val.match(/(\d+)\s*h/);
        const m = val.match(/(\d+)\s*m/);
        totalMins += (h ? parseInt(h[1]) : 0) * 60 + (m ? parseInt(m[1]) : 0);
      } else if (val.includes(':')) {
        // "09:13" HH:MM
        const parts = val.split(':');
        totalMins += parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else if (!isNaN(Number(val))) {
        // decimal "9.5" or plain minutes "550"
        const num = parseFloat(val);
        totalMins += num < 24 ? Math.round(num * 60) : num;
      }
    });
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
  });

  attendanceRate = computed(() => {
    const workdays = this.records().filter(r => r.status !== 'Weekend').length;
    if (!workdays) return 0;
    const attended = this.records().filter(r => r.status === 'Present' || r.status === 'Late').length;
    return Math.round((attended / workdays) * 100);
  });

  filteredRecords = computed(() => {
    const recs = this.records()
      .filter(r => r.status !== 'Weekend')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // ascending by date
    const filter = this.tableFilter();
    if (filter === 'all') return recs;
    return recs.filter(r => r.status === filter);
  });

  constructor(
    private auth: Authservice,
    private attendanceService: AttendanceService
  ) { }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) {
      this.Id.set(id);
      this.getAllAttendance();
    }
  }

  getAllAttendance() {
    this.attendanceService.getByUID(this.Id()).subscribe({
      next: (res: AttendanceRecord[]) => {
        this.records.set(res);
      },
      error: err => console.error('Attendance fetch error:', err)
    });
  }

  selectRecord(r: AttendanceRecord) {
    this.selectedRecord.set(r);
  }

  prevMonth() {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
  }

  nextMonth() {
    if (this.isCurrentMonth()) return;
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.viewYear === now.getFullYear() && this.viewMonth === now.getMonth();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const time = timeStr.split('.')[0];
    const parts = time.split(':');
    let hour = Number(parts[0]);
    const min = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${min} ${ampm}`;
  }
}