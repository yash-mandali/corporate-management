import { Component, computed, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { ToastService } from '../../services/toast-service/toast';

const APPROVED_SET = new Set(['approved', 'managerapproved']);
const REJECTED_SET = new Set(['rejected', 'managerrejected']);

const DEPARTMENTS = [
  'Human Resources (HR)', 'IT / Engineering', 'Software Development',
  'Quality Assurance (QA)', 'DevOps', 'UI/UX Design', 'Sales',
  'Marketing', 'Customer Support', 'Finance & Accounts', 'Administrator',
];

@Component({
  selector: 'app-hr-employees',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './hr-employees.html',
  styleUrl: './hr-employees.css',
})
export class HrEmployeesPage implements OnInit {

  readonly departments = DEPARTMENTS;
  detailLoading = signal(false);
  allEmployees = signal<any[]>([]);
  allManagers = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  allLeaves = signal<any[]>([]);
  isLoading = signal(false);
  deletingId = signal<any>(null);
  formSaving = signal(false);
  formError = signal<string | null>(null);
  showPass = false;

  formModal = signal(false);
  editingEmployee = signal<any | null>(null);
  detailModal = signal<any | null>(null);
  deleteModal = signal<any | null>(null);
  assignModal = signal<any | null>(null);
  selectedManagerId: any = '';
  assignSaving = signal(false);
  assignError = signal<string | null>(null);

  searchQ = signal('');
  roleFilter = signal('all');
  deptFilter = signal('all');
  statusFilter = signal('all');
  joinFrom = signal('');
  joinTo = signal('');
  currentPage = signal(1);
  readonly pageSize = 10;

  empForm: FormGroup;

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  totalCount = computed(() => this.allEmployees().length);
  empRoleCount = computed(() => this.allEmployees().filter(e => String(e.roleId) === '2' || e.roleName?.toLowerCase() === 'employee').length);
  mgrRoleCount = computed(() => this.allEmployees().filter(e => String(e.roleId) === '3' || e.roleName?.toLowerCase() === 'manager').length);
  activeCount = computed(() => this.allEmployees().filter(e => e.isActive).length);
  newThisMonth = computed(() => {
    const now = new Date();
    return this.allEmployees().filter(e => {
      if (!e.createdAt) return false;
      const d = new Date(e.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  });

  filteredEmployees = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const rf = this.roleFilter();
    const dept = this.deptFilter();
    const sf = this.statusFilter();
    const from = this.joinFrom();
    const to = this.joinTo();

    return this.allEmployees().filter(emp => {
      if (q && !(
        (emp.userName || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.phoneNumber || '').toLowerCase().includes(q)
      )) return false;
      if (rf === '2' && !(String(emp.roleId) === '2' || emp.roleName?.toLowerCase() === 'employee')) return false;
      if (rf === '3' && !(String(emp.roleId) === '3' || emp.roleName?.toLowerCase() === 'manager')) return false;
      if (dept !== 'all' && (emp.department || '').toLowerCase() !== dept.toLowerCase()) return false;
      if (sf === 'active' && !emp.isActive) return false;
      if (sf === 'offline' && emp.isActive) return false;
      if (from && emp.createdAt && new Date(emp.createdAt) < new Date(from + 'T00:00:00')) return false;
      if (to && emp.createdAt && new Date(emp.createdAt) > new Date(to + 'T23:59:59')) return false;
      return true;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEmployees().length / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedEmployees = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEmployees().slice(s, s + this.pageSize);
  });

  hasActiveFilters = computed(() =>
    this.roleFilter() !== 'all' || this.deptFilter() !== 'all' ||
    this.statusFilter() !== 'all' || !!this.joinFrom() || !!this.joinTo() || !!this.searchQ()
  );

  private detailMonthAtt = computed(() => {
    const emp = this.detailModal(); if (!emp) return [];
    const now = new Date();
    return this.allAttendance().filter(r => {
      const d = new Date(r.date);
      return r.userId === emp.id &&
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  });

  detailAttendanceRate = computed(() => {
    const att = this.detailMonthAtt();
    if (!att.length) return 0;
    const now = new Date();
    const present = att.filter(r => r.status === 'Present').length;
    const late = att.filter(r => r.status === 'Late').length;
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round(((present + late) / totalDays) * 100);
  });

  detailPresentDays = computed(() => this.detailMonthAtt().filter(r => r.status === 'Present' || r.status === 'Late').length);
  detailLateDays = computed(() => this.detailMonthAtt().filter(r => r.status === 'Late').length);
  detailAbsentDays = computed(() => this.detailMonthAtt().filter(r => r.status === 'Absent').length);
  detailLeaves = computed(() => this.allLeaves().filter(l => l.userId === this.detailModal()?.id));
  detailPendingLeaves = computed(() => this.detailLeaves().filter(l => l.status?.toLowerCase() === 'pending').length);
  detailApprovedLeaves = computed(() => this.detailLeaves().filter(l => APPROVED_SET.has(l.status?.toLowerCase())).length);
  detailRejectedLeaves = computed(() => this.detailLeaves().filter(l => REJECTED_SET.has(l.status?.toLowerCase())).length);
  detailWithdrawnLeaves = computed(() => this.detailLeaves().filter(l => l.status?.toLowerCase() === 'withdrawn').length);
  detailTotalLeaves = computed(() => this.detailLeaves().length);

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private attendanceService: AttendanceService,
    private leaveService: LeaveService,
    private toast: ToastService
  ) {
    this.empForm = this.fb.group({
      userName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      department: [''],
      password: [''],
      roleId: ['', Validators.required],
      gender: [''],
      address: [''],
    });
  }

  ngOnInit() {
    this.loadEmployeesManagers();
    this.loadManagers();
    this.loadAttendance();
    this.loadLeaves();
  }

  loadEmployeesManagers() {
    this.isLoading.set(true);
    this.userService.getAllEmployeeManager().subscribe({
      next: (res: any) => { this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []); this.isLoading.set(false); },
      error: err => { console.error(err); this.isLoading.set(false); }
    });
  }

  loadManagers() {
    this.userService.getAllManager().subscribe({
      next: (res: any) => this.allManagers.set(Array.isArray(res) ? res : res ? [res] : []),
      error: err => console.error(err)
    });
  }

  loadAttendance() {
    this.attendanceService.getAllattendance().subscribe({
      next: (res: any) => this.allAttendance.set(Array.isArray(res) ? res : res ? [res] : []),
      error: err => console.error(err)
    });
  }

  loadLeaves() {
    this.leaveService.getAllLeaves().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? (res ? [res] : []);
        this.allLeaves.set(list);
      },
      error: err => console.error(err)
    });
  }

  onDeptChange(dept: string) {
    this.deptFilter.set(dept);
    this.currentPage.set(1);
    if (dept !== 'all') {
      this.isLoading.set(true);
      this.userService.getEmployeeByDepartment(dept).subscribe({
        next: (res: any) => { this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []); this.isLoading.set(false); },
        error: err => { console.error(err); this.isLoading.set(false); }
      });
    } else {
      this.loadEmployeesManagers();
    }
  }

  clearAllFilters() {
    this.searchQ.set('');
    this.roleFilter.set('all');
    this.statusFilter.set('all');
    this.joinFrom.set('');
    this.joinTo.set('');
    this.currentPage.set(1);
    if (this.deptFilter() !== 'all') { this.deptFilter.set('all'); this.loadEmployeesManagers(); }
  }

  onSearch(val: string) { this.searchQ.set(val); this.currentPage.set(1); }
  setRoleFilter(f: string) { this.roleFilter.set(f); this.currentPage.set(1); }
  setStatusFilter(f: string) { this.statusFilter.set(f); this.currentPage.set(1); }
  onJoinFrom(val: string) { this.joinFrom.set(val); this.currentPage.set(1); }
  onJoinTo(val: string) { this.joinTo.set(val); this.currentPage.set(1); }

  openAddModal() {
    this.editingEmployee.set(null);
    this.formError.set(null);
    this.showPass = false;
    this.empForm.reset();
    this.empForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.empForm.get('password')?.updateValueAndValidity();
    this.formModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  openEditModal(emp: any) {
    this.editingEmployee.set(emp);
    this.formError.set(null);
    this.showPass = false;
    this.empForm.get('password')?.clearValidators();
    this.empForm.get('password')?.updateValueAndValidity();
    this.empForm.patchValue({
      userName: emp.userName,
      email: emp.email,
      phoneNumber: emp.phoneNumber || '',
      department: emp.department || '',
      roleId: String(emp.roleId || ''),
      gender: emp.gender || '',
      address: emp.address || '',
    });
    this.formModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeFormModal() {
    this.formModal.set(false);
    this.editingEmployee.set(null);
    this.formError.set(null);
    this.empForm.reset();
    document.body.style.overflow = '';
  }

  saveEmployee() {
    this.formError.set(null);
    if (this.empForm.invalid) { this.empForm.markAllAsTouched(); this.formError.set('Please fill all required fields.'); return; }

    const v = this.empForm.value;
    this.formSaving.set(true);

    if (this.editingEmployee()) {
      const payload = {
        id: this.editingEmployee().id,
        userName: v.userName,
        email: v.email,
        phoneNumber: v.phoneNumber || '',
        department: v.department || '',
        gender: v.gender || '',
        address: v.address || '',
      };
      this.userService.updateUser(payload).subscribe({
        next: () => {
          this.allEmployees.update(list => list.map(e => e.id === payload.id ? { ...e, ...payload } : e));
          this.formSaving.set(false);
          this.closeFormModal();
          this.toast.success('Employee updated successfully.');
        },
        error: err => { this.formSaving.set(false); this.formError.set(err?.error?.message || 'Update failed.'); }
      });
    } else {
      const payload = {
        userName: v.userName,
        email: v.email,
        phoneNumber: v.phoneNumber || '',
        department: v.department || '',
        password: v.password,
        roleId: Number(v.roleId),
        gender: v.gender || '',
        address: v.address || '',
      };
      this.userService.addUser(payload).subscribe({
        next: () => {
          this.formSaving.set(false);
          this.closeFormModal();
          this.loadEmployeesManagers();
          this.toast.success('Employee added successfully.');
        },
        error: err => { this.formSaving.set(false); this.formError.set(err?.error?.message || 'Failed to add employee.'); }
      });
    }
  }

  openDetailModal(emp: any) { this.detailModal.set(emp); document.body.style.overflow = 'hidden'; }
  closeDetailModal() { this.detailModal.set(null); document.body.style.overflow = ''; }

  confirmDelete(emp: any) { this.deleteModal.set(emp); document.body.style.overflow = 'hidden'; }
  closeDeleteModal() { this.deleteModal.set(null); document.body.style.overflow = ''; }

  executeDelete() {
    const emp = this.deleteModal(); if (!emp) return;
    this.deletingId.set(emp.id);
    this.userService.deleteUser(emp.id).subscribe({
      next: () => {
        this.allEmployees.update(list => list.filter(e => e.id !== emp.id));
        this.deletingId.set(null);
        this.closeDeleteModal();
        this.toast.success(`${emp.userName} has been removed.`);
      },
      error: err => {
        this.deletingId.set(null);
        this.closeDeleteModal();
        this.toast.error(err?.error?.message || 'Failed to delete employee.');
      }
    });
  }

  openAssignModal(emp: any) {
    this.assignModal.set(emp);
    this.selectedManagerId = emp.managerId || '';
    this.assignError.set(null);
    document.body.style.overflow = 'hidden';
  }

  closeAssignModal() {
    this.assignModal.set(null);
    this.selectedManagerId = '';
    this.assignError.set(null);
    document.body.style.overflow = '';
  }

  executeAssign() {
    const emp = this.assignModal();
    if (!emp) return;
    if (!this.selectedManagerId) {
      this.assignError.set('Please select a manager.');
      return;
    }
    this.assignSaving.set(true);
    this.userService.assignManager(emp.id, this.selectedManagerId).subscribe({
      next: () => {
        const manager = this.allManagers().find(m => m.id == this.selectedManagerId);
        this.allEmployees.update(list =>
          list.map(e =>
            e.id === emp.id
              ? {
                ...e,
                managerId: this.selectedManagerId,
                managerName: manager?.userName || ''
              }
              : e
          )
        );
        this.assignSaving.set(false);
        this.closeAssignModal();
        this.toast.success(`Manager assigned to ${emp.userName} successfully.`);
      },
      error: err => {
        this.assignSaving.set(false);
        this.assignError.set(err?.error?.message || 'Failed to assign manager.');
      }
    });
  }

  isEmployee(emp: any): boolean {
    return String(emp.roleId) === '2' || emp.roleName?.toLowerCase() === 'employee';
  }

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