import { Component, computed, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../services/toast-service/toast';

const APPROVED_SET = new Set(['approved', 'managerapproved']);
const REJECTED_SET = new Set(['rejected', 'managerrejected']);

const DEPARTMENTS = [
  'Human Resources (HR)', 'IT / Engineering', 'Software Development',
  'Quality Assurance (QA)', 'DevOps', 'UI/UX Design', 'Sales',
  'Marketing', 'Customer Support', 'Finance & Accounts', 'Administration',
];

@Component({
  selector: 'app-hr-employees',
  imports: [ReactiveFormsModule],
  templateUrl: './hr-employees.html',
  styleUrl: './hr-employees.css',
})
export class HrEmployeesPage implements OnInit {

  readonly departments = DEPARTMENTS;
  detailLoading = signal(false);
  // ── Data ──
  allEmployees = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  allLeaves = signal<any[]>([]);
  isLoading = signal(false);
  deletingId = signal<any>(null);
  formSaving = signal(false);
  formError = signal<string | null>(null);
  showPass = false;

  // ── Modals ──
  formModal = signal(false);
  editingEmployee = signal<any | null>(null);
  detailModal = signal<any | null>(null);
  deleteModal = signal<any | null>(null);

  // ── Filters ──
  searchQ = signal('');
  roleFilter = signal('all');        // all | 2 | 3
  deptFilter = signal('all');        // all | dept name
  statusFilter = signal('all');        // all | active | offline
  joinFrom = signal('');           // YYYY-MM-DD
  joinTo = signal('');           // YYYY-MM-DD
  currentPage = signal(1);
  readonly pageSize = 10;

  empForm: FormGroup;

  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed stats (from full list, not filtered) ──
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

  // ── Filtered + paginated ──
  filteredEmployees = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const rf = this.roleFilter();
    const dept = this.deptFilter();
    const sf = this.statusFilter();
    const from = this.joinFrom();
    const to = this.joinTo();

    return this.allEmployees().filter(emp => {
      // Search
      if (q && !(
        (emp.userName || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.phoneNumber || '').toLowerCase().includes(q)
      )) return false;

      // Role
      if (rf === '2' && !(String(emp.roleId) === '2' || emp.roleName?.toLowerCase() === 'employee')) return false;
      if (rf === '3' && !(String(emp.roleId) === '3' || emp.roleName?.toLowerCase() === 'manager')) return false;

      // Department
      if (dept !== 'all' && (emp.department || '').toLowerCase() !== dept.toLowerCase()) return false;

      // Status
      if (sf === 'active' && !emp.isActive) return false;
      if (sf === 'offline' && emp.isActive) return false;

      // Join date range
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

  // ── Detail modal computed ──
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
    const att = this.detailMonthAtt(); if (!att.length) return 0;
    const present = att.filter(r => r.status === 'Present').length;
    const late = att.filter(r => r.status === 'Late').length;
    return Math.round(((present + late) / att.length) * 100);
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

  // ── Department filter — uses API when a dept is selected ──
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
      this.loadEmployeesManagers(); // reload full list
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

  // ── Add / Edit modals ──
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
      // PUT /api/User/UpdateUser
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
      // POST /api/User/AddUser
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
        next: () => { this.formSaving.set(false); this.closeFormModal(); this.loadEmployeesManagers(); this.toast.success('Employee added successfully.'); },
        error: err => { this.formSaving.set(false); this.formError.set(err?.error?.message || 'Failed to add employee.'); }
      });
    }
  }

  // ── Detail modal ──
  openDetailModal(emp: any) { this.detailModal.set(emp); document.body.style.overflow = 'hidden'; }
  closeDetailModal() { this.detailModal.set(null); document.body.style.overflow = ''; }

  // ── Delete modal ──
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

  // ── Helpers ──
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