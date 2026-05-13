import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../services/leave-service/leave-service';
import { UserService } from '../../services/user-service/user-service';
import { ToastService } from '../../services/toast-service/toast';

const APPROVED_SET = new Set(['approved']);
const REJECTED_SET = new Set(['rejected', 'managerrejected']);

@Component({
  selector: 'app-admin-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-leave-management.html',
  styleUrl: './admin-leave-management.css',
})
export class AdminLeaveManagement implements OnInit {
  // ── State ──
  allLeaves = signal<any[]>([]);
  allEmployees = signal<any[]>([]);
  employeeLeaveBalances = signal<Map<number, any[]>>(new Map());

  isLoading = signal(true);
  balanceLoading = signal(false);
  isActionLoading = signal(false);

  // ── Tabs ──
  activeTab = signal<'requests' | 'balance' | 'settings'>('requests');

  // ── Filters ──
  activeFilter = signal<string>('all');
  searchQuery = signal('');
  balanceSearch = signal('');
  histPage = signal(1);
  readonly pageSize = 10;

  // ── Modals ──
  selectedLeave = signal<any>(null);
  showDetailModal = signal(false);
  showConfirmModal = signal(false);
  confirmAction = signal<'approve' | 'reject' | null>(null);

  // ── Balance modal ──
  selectedEmployeeBalance = signal<any>(null);
  showBalanceModal = signal(false);

  // ── Settings – Leave Types ──
  leaveTypes = signal<any[]>([]);
  leaveTypesLoading = signal(false);
  isSettingsLoading = signal(false);

  // Add form
  newLeaveTypeName = '';
  newLeaveTypeBalance: number | null = null;

  // Edit inline
  editingLeaveTypeId = signal<number | null>(null);
  editingBalance: number | null = null;

  // Delete confirm
  selectedLeaveType = signal<any>(null);
  showDeleteLeaveTypeModal = signal(false);

  // ── Toast ──
  toastMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Color pool ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'managerapproved', label: 'Mgr Approved' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'managerrejected', label: 'Mgr Rejected' },
    { key: 'withdrawn', label: 'Withdrawn' },
  ];

  // ── Computed counts ──
  counts = computed(() => {
    const leaves = this.allLeaves();
    return {
      all: leaves.length,
      pending: leaves.filter(l => l.status?.toLowerCase() === 'pending').length,
      managerapproved: leaves.filter(l => l.status?.toLowerCase() === 'managerapproved').length,
      approved: leaves.filter(l => l.status?.toLowerCase() === 'approved').length,
      rejected: leaves.filter(l => l.status?.toLowerCase() === 'rejected').length,
      managerrejected: leaves.filter(l => l.status?.toLowerCase() === 'managerrejected').length,
      withdrawn: leaves.filter(l => l.status?.toLowerCase() === 'withdrawn').length,
    };
  });

  // ── Filtered + paginated history ──
  filteredLeaves = computed(() => {
    let leaves = this.allLeaves();
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();

    if (filter !== 'all') {
      leaves = leaves.filter(l => l.status?.toLowerCase() === filter);
    }

    if (query) {
      leaves = leaves.filter(l =>
        l.userName?.toLowerCase().includes(query) ||
        l.requestType?.toLowerCase().includes(query) ||
        l.reason?.toLowerCase().includes(query)
      );
    }

    return leaves.sort((a, b) =>
      new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime()
    );
  });

  histTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredLeaves().length / this.pageSize)));
  histPageNums = computed(() => Array.from({ length: this.histTotalPages() }, (_, i) => i + 1));
  pagedLeaves = computed(() => {
    const s = (this.histPage() - 1) * this.pageSize;
    return this.filteredLeaves().slice(s, s + this.pageSize);
  });

  // ── Filtered balances ──
  filteredBalances = computed(() => {
    const q = this.balanceSearch().toLowerCase().trim();
    const balancesMap = this.employeeLeaveBalances();

    return this.allEmployees()
      .filter(u => !q || (u.userName || '').toLowerCase().includes(q))
      .map(u => {
        const balances = balancesMap.get(u.id) ?? [];
        const totalAllocated = balances.reduce((s: number, b: any) => s + (b.totalLeaveBalance || 0), 0);
        const totalUsed = balances.reduce((s: number, b: any) => s + (b.usedLeaveBalance || 0), 0);
        const totalRemaining = balances.reduce((s: number, b: any) => s + (b.remainingLeaveBalance || 0), 0);
        const balanceYear = balances.length ? balances[0].balance_year : null;
        return {
          userId: u.id,
          userName: u.userName,
          roleName: u.roleName,
          email: u.email,
          phone: u.phone,
          department: u.department,
          balances,
          totalAllocated,
          totalUsed,
          totalRemaining,
          balanceYear,
        };
      });
  });

  constructor(
    private leaveService: LeaveService,
    private userService: UserService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.loadAllLeaves();
    this.loadAllEmployees();
    this.loadLeaveTypes();
    this.runAutoReject();   // ← runs automatically on page load
  }

  // ── Auto-reject on load ──
  runAutoReject() {
    this.leaveService.autorejectLeave().subscribe({
      next: () => {
        // silent — no toast spam on load
        this.loadAllLeaves();
      },
      error: (err) => console.error('Auto reject failed:', err),
    });
  }

  loadAllLeaves() {
    this.isLoading.set(true);
    this.leaveService.getAllLeaves().subscribe({
      next: (data) => {
        this.allLeaves.set(data || []);
        // console.log("loadallleaves called:", data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load leave data.')
      },
    });
  }

  loadAllEmployees() {
    this.userService.getAllEmployeeManagerHr().subscribe({
      next: (res: any) => {
        this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []);
        this.loadAllEmployeeBalances();
      },
      error: err => console.error('loadAllEmployees:', err)
    });
  }

  loadAllEmployeeBalances() {
    const employees = this.allEmployees();
    if (!employees.length) return;

    this.balanceLoading.set(true);
    const map = new Map<number, any[]>();
    let completed = 0;

    employees.forEach(u => {
      this.leaveService.getUserLeaveBalance(u.id).subscribe({
        next: (res: any) => {
          map.set(u.id, Array.isArray(res) ? res : res ? [res] : []);
          completed++;
          if (completed === employees.length) {
            this.employeeLeaveBalances.set(new Map(map));
            this.balanceLoading.set(false);
          }
        },
        error: () => {
          map.set(u.id, []);
          completed++;
          if (completed === employees.length) {
            this.employeeLeaveBalances.set(new Map(map));
            this.balanceLoading.set(false);
          }
        }
      });
    });
  }

  // ── Filters ──
  setFilter(filter: string) {
    this.activeFilter.set(filter);
    this.histPage.set(1);
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.histPage.set(1);
  }

  openDetail(leave: any) {
    this.selectedLeave.set(leave);
    console.log("opendetail called:: ", this.selectedLeave());
    this.showDetailModal.set(true);
  }

  closeDetail() {
    this.showDetailModal.set(false);
    this.selectedLeave.set(null);
  }

  triggerAction(action: 'approve' | 'reject') {
    this.confirmAction.set(action);
    this.showConfirmModal.set(true);
  }

  cancelConfirm() {
    this.showConfirmModal.set(false);
    this.confirmAction.set(null);
  }

  confirmActionExecute() {
    const leave = this.selectedLeave();
    console.log("conformactionexecute called:: ", leave);

    const action = this.confirmAction();
    if (!leave || !action) return;

    this.isActionLoading.set(true);

    const request$ =
      action === 'approve'
        ? this.leaveService.HrApproveleave(leave.leaveRequestId)
        : this.leaveService.HrRejectleave(leave.leaveRequestId);

    request$.subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.showConfirmModal.set(false);
        this.showDetailModal.set(false);
        this.confirmAction.set(null);
        this.selectedLeave.set(null);
        this.toast.success(action === 'approve' ? 'Leave approved successfully.' : 'Leave rejected successfully.');
        this.loadAllLeaves();
      },
      error: () => {
        this.isActionLoading.set(false);
        this.toast.error('Action failed. Please try again.');
      },
    });
  }

  // ── Balance Detail Modal ──
  openBalanceDetail(emp: any) {
    this.selectedEmployeeBalance.set(emp);
    this.showBalanceModal.set(true);
  }

  closeBalanceDetail() {
    this.showBalanceModal.set(false);
    this.selectedEmployeeBalance.set(null);
  }

  // ── Get user's leave history (for balance modal) ──
  getUserLeaveHistory(userId: number) {
    return this.allLeaves()
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime())
      .slice(0, 5);
  }

  getUserLeaveStats(userId: number) {
    const userLeaves = this.allLeaves().filter(l => l.userId === userId);
    return {
      total: userLeaves.length,
      approved: userLeaves.filter(l => APPROVED_SET.has(l.status?.toLowerCase())).length,
      pending: userLeaves.filter(l => ['pending', 'managerapproved'].includes(l.status?.toLowerCase())).length,
      rejected: userLeaves.filter(l => REJECTED_SET.has(l.status?.toLowerCase())).length,
    };
  }

  // ── Helpers ──
  canHrAct(leave: any): boolean {
    return leave?.status?.toLowerCase() === 'managerapproved';
  }

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

  formatDateFull(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatDateRelative(dateStr: string): string {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return this.formatDate(dateStr);
  }

  // ── Type / status helpers ──
  typeClass(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('annual')) return 'type-annual';
    if (t.includes('sick')) return 'type-sick';
    if (t.includes('comp')) return 'type-comp';
    if (t.includes('emergency')) return 'type-emergency';
    return 'type-annual';
  }

  getLeaveTypeName(typeId: number): string {
    switch (typeId) {
      case 1: return 'Annual';
      case 2: return 'Sick';
      case 3: return 'Comp Off';
      case 4: return 'Emergency';
      default: return 'Leave';
    }
  }

  leaveTypeClass(typeId: number): string {
    switch (typeId) {
      case 1: return 'annual';
      case 2: return 'sick';
      case 3: return 'comp';
      case 4: return 'emergency';
      default: return 'annual';
    }
  }

  getStatusKey(status: string): string {
    return (status || '').toLowerCase();
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      managerapproved: 'Mgr Approved',
      managerrejected: 'Mgr Rejected',
      approved: 'Approved',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    };
    return map[status?.toLowerCase()] || status;
  }

  // ── Settings – Leave Type CRUD ──

  loadLeaveTypes() {
    this.leaveTypesLoading.set(true);
    this.leaveService.getLeaveTypes().subscribe({
      next: (res: any) => {
        this.leaveTypes.set(
          Array.isArray(res.data) ? res.data : []
        );
        // console.log('Loaded leave types:', this.leaveTypes());
        this.leaveTypesLoading.set(false);
      },
      error: () => {
        this.leaveTypesLoading.set(false);
        this.toast.error('Failed to load leave types.');
      }
    });
  }

  addLeaveType() {
    const name = this.newLeaveTypeName.trim();
    const balance = this.newLeaveTypeBalance;
    if (!name) {
      this.toast.error('Please enter a leave type name.');
      return;
    }
    if (balance === null || balance < 0) {
      this.toast.error('Please enter a valid default balance.');
      return;
    }

    this.isSettingsLoading.set(true);
    this.leaveService.addLeaveType(name, parseFloat(balance.toString())).subscribe({
      next: () => {
        this.isSettingsLoading.set(false);
        this.newLeaveTypeName = '';
        this.newLeaveTypeBalance = null;
        this.toast.success(`Leave type "${name}" added successfully.`);
        this.loadLeaveTypes();
      },
      error: () => {
        this.isSettingsLoading.set(false);
        this.toast.error('Failed to add leave type.');
      }
    });
  }

  startEditLeaveType(lt: any) {
    this.editingLeaveTypeId.set(lt.leavetype_Id);
    this.editingBalance = lt.default_balance;
  }

  cancelEditLeaveType() {
    this.editingLeaveTypeId.set(null);
    this.editingBalance = null;
  }

  saveLeaveTypeBalance(leaveTypeId: number) {
    if (this.editingBalance === null || this.editingBalance < 0) {
      this.toast.error('Please enter a valid balance.');
      return;
    }
    this.isSettingsLoading.set(true);
    this.leaveService.updateLeaveBalance(leaveTypeId, this.editingBalance).subscribe({
      next: () => {
        this.isSettingsLoading.set(false);
        this.editingLeaveTypeId.set(null);
        this.editingBalance = null;
        this.toast.success('Leave balance updated successfully.');
        this.loadLeaveTypes();
      },
      error: () => {
        this.isSettingsLoading.set(false);
        this.toast.error('Failed to update balance.');
      }
    });
  }

  openDeleteLeaveTypeConfirm(lt: any) {
    this.selectedLeaveType.set(lt);
    this.showDeleteLeaveTypeModal.set(true);
  }

  cancelDeleteLeaveType() {
    this.showDeleteLeaveTypeModal.set(false);
    this.selectedLeaveType.set(null);
  }

  confirmDeleteLeaveType() {
    const lt = this.selectedLeaveType();
    if (!lt) return;
    this.isSettingsLoading.set(true);
    this.leaveService.deleteLeaveType(lt.leavetype_Id).subscribe({
      next: () => {
        this.isSettingsLoading.set(false);
        this.showDeleteLeaveTypeModal.set(false);
        this.selectedLeaveType.set(null);
        this.toast.success(`"${lt.leaveType}" deleted successfully.`);
        this.loadLeaveTypes();
      },
      error: () => {
        this.isSettingsLoading.set(false);
        this.toast.error('Failed to delete leave type.');
      }
    });
  }

  barPct(used: number, total: number): number {
    if (!total) return 0;
    return Math.min(100, Math.round(((used || 0) / total) * 100));
  }
}