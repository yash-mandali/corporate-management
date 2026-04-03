import { Component, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service/user-service';
import { PayrollService } from '../../services/payroll-service/payrollservice';
import { ToastService } from '../../services/toast-service/toast';

@Component({
  selector: 'app-hr-payroll',
  imports: [FormsModule],
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

  // ── Month navigation (signals for reactivity) ──
  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth() + 1); // 1-indexed

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

  readonly todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed labels ──
  currentMonthLabel = computed(() =>
    new Date(this.currentYear(), this.currentMonth() - 1, 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  );

  isCurrentMonth = computed(() => {
    const now = new Date();
    return this.currentYear() === now.getFullYear() && this.currentMonth() === (now.getMonth() + 1);
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

      const basicSalary = struct?.basicSalary ?? 0;
      const hra = struct?.hra ?? 0;
      const pf = struct?.pf ?? 0;
      const otherAllowance = struct?.otherAllowance ?? 0;
      const allowances = hra + otherAllowance;

      const hasPayroll = !!payroll;
      const taxDeduction = payroll?.taxDeduction ?? 0;
      const otherDeductions = payroll?.otherDeductions ?? (hasPayroll ? 0 : pf);
      const netSalary = payroll?.netSalary ?? (basicSalary + allowances - taxDeduction - pf);
      const gross = basicSalary + allowances;
      const status = payroll?.status ?? (struct ? 'Ready' : 'No Salary');

      return {
        empId: emp.id,
        payrollId: payroll?.payrollId ?? null,
        salaryStructureId: struct?.salaryStructureId ?? null,
        userName: emp.userName,
        roleName: emp.roleName,
        hasSalaryStruct: !!struct,
        hasPayroll,
        basicSalary, hra, pf, otherAllowance, allowances,
        gross, taxDeduction, otherDeductions, netSalary,
        status,
        generatedDate: payroll?.generatedDate ?? null,
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

  // ── Month navigation ──
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
    if (this.isCurrentMonth()) return;
    if (this.currentMonth() === 12) {
      this.currentMonth.set(1);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(m => m + 1);
    }
    this.loadMonthPayroll();
  }

  // ── Tax modal ──
  openTaxModal(row: any) {
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
    // Capture tax amount BEFORE closing modal (closing resets it)
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
    // Pre-fill edits from existing struct when entering edit mode
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
      ['Generated', this.todayStr], [],
      ['EARNINGS', '', 'DEDUCTIONS', ''],
      ['Basic Salary', row.basicSalary, 'PF (12%)', row.pf],
      ['HRA (40%)', row.hra, 'Tax Deduction', row.taxDeduction],
      ['Other Allowance', row.otherAllowance, 'Other Deductions', row.otherDeductions],
      ['Total Earnings', row.gross, 'Total Deductions', row.taxDeduction + row.otherDeductions],
      [], ['NET SALARY', row.netSalary],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `slip-${row.userName.replace(/ /g, '-')}-${this.currentYear()}-${this.currentMonth()}.csv`;
    a.click();
  }

  exportPayrollCSV() {
    const headers = ['Employee', 'ID', 'Role', 'Basic', 'HRA', 'Other Allow.', 'Allowances', 'PF', 'Tax Ded.', 'Other Ded.', 'Gross', 'Net Salary', 'Status'];
    const rows = [headers, ...this.filteredRows().map(r => [
      r.userName, `EMP-${r.empId}`, r.roleName,
      r.basicSalary, r.hra, r.otherAllowance, r.allowances,
      r.pf, r.taxDeduction, r.otherDeductions, r.gross, r.netSalary, r.status
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
    return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}