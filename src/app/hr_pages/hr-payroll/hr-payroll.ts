import { Component, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';

interface SalaryConfig {
  basicSalary: number;
  hra: number;
  transport: number;
  otherAllowance: number;
}

interface PayrollRow {
  empId: number;
  userName: string;
  roleName: string;
  presentDays: number;
  absentDays: number;
  basicSalary: number;
  hra: number;
  transport: number;
  otherAllowance: number;
  allowances: number;
  absentDeduction: number;
  pf: number;
  professionalTax: number;
  deductions: number;
  gross: number;
  netPay: number;
  status: 'pending' | 'processed';
}

const STORAGE_SALARY = 'hrms_salary_config';
const STORAGE_PAYROLL = 'hrms_payroll_';   // + YYYY-MM

@Component({
  selector: 'app-hr-payroll',
  imports: [FormsModule],
  templateUrl: './hr-payroll.html',
  styleUrl: './hr-payroll.css',
})
export class HrPayroll implements OnInit {

  // ── Data ──
  allEmployees = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  isLoading = signal(false);
  generatingAll = signal(false);

  // ── Month navigation ──
  currentYear = new Date().getFullYear();
  currentMonth = signal(new Date().getMonth()); // 0-indexed

  // ── Tabs ──
  activeTab = signal<'payroll' | 'slips' | 'settings'>('payroll');

  // ── Filters ──
  searchQ = signal('');
  statusFilter = signal('all');
  slipSearch = signal('');
  setupSearch = signal('');

  // ── Salary configs (persisted) ──
  salaryConfigs = signal<Record<number, SalaryConfig>>({});

  // ── Processed payroll for current month (persisted) ──
  monthPayroll = signal<Record<number, PayrollRow>>({});

  // ── Modal ──
  slipModal = signal<PayrollRow | null>(null);

  readonly todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // ── Color pool ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed month label ──
  currentMonthLabel = computed(() =>
    new Date(this.currentYear, this.currentMonth(), 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  );

  isCurrentMonth = computed(() => {
    const now = new Date();
    return this.currentYear === now.getFullYear() && this.currentMonth() === now.getMonth();
  });

  // ── Attendance for current month ──
  private monthAttendance = computed(() => {
    const y = this.currentYear, m = this.currentMonth();
    return this.allAttendance().filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  });

  workingDaysInMonth = computed(() => {
    const y = this.currentYear, m = this.currentMonth();
    const days = new Date(y, m + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const dow = new Date(y, m, d).getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  });

  // ── Build payroll rows (all employees) ──
  allPayrollRows = computed(() => {
    const attMap = new Map<number, { present: number; absent: number }>();
    this.allEmployees().forEach(emp => attMap.set(emp.id, { present: 0, absent: 0 }));

    this.monthAttendance().forEach(r => {
      const entry = attMap.get(r.userId);
      if (!entry) return;
      if (r.status === 'Present' || r.status === 'Late') entry.present++;
      else if (r.status === 'Absent') entry.absent++;
    });

    const configs = this.salaryConfigs();
    const payrolls = this.monthPayroll();

    return this.allEmployees().map(emp => {
      const saved = payrolls[emp.id];
      if (saved) return saved;

      const att = attMap.get(emp.id) ?? { present: 0, absent: 0 };
      const cfg = configs[emp.id] ?? this.defaultConfig();
      const wdays = this.workingDaysInMonth();
      const dailyRate = wdays > 0 ? cfg.basicSalary / wdays : 0;
      const absentDeduction = Math.round(dailyRate * att.absent);
      const pf = Math.round(cfg.basicSalary * 0.12);
      const professionalTax = this.calcProfessionalTax(cfg.basicSalary);
      const allowances = cfg.hra + cfg.transport + cfg.otherAllowance;
      const gross = cfg.basicSalary + allowances;
      const deductions = absentDeduction + pf + professionalTax;
      const netPay = Math.max(0, gross - deductions);

      return {
        empId: emp.id, userName: emp.userName, roleName: emp.roleName,
        presentDays: att.present, absentDays: att.absent,
        basicSalary: cfg.basicSalary, hra: cfg.hra,
        transport: cfg.transport, otherAllowance: cfg.otherAllowance,
        allowances, absentDeduction, pf, professionalTax,
        deductions, gross, netPay, status: 'pending' as const,
      };
    });
  });

  filteredPayroll = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const sf = this.statusFilter();
    return this.allPayrollRows()
      .filter(r => {
        const matchQ = !q || r.userName.toLowerCase().includes(q);
        const matchS = sf === 'all' || r.status === sf;
        return matchQ && matchS;
      });
  });

  processedCount = computed(() => this.allPayrollRows().filter(r => r.status === 'processed').length);
  totalGross = computed(() => this.allPayrollRows().filter(r => r.status === 'processed').reduce((s, r) => s + r.gross, 0));
  totalNet = computed(() => this.allPayrollRows().filter(r => r.status === 'processed').reduce((s, r) => s + r.netPay, 0));

  // ── Slips tab ──
  filteredSlips = computed(() => {
    const q = this.slipSearch().toLowerCase().trim();
    return this.allPayrollRows()
      .filter(r => r.status === 'processed' && (!q || r.userName.toLowerCase().includes(q)));
  });

  // ── Setup tab ──
  filteredSetupEmployees = computed(() => {
    const q = this.setupSearch().toLowerCase().trim();
    return this.allEmployees().filter(e => !q || e.userName.toLowerCase().includes(q));
  });

  constructor(
    private userService: UserService,
    private attendanceService: AttendanceService
  ) { }

  ngOnInit() {
    this.loadFromStorage();
    this.isLoading.set(true);

    let pending = 2;
    const done = () => { if (--pending === 0) this.isLoading.set(false); };

    this.userService.getAllEmployee().subscribe({
      next: (res: any) => { this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []); done(); },
      error: err => { console.error(err); done(); }
    });

    this.attendanceService.getAllattendance().subscribe({
      next: (res: any) => { this.allAttendance.set(Array.isArray(res) ? res : res ? [res] : []); done(); },
      error: err => { console.error(err); done(); }
    });
  }

  // ── Month navigation ──
  prevMonth() {
    if (this.currentMonth() === 0) { this.currentMonth.set(11); this.currentYear--; }
    else this.currentMonth.update(m => m - 1);
    this.loadMonthPayroll();
  }

  nextMonth() {
    if (this.isCurrentMonth()) return;
    if (this.currentMonth() === 11) { this.currentMonth.set(0); this.currentYear++; }
    else this.currentMonth.update(m => m + 1);
    this.loadMonthPayroll();
  }

  // ── Payroll actions ──
  processPayroll(row: PayrollRow) {
    const processed = { ...row, status: 'processed' as const };
    this.monthPayroll.update(p => ({ ...p, [row.empId]: processed }));
    this.saveMonthPayroll();
  }

  resetPayroll(empId: number) {
    this.monthPayroll.update(p => { const n = { ...p }; delete n[empId]; return n; });
    this.saveMonthPayroll();
  }

  generateAllPayroll() {
    this.generatingAll.set(true);
    const rows = this.allPayrollRows().filter(r => r.status === 'pending' && r.basicSalary > 0);
    const update: Record<number, PayrollRow> = { ...this.monthPayroll() };
    rows.forEach(r => update[r.empId] = { ...r, status: 'processed' });
    this.monthPayroll.set(update);
    this.saveMonthPayroll();
    setTimeout(() => this.generatingAll.set(false), 500);
  }

  // ── Slip modal ──
  openSlip(row: PayrollRow) { this.slipModal.set(row); document.body.style.overflow = 'hidden'; }

  printSlip() { window.print(); }

  downloadSlip(slip: PayrollRow) {
    const rows = [
      ['SALARY SLIP', `${this.currentMonthLabel()}`],
      [],
      ['Employee Name', slip.userName],
      ['Employee ID', `EMP-${slip.empId}`],
      ['Designation', slip.roleName],
      ['Pay Period', this.currentMonthLabel()],
      ['Days Present', slip.presentDays],
      ['Days Absent', slip.absentDays],
      [],
      ['EARNINGS', '', 'DEDUCTIONS', ''],
      ['Basic Salary', slip.basicSalary, 'Absent Deduction', slip.absentDeduction],
      ['HRA', slip.hra, 'PF (12%)', slip.pf],
      ['Transport', slip.transport, 'Professional Tax', slip.professionalTax],
      ['Other Allowance', slip.otherAllowance, '', ''],
      ['Total Earnings', slip.gross, 'Total Deductions', slip.deductions],
      [],
      ['NET PAY', slip.netPay],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `salary-slip-${slip.userName.replace(/ /g, '-')}-${this.currentMonthLabel().replace(/ /g, '-')}.csv`;
    a.click();
  }

  exportPayrollCSV() {
    const headers = ['Employee', 'ID', 'Role', 'Present', 'Absent', 'Basic', 'Allowances', 'Deductions', 'Gross', 'Net Pay', 'Status'];
    const rows = [headers, ...this.filteredPayroll().map(r => [
      r.userName, `EMP-${r.empId}`, r.roleName,
      r.presentDays, r.absentDays, r.basicSalary,
      r.allowances, r.deductions, r.gross, r.netPay, r.status
    ])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `payroll-${this.currentMonthLabel().replace(/ /g, '-')}.csv`;
    a.click();
  }

  // ── Salary config ──
  getSalaryConfig(empId: number): SalaryConfig {
    return this.salaryConfigs()[empId] ?? this.defaultConfig();
  }

  updateSalaryField(empId: number, field: keyof SalaryConfig, value: number) {
    const current = this.getSalaryConfig(empId);
    this.salaryConfigs.update(c => ({ ...c, [empId]: { ...current, [field]: value } }));
    this.saveSalaryConfigs();
  }

  private defaultConfig(): SalaryConfig {
    return { basicSalary: 0, hra: 0, transport: 0, otherAllowance: 0 };
  }

  private calcProfessionalTax(basic: number): number {
    if (basic <= 10000) return 0;
    if (basic <= 15000) return 150;
    return 200;
  }

  // ── LocalStorage ──
  private monthKey() { return `${STORAGE_PAYROLL}${this.currentYear}-${String(this.currentMonth() + 1).padStart(2, '0')}`; }

  loadFromStorage() {
    try {
      const cfg = localStorage.getItem(STORAGE_SALARY);
      if (cfg) this.salaryConfigs.set(JSON.parse(cfg));
    } catch { }
    this.loadMonthPayroll();
  }

  loadMonthPayroll() {
    try {
      const p = localStorage.getItem(this.monthKey());
      this.monthPayroll.set(p ? JSON.parse(p) : {});
    } catch { this.monthPayroll.set({}); }
  }

  saveSalaryConfigs() {
    try { localStorage.setItem(STORAGE_SALARY, JSON.stringify(this.salaryConfigs())); } catch { }
  }

  saveMonthPayroll() {
    try { localStorage.setItem(this.monthKey(), JSON.stringify(this.monthPayroll())); } catch { }
  }

  // ── Helpers ──
  formatAmount(n: number): string {
    return (n || 0).toLocaleString('en-IN');
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getColor(id: any): string {
    return this.colorPool[(Number(id) || 0) % this.colorPool.length];
  }
}