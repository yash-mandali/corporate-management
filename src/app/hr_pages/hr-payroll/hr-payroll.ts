import { Component, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService } from '../../services/user-service/user-service';
import { PayrollService } from '../../services/payroll-service/payrollservice';
import { ToastService } from '../../services/toast-service/toast';
import { LeaveService } from '../../services/leave-service/leave-service';
import { AttendanceService } from '../../services/attendance-service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-hr-payroll',
  imports: [FormsModule,DatePipe],
  templateUrl: './hr-payroll.html',
  styleUrl: './hr-payroll.css',
})
export class HrPayroll implements OnInit {

  // ── Raw API data ──
  allEmployees = signal<any[]>([]);
  allSalaryStruct = signal<any[]>([]);
  monthPayroll = signal<any[]>([]);
  Math = Math;

  // ── Loading flags ──
  isLoading = signal(false);
  payrollLoading = signal(false);
  structLoading = signal(false);
  generatingAll = signal(false);
  actionLoading = signal<any>(null);

  // ── Month navigation ──
  // Default: previous month (payroll is generated for last month)
  currentYear = signal(this.getDefaultYear());
  currentMonth = signal(this.getDefaultMonth());

  // ── Tabs ──
  activeTab = signal<'payroll' | 'slips' | 'settings'>('payroll');

  // ── Filters ──
  searchQ = signal('');
  statusFilter = signal('all');
  slipSearch = signal('');
  setupSearch = signal('');

  // ── Salary setup: per-employee edit mode + edits ──
  editMode = signal<Record<number, boolean>>({});
  salaryEdits = signal<Record<number, { basicSalary: number; otherAllowance: number }>>({});

  // ── Modals ──
  slipModal = signal<any | null>(null);
  taxModal = signal<any | null>(null);
  taxAmount = signal<number>(0);
  deleteConfirmModal = signal<{ type: 'payroll' | 'salary'; row: any } | null>(null);
  payrollDetailModal = signal<any | null>(null);
  markPaidConfirmModal = signal<any | null>(null);

  // ── Generate confirmation modals ──
  generateConfirmModal = signal<any | null>(null);  // single employee row
  generateAllConfirmModal = signal(false);           // generate all

  readonly todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Default to PREVIOUS month ──
  private getDefaultMonth(): number {
    const now = new Date();
    return now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() is 0-indexed, so getMonth() gives previous month
  }

  private getDefaultYear(): number {
    const now = new Date();
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  }

  // ── Payroll lock logic ──
  // HR can generate payroll only in the first 10 days of the following month.
  // Example: March payroll can be generated from Apr 1 to Apr 10.
  // After Apr 10, it's locked.
  isPayrollLocked = computed(() => {
    const now = new Date();
    const today = now.getDate();
    const currentRealMonth = now.getMonth() + 1; // 1-indexed
    const currentRealYear = now.getFullYear();

    // The "allowed generation month" for the selected payroll month is the next month
    const allowedMonth = this.currentMonth() === 12 ? 1 : this.currentMonth() + 1;
    const allowedYear = this.currentMonth() === 12 ? this.currentYear() + 1 : this.currentYear();

    // If we are in the allowed month and within first 10 days → not locked
    if (currentRealYear === allowedYear && currentRealMonth === allowedMonth && today <= 10) {
      return false;
    }
    // If the generation window hasn't opened yet (allowed month is in the future) → not locked but warn
    if (
      allowedYear > currentRealYear ||
      (allowedYear === currentRealYear && allowedMonth > currentRealMonth)
    ) {
      return 'future'; // month not yet finished
    }
    // Otherwise locked
    return true;
  });

  // ── Computed labels ──
  currentMonthLabel = computed(() =>
    new Date(this.currentYear(), this.currentMonth() - 1, 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  );

  // Navigation: cannot go beyond previous month (payroll for current month not allowed)
  isPrevMonthDisabled = computed(() => false); // can always go further back
  isNextMonthDisabled = computed(() => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return this.currentYear() === prevYear && this.currentMonth() === prevMonth;
  });

  // ── Maps ──
  salaryStructMap = computed(() => {
    const m = new Map<number, any>();
    this.allSalaryStruct().forEach(s => m.set(s.userId, s));
    return m;
  });

  payrollMap = computed(() => {
    const m = new Map<number, any>();
    this.monthPayroll().forEach(p => m.set(p.userId, p));
    return m;
  });

  // ── Merged rows ──
  allRows = computed(() => {
    return this.allEmployees().map(emp => {
      const struct = this.salaryStructMap().get(emp.id);
      const payroll = this.payrollMap().get(emp.id);

      const basicSalary = payroll?.basicSalary ?? struct?.basicSalary ?? 0;
      const hra = struct?.hra ?? 0;
      const pf = payroll?.pf ?? struct?.pf ?? 0;
      const otherAllowance = struct?.otherAllowance ?? 0;

      // Use allowances from payroll API response directly
      const allowances = payroll?.allowances ?? (hra + otherAllowance);
      const gross = payroll?.grossSalary ?? (basicSalary + allowances);
      const taxDeduction = payroll?.taxDeduction ?? 0;
      const leaveDeduction = payroll?.leaveDeduction ?? 0;
      const totalDeductions = payroll?.totalDeductions ?? (pf + taxDeduction + leaveDeduction);
      const netSalary = payroll?.netSalary ?? (gross - totalDeductions);
      const unpaidLeaveDays = payroll?.unpaidLeaveDays ?? 0;

      const hasPayroll = !!payroll;

      // Status logic with lock
      let status: string;
      if (payroll?.status === 'Paid') {
        status = 'Paid';
      } else if (payroll?.status) {
        status = payroll.status;
      } else if (this.isPayrollLocked() === true) {
        status = 'Locked';
      } else if (struct) {
        status = 'Ready';
      } else {
        status = 'No Salary';
      }

      return {
        empId: emp.id,
        payrollId: payroll?.payrollId ?? null,
        salaryStructureId: struct?.salaryStructureId ?? null,
        userName: emp.userName,
        roleName: emp.roleName,
        hasSalaryStruct: !!struct,
        hasPayroll,
        basicSalary,
        hra,
        pf,
        otherAllowance,
        allowances,
        gross,
        taxDeduction,
        leaveDeduction,
        totalDeductions,
        unpaidLeaveDays,
        netSalary,
        status,
        generatedDate: payroll?.generatedDate ?? null,
        paidDate: payroll?.paidDate ?? null,
        leaveInfo: null,
        performanceInfo: payroll?.performanceInfo ?? null,
      };
    });
  });

  filteredRows = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const sf = this.statusFilter();
    return this.allRows().filter(r =>
      (!q || r.userName.toLowerCase().includes(q)) &&
      (sf === 'all' || r.status.toLowerCase() === sf.toLowerCase())
    );
  });

  // ── Stats ──
  generatedCount = computed(() => this.allRows().filter(r => r.hasPayroll).length);
  paidCount = computed(() => this.allRows().filter(r => r.status === 'Paid').length);
  totalGross = computed(() => this.allRows().filter(r => r.hasPayroll).reduce((s, r) => s + r.gross, 0));
  totalNet = computed(() => this.allRows().filter(r => r.hasPayroll).reduce((s, r) => s + r.netSalary, 0));
  withSalaryCount = computed(() => this.allRows().filter(r => r.hasSalaryStruct).length);

  filteredSlips = computed(() => {
    const q = this.slipSearch().toLowerCase().trim();
    return this.allRows().filter(r =>
      r.hasPayroll && (!q || r.userName.toLowerCase().includes(q))
    );
  });

  filteredSetupRows = computed(() => {
    const q = this.setupSearch().toLowerCase().trim();
    return this.allEmployees().filter(e => !q || e.userName.toLowerCase().includes(q));
  });

  constructor(
    private userService: UserService,
    private payrollService: PayrollService,
    private leaveService: LeaveService,
    private attendanceService: AttendanceService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    this.isLoading.set(true);
    this.userService.getAllEmployee().subscribe({
      next: (res: any) => {
        this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []);
        this.isLoading.set(false);
      },
      error: err => { console.error(err); this.isLoading.set(false); }
    });
    this.loadSalaryStructures();
    this.loadMonthPayroll();
  }

  loadSalaryStructures() {
    this.structLoading.set(true);
    this.payrollService.getAllSalaryStructure().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? (res ? [res] : []);
        this.allSalaryStruct.set(list);
        this.structLoading.set(false);
      },
      error: err => { console.error(err); this.structLoading.set(false); }
    });
  }

  loadMonthPayroll() {
    this.payrollLoading.set(true);
    this.payrollService.getAllPayrollByMonth(this.currentMonth()).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? (res ? [res] : []);
        this.monthPayroll.set(list.filter((p: any) => p.year === this.currentYear()));
        this.payrollLoading.set(false);
      },
      error: err => { console.error(err); this.payrollLoading.set(false); }
    });
  }

  // ── Month navigation (max = previous month) ──
  prevMonth() {
    if (this.currentMonth() === 1) {
      this.currentMonth.set(12);
      this.currentYear.update(y => y - 1);
    } else {
      this.currentMonth.update(m => m - 1);
    }
    this.loadMonthPayroll();
  }

  nextMonth() {
    if (this.isNextMonthDisabled()) return;
    if (this.currentMonth() === 12) {
      this.currentMonth.set(1);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(m => m + 1);
    }
    this.loadMonthPayroll();
  }

  // ── Lock banner label ──
  getLockStatusLabel(): string {
    const locked = this.isPayrollLocked();
    if (locked === true) {
      const allowedMonth = this.currentMonth() === 12 ? 1 : this.currentMonth() + 1;
      const allowedYear = this.currentMonth() === 12 ? this.currentYear() + 1 : this.currentYear();
      const monthName = new Date(allowedYear, allowedMonth - 1, 1)
        .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      return `Payroll generation window closed. ${this.currentMonthLabel()} payroll could only be generated in first 10 days of ${monthName}.`;
    }
    if (locked === 'future') {
      const allowedMonth = this.currentMonth() === 12 ? 1 : this.currentMonth() + 1;
      const allowedYear = this.currentMonth() === 12 ? this.currentYear() + 1 : this.currentYear();
      const monthName = new Date(allowedYear, allowedMonth - 1, 1)
        .toLocaleDateString('en-IN', { month: 'long' });
      return `${this.currentMonthLabel()} is not yet complete. Payroll can be generated from 1–10 ${monthName}.`;
    }
    const allowedMonth = this.currentMonth() === 12 ? 1 : this.currentMonth() + 1;
    const allowedYear = this.currentMonth() === 12 ? this.currentYear() + 1 : this.currentYear();
    const now = new Date();
    const daysLeft = 10 - now.getDate();
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
    // console.log(currentMonthName);
    return `Generation window open. ${daysLeft} day(s) remaining (closes on 10th ${currentMonthName}).`;
  }

  getLockClass(): string {
    const locked = this.isPayrollLocked();
    if (locked === true) return 'lock-closed';
    if (locked === 'future') return 'lock-future';
    return 'lock-open';
  }

  canGenerate(): boolean {
    return this.isPayrollLocked() === false;
  }

  // ── Generate single: show confirm first ──
  openGenerateConfirm(row: any) {
    if (!this.canGenerate()) {
      this.toast.error('Payroll generation window is closed for this month.');
      return;
    }
    this.generateConfirmModal.set(row);
    document.body.style.overflow = 'hidden';
  }

  closeGenerateConfirm() {
    this.generateConfirmModal.set(null);
    document.body.style.overflow = '';
  }

  confirmGenerateSingle() {
    const row = this.generateConfirmModal();
    if (!row) return;
    this.closeGenerateConfirm();
    this.openTaxModal(row);
  }

  // ── Generate all: show confirm first ──
  openGenerateAllConfirm() {
    if (!this.canGenerate()) {
      this.toast.error('Payroll generation window is closed for this month.');
      return;
    }
    this.generateAllConfirmModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeGenerateAllConfirm() {
    this.generateAllConfirmModal.set(false);
    document.body.style.overflow = '';
  }

  confirmGenerateAll() {
    this.closeGenerateAllConfirm();
    this.executeGenerateAll();
  }

  // ── Tax modal ──
  openTaxModal(row: any) {
    if (!this.canGenerate()) {
      this.toast.error('Payroll generation window is closed for this month.');
      return;
    }
    this.taxAmount.set(0);
    this.taxModal.set(row);
    document.body.style.overflow = 'hidden';
  }

  closeTaxModal() {
    this.taxModal.set(null);
    this.taxAmount.set(0);
    document.body.style.overflow = '';
  }

  confirmGenerate() {
    const row = this.taxModal();
    if (!row) return;
    const tax = this.taxAmount();
    this.closeTaxModal();
    this.generatePayroll(row, tax);
  }

  generatePayroll(row: any, taxDeduction = 0) {
    this.actionLoading.set(row.empId);
    this.payrollService.generatePayroll({
      userId: row.empId,
      month: this.currentMonth(),
      year: this.currentYear(),
      taxDeduction,
    }).subscribe({
      next: () => {
        this.loadMonthPayroll();
        this.actionLoading.set(null);
        this.toast.success(`Payroll generated for ${row.userName}.`);
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to generate payroll.');
        this.actionLoading.set(null);
      }
    });
  }

  // ── Generate all ──
  generateAll() {
    this.openGenerateAllConfirm();
  }

  private executeGenerateAll() {
    this.generatingAll.set(true);
    this.payrollService.generateAllPayroll(this.currentMonth(), this.currentYear()).subscribe({
      next: () => {
        this.loadMonthPayroll();
        this.generatingAll.set(false);
        this.toast.success('All payrolls generated successfully.');
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to generate all payrolls.');
        this.generatingAll.set(false);
      }
    });
  }

  // ── Payroll Detail Modal — fetches leave + attendance data ──
  openPayrollDetail(row: any) {
    this.payrollDetailModal.set(row);
    document.body.style.overflow = 'hidden';

    // Fetch all three APIs in parallel
    forkJoin({
      myLeaves: this.leaveService.getMyleaveList(row.empId).pipe(catchError(() => of([]))),
      leaveBalance: this.leaveService.getUserLeaveBalance(row.empId).pipe(catchError(() => of([]))),
      attendance: this.attendanceService.getByUID(row.empId).pipe(catchError(() => of([]))),
    }).subscribe(({ myLeaves, leaveBalance, attendance }) => {
      const leaveList: any[] = Array.isArray(myLeaves) ? myLeaves : (myLeaves as any)?.data ?? [];
      const balanceList: any[] = Array.isArray(leaveBalance) ? leaveBalance : (leaveBalance as any)?.data ?? [];
      const attendanceList: any[] = Array.isArray(attendance) ? attendance : (attendance as any)?.data ?? [];

      const payrollYear = this.currentYear();
      const payrollMonth = this.currentMonth();

      // ── Leave summary — filter by payroll month ──

      // Total leaves taken = count of leave requests that fall in the payroll month
      const monthLeaves = leaveList.filter((l: any) => {
        const from = new Date(l.fromDate);
        return from.getFullYear() === payrollYear && (from.getMonth() + 1) === payrollMonth;
      });
      const totalLeaves = monthLeaves.length;

      // Approved leaves (used) in payroll month = sum of totalDays for Approved leaves in that month
      const approvedLeaves = monthLeaves
        .filter((l: any) => l.status === 'Approved')
        .reduce((s: number, l: any) => s + (l.totalDays ?? 0), 0);

      // Remaining leave balance = sum of remainingLeaveBalance (yearly, from balance API)
      const leaveBalance2 = balanceList.reduce((s: number, l: any) => s + (l.remainingLeaveBalance ?? 0), 0);

      // Unpaid leaves = from payroll API response (already in row)
      const unpaidLeaves = row.unpaidLeaveDays ?? 0;

      const monthAttendance = attendanceList.filter((a: any) => {
        const d = new Date(a.date);
        return d.getFullYear() === payrollYear && (d.getMonth() + 1) === payrollMonth;
      });

      const daysPresent = monthAttendance.length;

      // Working days = total days in month minus Saturdays & Sundays
      const totalDaysInMonth = new Date(payrollYear, payrollMonth, 0).getDate();
      let weekendCount = 0;
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const day = new Date(payrollYear, payrollMonth - 1, d).getDay();
        if (day === 0 || day === 6) weekendCount++;
      }
      const workingDays = totalDaysInMonth - weekendCount;
      const daysAbsent = Math.max(0, workingDays - daysPresent);

      this.payrollDetailModal.update(r => r ? {
        ...r,
        leaveInfo: {
          totalLeaves,
          approvedLeaves,
          leaveBalance: leaveBalance2,
          unpaidLeaves,
          daysPresent,
          daysAbsent,
          workingDays,
          leaveDeduction: row.leaveDeduction ?? 0,
        }
      } : r);
    });
  }

  closePayrollDetail() {
    this.payrollDetailModal.set(null);
    document.body.style.overflow = '';
  }

  // ── Mark as Paid ──
  openMarkPaidConfirm(row: any) {
    this.markPaidConfirmModal.set(row);
    document.body.style.overflow = 'hidden';
  }

  closeMarkPaidConfirm() {
    this.markPaidConfirmModal.set(null);
    document.body.style.overflow = '';
  }

  confirmMarkPaid() {
    const row = this.markPaidConfirmModal();
    if (!row) return;
    this.closeMarkPaidConfirm();
    this.executeMarkPaid(row);
  }

  private executeMarkPaid(row: any) {
    this.actionLoading.set(row.empId);
    this.payrollService.markPayrollAsPaid(row.payrollId).subscribe({
      next: () => {
        this.loadMonthPayroll();
        this.actionLoading.set(null);
        this.toast.success(`Payroll marked as paid for ${row.userName}.`);
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to mark as paid.');
        this.actionLoading.set(null);
      }
    });
  }

  // ── Delete confirmation modal ──
  openDeleteConfirm(type: 'payroll' | 'salary', row: any) {
    this.deleteConfirmModal.set({ type, row });
    document.body.style.overflow = 'hidden';
  }

  closeDeleteConfirm() {
    this.deleteConfirmModal.set(null);
    document.body.style.overflow = '';
  }

  confirmDelete() {
    const modal = this.deleteConfirmModal();
    if (!modal) return;
    this.closeDeleteConfirm();
    if (modal.type === 'payroll') {
      this.executeDeletePayroll(modal.row);
    } else {
      this.executeDeleteSalaryStructure(modal.row);
    }
  }

  deletePayroll(row: any) {
    if (!row.payrollId) return;
    if (row.status === 'Paid') {
      this.toast.error('Paid payrolls cannot be deleted.');
      return;
    }
    this.openDeleteConfirm('payroll', row);
  }

  private executeDeletePayroll(row: any) {
    this.actionLoading.set(row.empId);
    this.payrollService.deletePayroll(row.payrollId).subscribe({
      next: () => {
        this.loadMonthPayroll();
        this.actionLoading.set(null);
        this.toast.success('Payroll deleted.');
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to delete payroll.');
        this.actionLoading.set(null);
      }
    });
  }

  // ── Salary setup ──
  isEditMode(empId: number): boolean {
    return !!this.editMode()[empId];
  }

  enableEditMode(empId: number) {
    const struct = this.salaryStructMap().get(empId);
    this.salaryEdits.update(e => ({
      ...e,
      [empId]: {
        basicSalary: struct?.basicSalary ?? 0,
        otherAllowance: struct?.otherAllowance ?? 0,
      }
    }));
    this.editMode.update(m => ({ ...m, [empId]: true }));
  }

  cancelEditMode(empId: number) {
    this.editMode.update(m => { const n = { ...m }; delete n[empId]; return n; });
    this.salaryEdits.update(e => { const n = { ...e }; delete n[empId]; return n; });
  }

  getEdit(empId: number) {
    const struct = this.salaryStructMap().get(empId);
    const edits = this.salaryEdits()[empId];
    return {
      basicSalary: edits?.basicSalary ?? struct?.basicSalary ?? 0,
      otherAllowance: edits?.otherAllowance ?? struct?.otherAllowance ?? 0,
    };
  }

  updateEdit(empId: number, field: 'basicSalary' | 'otherAllowance', value: number) {
    const current = this.getEdit(empId);
    this.salaryEdits.update(e => ({ ...e, [empId]: { ...current, [field]: value } }));
  }

  saveSalaryStructure(empId: number) {
    const edit = this.getEdit(empId);
    const struct = this.salaryStructMap().get(empId);
    this.actionLoading.set(`setup_${empId}`);

    if (struct) {
      this.payrollService.updateSalaryStructure({
        salaryStructureId: struct.salaryStructureId,
        basicSalary: edit.basicSalary,
        otherAllowance: edit.otherAllowance,
      }).subscribe({
        next: () => {
          this.loadSalaryStructures();
          this.cancelEditMode(empId);
          this.actionLoading.set(null);
          this.toast.success(`Salary updated for ${struct.userName ?? 'employee'}.`);
        },
        error: err => {
          this.toast.error(err?.error?.message || 'Update failed.');
          this.actionLoading.set(null);
        }
      });
    } else {
      this.payrollService.createSalaryStructure({
        userId: empId,
        basicSalary: edit.basicSalary,
        otherAllowance: edit.otherAllowance,
      }).subscribe({
        next: () => {
          this.loadSalaryStructures();
          this.cancelEditMode(empId);
          this.actionLoading.set(null);
          this.toast.success('Salary structure created.');
        },
        error: err => {
          this.toast.error(err?.error?.message || 'Create failed.');
          this.actionLoading.set(null);
        }
      });
    }
  }

  deleteSalaryStructure(empId: number) {
    const struct = this.salaryStructMap().get(empId);
    if (!struct) return;
    this.openDeleteConfirm('salary', { empId, struct });
  }

  private executeDeleteSalaryStructure(payload: { empId: number; struct: any }) {
    this.actionLoading.set(`del_${payload.empId}`);
    this.payrollService.deleteSalaryStructure(payload.struct.salaryStructureId).subscribe({
      next: () => {
        this.loadSalaryStructures();
        this.cancelEditMode(payload.empId);
        this.actionLoading.set(null);
        this.toast.success('Salary structure deleted.');
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Delete failed.');
        this.actionLoading.set(null);
      }
    });
  }

  // ── Slip modal ──
  openSlip(row: any) { this.slipModal.set(row); document.body.style.overflow = 'hidden'; }
  closeSlip() { this.slipModal.set(null); document.body.style.overflow = ''; }
  printSlip() { window.print(); }

  downloadSlip(row: any) {
    const rows = [
      ['SALARY SLIP', this.currentMonthLabel()], [],
      ['Employee', row.userName],
      ['Employee ID', `EMP-${row.empId}`],
      ['Role', row.roleName],
      ['Pay Period', this.currentMonthLabel()],
      ['Generated', this.todayStr],
      ['Status', row.status], [],
      ['EARNINGS', '', 'DEDUCTIONS', ''],
      ['Basic Salary', row.basicSalary, 'PF (12%)', row.pf],
      ['Allowances', row.allowances, 'Tax Deduction', row.taxDeduction],
      ['', '', 'Leave Deduction', row.leaveDeduction],
      ['Total Earnings', row.gross, 'Total Deductions', row.totalDeductions],
      [], ['NET SALARY', row.netSalary],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `slip-${row.userName.replace(/ /g, '-')}-${this.currentYear()}-${this.currentMonth()}.csv`;
    a.click();
  }

  exportPayrollCSV() {
    const headers = ['Employee', 'ID', 'Role', 'Basic', 'Allowances', 'Gross', 'PF', 'Tax Ded.', 'Leave Ded.', 'Total Ded.', 'Net Salary', 'Status'];
    const rows = [headers, ...this.filteredRows().map(r => [
      r.userName, `EMP-${r.empId}`, r.roleName,
      r.basicSalary, r.allowances, r.gross,
      r.pf, r.taxDeduction, r.leaveDeduction, r.totalDeductions, r.netSalary, r.status
    ])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `payroll-${this.currentYear()}-${this.currentMonth()}.csv`;
    a.click();
  }

  // ── Helpers ──
  formatAmt(n: number) { return (n || 0).toLocaleString('en-IN'); }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getColor(id: any): string {
    return this.colorPool[(Number(id) || 0) % this.colorPool.length];
  }

  formatDate(ds: string): string {
    if (!ds) return '—';
    const d = new Date(ds);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}