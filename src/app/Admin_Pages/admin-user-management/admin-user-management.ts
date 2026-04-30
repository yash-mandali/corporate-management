import { Component, computed, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
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

const ROLE_MAP: Record<number, string> = { 1: 'Admin', 2: 'Employee', 3: 'Manager', 4: 'HR' };

@Component({
  selector: 'app-admin-user-management',
  imports: [ReactiveFormsModule, FormsModule, NgClass],
  templateUrl: './admin-user-management.html',
  styleUrl: './admin-user-management.css',
})
export class AdminUserManagement implements OnInit {

  readonly departments = DEPARTMENTS;
  allUsers = signal<any[]>([]);
  allManagers = signal<any[]>([]);
  allAttendance = signal<any[]>([]);
  allLeaves = signal<any[]>([]);
  isLoading = signal(false);
  detailLoading = signal(false);
  deletingId = signal<any>(null);
  formSaving = signal(false);
  formError = signal<string | null>(null);
  showPass = false;
  formModal = signal(false);
  editingUser = signal<any | null>(null);
  detailModal = signal<any | null>(null);
  deleteModal = signal<any | null>(null);
  assignModal = signal<any | null>(null);
  selectedManagerId: any = '';
  assignSaving = signal(false);
  assignError = signal<string | null>(null);
  searchQ = signal('');
  roleFilter = signal('all');   // all | 1 | 2 | 3 | 4
  deptFilter = signal('all');   // all | dept name
  statusFilter = signal('all');   // all | active | offline
  joinFrom = signal('');
  joinTo = signal('');
  currentPage = signal(1);
  readonly pageSize = 10;

  userForm: FormGroup;

  private colorPool = [
    '#5b2d9e', '#7c3aed', '#27ae60', '#2980b9',
    '#c0392b', '#d68910', '#16a085', '#8e44ad', '#2c3e50', '#1e8449',
  ];

  // ── Computed stats (full list) ──
  totalCount = computed(() => this.allUsers().length);
  activeCount = computed(() => this.allUsers().filter(u => u.isActive).length);
  empRoleCount = computed(() => this.allUsers().filter(u => this.matchRole(u, 2)).length);
  mgrRoleCount = computed(() => this.allUsers().filter(u => this.matchRole(u, 3)).length);
  hrRoleCount = computed(() => this.allUsers().filter(u => this.matchRole(u, 4)).length);
  adminRoleCount = computed(() => this.allUsers().filter(u => this.matchRole(u, 1)).length);

  // ── Filtered + paginated ──
  filteredUsers = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const rf = this.roleFilter();
    const dept = this.deptFilter();
    const sf = this.statusFilter();
    const from = this.joinFrom();
    const to = this.joinTo();

    return this.allUsers().filter(u => {
      if (q && !((u.userName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phoneNumber || '').toLowerCase().includes(q))) return false;

      if (rf !== 'all' && !this.matchRole(u, Number(rf))) return false;

      if (dept !== 'all' && (u.department || '').toLowerCase() !== dept.toLowerCase()) return false;

      if (sf === 'active' && !u.isActive) return false;
      if (sf === 'offline' && u.isActive) return false;

      if (from && u.createdAt && new Date(u.createdAt) < new Date(from + 'T00:00:00')) return false;
      if (to && u.createdAt && new Date(u.createdAt) > new Date(to + 'T23:59:59')) return false;

      return true;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedUsers = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(s, s + this.pageSize);
  });

  hasActiveFilters = computed(() =>
    this.roleFilter() !== 'all' || this.deptFilter() !== 'all' ||
    this.statusFilter() !== 'all' || !!this.joinFrom() || !!this.joinTo() || !!this.searchQ()
  );

  // ── Detail modal computed helpers ──
  private detailMonthAtt = computed(() => {
    const user = this.detailModal(); if (!user) return [];
    const now = new Date();
    return this.allAttendance().filter(r => {
      const d = new Date(r.date);
      return r.userId === user.id &&
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
    this.userForm = this.fb.group({
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
    this.loadAllUsers();
    this.loadManagers();
    this.loadAttendance();
    this.loadLeaves();
  }

  loadAllUsers() {
    this.isLoading.set(true);
    this.userService.getAllUser().subscribe({
      next: (res: any) => {
        this.allUsers.set(Array.isArray(res) ? res : res ? [res] : []);
        this.isLoading.set(false);
      },
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
        next: (res: any) => { this.allUsers.set(Array.isArray(res) ? res : res ? [res] : []); this.isLoading.set(false); },
        error: err => { console.error(err); this.isLoading.set(false); }
      });
    } else {
      this.loadAllUsers();
    }
  }

  clearAllFilters() {
    this.searchQ.set('');
    this.roleFilter.set('all');
    this.statusFilter.set('all');
    this.joinFrom.set('');
    this.joinTo.set('');
    this.currentPage.set(1);
    if (this.deptFilter() !== 'all') { this.deptFilter.set('all'); this.loadAllUsers(); }
  }

  onSearch(val: string) { this.searchQ.set(val); this.currentPage.set(1); }
  setRoleFilter(f: string) { this.roleFilter.set(f); this.currentPage.set(1); }
  setStatusFilter(f: string) { this.statusFilter.set(f); this.currentPage.set(1); }
  onJoinFrom(val: string) { this.joinFrom.set(val); this.currentPage.set(1); }
  onJoinTo(val: string) { this.joinTo.set(val); this.currentPage.set(1); }

  // ── Add / Edit modals ──

  openAddModal() {
    this.editingUser.set(null);
    this.formError.set(null);
    this.showPass = false;
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.formModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  openEditModal(user: any) {
    this.editingUser.set(user);
    this.formError.set(null);
    this.showPass = false;
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.patchValue({
      userName: user.userName,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      department: user.department || '',
      roleId: String(user.roleId || ''),
      gender: user.gender || '',
      address: user.address || '',
    });
    this.formModal.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeFormModal() {
    this.formModal.set(false);
    this.editingUser.set(null);
    this.formError.set(null);
    this.userForm.reset();
    document.body.style.overflow = '';
  }

  saveUser() {
    this.formError.set(null);
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.formError.set('Please fill all required fields.');
      return;
    }

    const v = this.userForm.value;
    this.formSaving.set(true);

    if (this.editingUser()) {
      // PUT /api/User/UpdateUser — admin can change role
      const payload = {
        id: this.editingUser().id,
        userName: v.userName,
        email: v.email,
        phoneNumber: v.phoneNumber || '',
        department: v.department || '',
        roleId: Number(v.roleId),
        gender: v.gender || '',
        address: v.address || '',
      };
      this.userService.updateUser(payload).subscribe({
        next: () => {
          // Merge roleName from map
          const roleName = ROLE_MAP[payload.roleId] || payload.roleId;
          this.allUsers.update(list =>
            list.map(u => u.id === payload.id ? { ...u, ...payload, roleName } : u)
          );
          this.formSaving.set(false);
          this.closeFormModal();
          this.toast.success('User updated successfully.');
        },
        error: err => {
          this.formSaving.set(false);
          this.formError.set(err?.error?.message || 'Update failed.');
        }
      });
    } else {
      // POST /api/User/HrAdminAddUser — admin can create any role
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
          this.loadAllUsers();
          this.toast.success('User added successfully.');
        },
        error: err => {
          this.formSaving.set(false);
          this.formError.set(err?.error?.message || 'Failed to add user.');
        }
      });
    }
  }

  // ── Detail modal ──
  openDetailModal(user: any) { this.detailModal.set(user); document.body.style.overflow = 'hidden'; }
  closeDetailModal() { this.detailModal.set(null); document.body.style.overflow = ''; }

  // ── Delete modal ──
  confirmDelete(user: any) { this.deleteModal.set(user); document.body.style.overflow = 'hidden'; }
  closeDeleteModal() { this.deleteModal.set(null); document.body.style.overflow = ''; }

  executeDelete() {
    const user = this.deleteModal(); if (!user) return;
    this.deletingId.set(user.id);
    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.allUsers.update(list => list.filter(u => u.id !== user.id));
        this.deletingId.set(null);
        this.closeDeleteModal();
        this.toast.success(`${user.userName} has been removed.`);
      },
      error: err => {
        this.deletingId.set(null);
        this.closeDeleteModal();
        this.toast.error(err?.error?.message || 'Failed to delete user.');
      }
    });
  }

  // ── Assign Manager modal ──
  openAssignModal(user: any) {
    this.assignModal.set(user);
    this.selectedManagerId = user.managerId || '';
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
    const user = this.assignModal();
    if (!user) return;
    if (!this.selectedManagerId) {
      this.assignError.set('Please select a manager.');
      return;
    }

    this.assignSaving.set(true);
    this.userService.assignManager(user.id, this.selectedManagerId).subscribe({
      next: () => {
        const manager = this.allManagers().find(m => m.id == this.selectedManagerId);
        this.allUsers.update(list =>
          list.map(u =>
            u.id === user.id
              ? {
                ...u,
                managerId: this.selectedManagerId,
                managerName: manager?.userName || ''
              }
              : u
          )
        );
        this.assignSaving.set(false);
        this.closeAssignModal();
        this.toast.success(`Manager assigned to ${user.userName} successfully.`);
      },
      error: err => {
        this.assignSaving.set(false);
        this.assignError.set(err?.error?.message || 'Failed to assign manager.');
      }
    });
  }

  matchRole(user: any, roleId: number): boolean {
    if (Number(user.roleId) === roleId) return true;
    const name = (user.roleName || '').toLowerCase();
    const map: Record<number, string[]> = {
      1: ['admin'],
      2: ['employee'],
      3: ['manager'],
      4: ['hr', 'human resources'],
    };
    return (map[roleId] || []).some(n => name.includes(n));
  }

  isEmployee(user: any): boolean {
    return this.matchRole(user, 2);
  }

  getRoleClass(user: any): string {
    if (this.matchRole(user, 1)) return 'admin';
    if (this.matchRole(user, 3)) return 'manager';
    if (this.matchRole(user, 4)) return 'hr';
    return 'employee'; // default / role 2
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