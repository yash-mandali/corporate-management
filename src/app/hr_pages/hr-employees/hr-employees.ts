import { Component, computed, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user-service/user-service';
import { AttendanceService } from '../../services/attendance-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { ToastrService } from 'ngx-toastr';

const APPROVED_SET = new Set(['approved', 'managerapproved']);
const REJECTED_SET = new Set(['rejected', 'managerrejected']);

@Component({
  selector: 'app-hr-employees',
  imports: [ReactiveFormsModule],
  templateUrl: './hr-employees.html',
  styleUrl: './hr-employees.css',
})
export class HrEmployeesPage implements OnInit {

  // ── Data ──
  allEmployees = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  allLeaves = signal<any[]>([]);
  isLoading = signal(false);
  deletingId = signal<any>(null);
  formSaving = signal(false);
  formError = signal<string | null>(null);
  detailLoading = signal(false);
  showPass = false;

  // ── Modals ──
  formModal = signal(false);
  editingEmployee = signal<any | null>(null);
  detailModal = signal<any | null>(null);
  deleteModal = signal<any | null>(null);

  // ── Filters ──
  searchQ = signal('');
  roleFilter = signal('all');
  currentPage = signal(1);
  readonly pageSize = 10;

  empForm: FormGroup;

  // ── Colors ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed stats ──
  totalCount = computed(() => this.allEmployees().length);
  empRoleCount = computed(() => this.allEmployees().filter(e => e.roleId === 2 || e.roleName?.toLowerCase() === 'employee').length);
  mgrRoleCount = computed(() => this.allEmployees().filter(e => e.roleId === 3 || e.roleName?.toLowerCase() === 'manager').length);
  activeCount = computed(() => this.totalCount());
  
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
    return this.allEmployees().filter(emp => {
      const matchQ = !q ||
        (emp.userName || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.phoneNumber || '').toLowerCase().includes(q);
      const matchR = rf === 'all'
        || (rf === '2' && (emp.roleId === 2 || emp.roleName?.toLowerCase() === 'employee'))
        || (rf === '3' && (emp.roleId === 3 || emp.roleName?.toLowerCase() === 'manager'));
      return matchQ && matchR;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEmployees().length / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedEmployees = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.filteredEmployees().slice(s, s + this.pageSize);
  });

  // ── Detail modal computed (filter from already-loaded data) ──
  detailAttendanceRate = computed(() => {
    const emp = this.detailModal();
    if (!emp) return 0;
    const now = new Date();
    const monthAtt = this.allAttendance().filter(r => {
      const d = new Date(r.date);
      return r.userId === emp.id &&
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const workdays = monthAtt.length;
    if (!workdays) return 0;
    const present = monthAtt.filter(r => r.status === 'Present').length;
    const late = monthAtt.filter(r => r.status === 'Late').length;
    return Math.round(((present + late) / workdays) * 100);
  });

  detailPresentDays = computed(() => {
    const emp = this.detailModal(); if (!emp) return 0;
    const now = new Date();
    return this.allAttendance().filter(r =>
      r.userId === emp.id && r.status === 'Present' &&
      new Date(r.date).getMonth() === now.getMonth() &&
      new Date(r.date).getFullYear() === now.getFullYear()
    ).length;
  });

  detailLateDays = computed(() => {
    const emp = this.detailModal(); if (!emp) return 0;
    const now = new Date();
    return this.allAttendance().filter(r =>
      r.userId === emp.id && r.status === 'Late' &&
      new Date(r.date).getMonth() === now.getMonth() &&
      new Date(r.date).getFullYear() === now.getFullYear()
    ).length;
  });

  detailAbsentDays = computed(() => {
    const emp = this.detailModal(); if (!emp) return 0;
    const now = new Date();
    return this.allAttendance().filter(r =>
      r.userId === emp.id && r.status === 'Absent' &&
      new Date(r.date).getMonth() === now.getMonth() &&
      new Date(r.date).getFullYear() === now.getFullYear()
    ).length;
  });

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
    private toast: ToastrService
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
    this.loadUsers();
    this.loadAttendance();
    this.loadLeaves();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userService.getAllEmployeeManager().subscribe({
      next: (res: any) => {
        this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []);
        this.isLoading.set(false);
      },
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

  // ── Add Modal ──
  openAddModal() {
    this.editingEmployee.set(null);
    this.formError.set(null);
    this.showPass = false;
    this.empForm.reset();
    // password required for add
    this.empForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.empForm.get('password')?.updateValueAndValidity();
    this.formModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  openEditModal(emp: any) {
    this.editingEmployee.set(emp);
    this.formError.set(null);
    this.showPass = false;
    // password not required for edit
    this.empForm.get('password')?.clearValidators();
    this.empForm.get('password')?.updateValueAndValidity();
    this.empForm.patchValue({
      userName: emp.userName,
      email: emp.email,
      phoneNumber: emp.phoneNumber || '',
      department: emp.department || '',
      roleId: emp.roleId?.toString() || '',
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
          this.allEmployees.update(list =>
            list.map(e => e.id === payload.id ? { ...e, ...payload } : e)
          );
          this.formSaving.set(false);
          this.closeFormModal();
          // this.toast.success('Employee updated successfully.');
        },
        error: err => {
          this.formSaving.set(false);
          this.formError.set(err?.error?.message || 'Update failed. Please try again.');
        }
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
      this.userService.signup(payload).subscribe({
        next: () => {
          this.formSaving.set(false);
          this.closeFormModal();
          this.loadUsers();
          // this.toast.success('Employee added successfully.');
        },
        error: err => {
          this.formSaving.set(false);
          this.formError.set(err?.error?.message || 'Failed to add employee. Please try again.');
        }
      });
    }
  }

  // ── Detail Modal ──
  openDetailModal(emp: any) {
    this.detailModal.set(emp);
    document.body.style.overflow = 'hidden';
  }

  closeDetailModal() {
    this.detailModal.set(null);
    document.body.style.overflow = '';
  }

  // ── Delete ──
  confirmDelete(emp: any) {
    this.deleteModal.set(emp);
    document.body.style.overflow = 'hidden';
  }

  closeDeleteModal() {
    this.deleteModal.set(null);
    document.body.style.overflow = '';
  }

  executeDelete() {
    const emp = this.deleteModal();
    if (!emp) return;
    this.deletingId.set(emp.id);
    // DELETE /api/User/DeleteUser?id=
    this.userService.deleteUser(emp.id).subscribe({
      next: () => {
        this.allEmployees.update(list => list.filter(e => e.id !== emp.id));
        this.deletingId.set(null);
        this.closeDeleteModal();
        // this.toast.success(`${emp.userName} has been removed.`);
      },
      error: err => {
        this.deletingId.set(null);
        this.closeDeleteModal();
        // this.toast.error(err?.error?.message || 'Failed to delete employee.');
      }
    });
  }

  // ── Filter helpers ──
  onSearch(val: string) { this.searchQ.set(val); this.currentPage.set(1); }
  setRoleFilter(f: string) { this.roleFilter.set(f); this.currentPage.set(1); }

  // ── Helpers ──
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getColor(id: any): string {
    return this.colorPool[(Number(id) || 0) % this.colorPool.length];
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}