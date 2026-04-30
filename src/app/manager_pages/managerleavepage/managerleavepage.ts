import { Component, computed, signal, OnInit } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { ToastService } from '../../services/toast-service/toast';

// Manager statuses: Pending | ManagerApproved | ManagerRejected | Withdrawn
const APPROVED_SET = new Set(['approved', 'managerapproved']);
const REJECTED_SET = new Set(['rejected', 'managerrejected']);

@Component({
  selector: 'app-manager-leave',
  imports: [LowerCasePipe],
  templateUrl: './managerleavepage.html',
  styleUrl: './managerleavepage.css',
})
export class ManagerLeavepage implements OnInit {

  managerId = signal<any>(null);

  // ── State ──
  allLeaves = signal<any[]>([]);
  ManagerTeam = signal<any[]>([]);
  leaveLoading = signal(false);
  actionLoading = signal<any>(null);

  // ── Balance state ──
  employeeLeaveBalances = signal<Map<number, any[]>>(new Map());
  balanceLoading = signal(false);

  // ── Tab ──
  activeTab = signal<'approvals' | 'history' | 'balance'>('approvals');

  // ── Filters ──
  searchQ = signal('');
  histFilter = signal('all');
  histPage = signal(1);
  balanceSearch = signal('');
  readonly pageSize = 10;

  // ── Colors ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed stats ──
  pendingCount = computed(() => this.allLeaves().filter(l => l.status?.toLowerCase() === 'pending').length);
  approvedCount = computed(() => this.allLeaves().filter(l => APPROVED_SET.has(l.status?.toLowerCase())).length);
  rejectedCount = computed(() => this.allLeaves().filter(l => REJECTED_SET.has(l.status?.toLowerCase())).length);
  withdrawnCount = computed(() => this.allLeaves().filter(l => l.status?.toLowerCase() === 'withdrawn').length);

  // ── Pending leaves for approvals tab ──
  pendingLeaves = computed(() =>
    this.allLeaves()
      .filter(l => l.status?.toLowerCase() === 'pending')
      .sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime())
  );

  // ── History tab ──
  filteredHistory = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const sf = this.histFilter();
    return this.allLeaves()
      .filter(l => {
        const matchQ = !q || (l.userName || '').toLowerCase().includes(q) || (l.requestType || '').toLowerCase().includes(q);
        const ls = l.status?.toLowerCase() ?? '';
        const matchSt = sf === 'all'
          || (sf === 'Approved' && APPROVED_SET.has(ls))
          || (sf === 'Rejected' && REJECTED_SET.has(ls))
          || ls === sf.toLowerCase();
        return matchQ && matchSt;
      })
      .sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime());
  });

  histTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredHistory().length / this.pageSize)));
  histPageNums = computed(() => Array.from({ length: this.histTotalPages() }, (_, i) => i + 1));
  pagedHistory = computed(() => {
    const s = (this.histPage() - 1) * this.pageSize;
    return this.filteredHistory().slice(s, s + this.pageSize);
  });

  // ── Balance tab: real API data per employee ──
  filteredBalances = computed(() => {
    const q = this.balanceSearch().toLowerCase().trim();
    const balancesMap = this.employeeLeaveBalances();

    return this.ManagerTeam()
      .filter(u => !q || (u.userName || '').toLowerCase().includes(q))
      .map(u => {
        const balances = balancesMap.get(u.id) ?? [];
        const totalRemaining = balances.reduce((sum: number, b: any) => sum + (b.remainingLeaveBalance || 0), 0);
        const totalUsed = balances.reduce((sum: number, b: any) => sum + (b.usedLeaveBalance || 0), 0);
        const balanceYear = balances.length ? balances[0].balance_year : null;
        return {
          userId: u.id,
          userName: u.userName,
          roleName: u.roleName,
          balances,
          totalRemaining,
          totalUsed,
          balanceYear,
        };
      });
  });

  constructor(
    private auth: Authservice,
    private userService: UserService,
    private leaveService: LeaveService,
    private toast: ToastService
  ) { }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) {
      this.managerId.set(id);
      this.loadManagerTeam();
      this.loadAllLeaves();
    }
  }

  loadManagerTeam() {
    this.userService.getManagerTeam(this.managerId()).subscribe({
      next: (res: any) => {
        this.ManagerTeam.set(Array.isArray(res) ? res : res ? [res] : []);
        this.loadTeamLeaveBalances();
      },
      error: err => console.error('ManagerTeam:', err)
    });
  }

  loadAllLeaves() {
    this.leaveLoading.set(true);
    this.leaveService.getTeamAllleaves(this.managerId()).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? (res ? [res] : []);
        this.allLeaves.set(list);
        this.leaveLoading.set(false);
      },
      error: err => { console.error('loadAllLeaves:', err); this.leaveLoading.set(false); }
    });
  }

  // ── Load real leave balances for every team member ──
  loadTeamLeaveBalances() {
    const team = this.ManagerTeam();
    if (!team.length) return;

    this.balanceLoading.set(true);
    const map = new Map<number, any[]>();
    let completed = 0;

    team.forEach(u => {
      this.leaveService.getUserLeaveBalance(u.id).subscribe({
        next: (res: any) => {
          map.set(u.id, Array.isArray(res) ? res : res ? [res] : []);
          completed++;
          if (completed === team.length) {
            this.employeeLeaveBalances.set(new Map(map));
            this.balanceLoading.set(false);
          }
        },
        error: () => {
          map.set(u.id, []);
          completed++;
          if (completed === team.length) {
            this.employeeLeaveBalances.set(new Map(map));
            this.balanceLoading.set(false);
          }
        }
      });
    });
  }

  // ── Actions ──
  approveLeave(leaveRequestId: any) {
    this.actionLoading.set(leaveRequestId);
    this.leaveService.managerApproveleave(leaveRequestId).subscribe({
      next: () => {
        this.allLeaves.update(list =>
          list.map(l => l.leaveRequestId === leaveRequestId ? { ...l, status: 'Approved' } : l)
        );
        this.actionLoading.set(null);
        this.toast.success('Leave approved successfully.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to approve leave.');
        this.actionLoading.set(null);
      }
    });
  }

  rejectLeave(leaveRequestId: any) {
    this.actionLoading.set(leaveRequestId);
    this.leaveService.managerRejectleave(leaveRequestId).subscribe({
      next: () => {
        this.allLeaves.update(list =>
          list.map(l => l.leaveRequestId === leaveRequestId ? { ...l, status: 'Rejected' } : l)
        );
        this.actionLoading.set(null);
        this.toast.success('Leave rejected.');
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Failed to reject leave.');
        this.actionLoading.set(null);
      }
    });
  }

  // ── Filter helpers ──
  onSearch(val: string) {
    this.searchQ.set(val);
    this.histPage.set(1);
  }

  setHistFilter(f: string) {
    this.histFilter.set(f);
    this.histPage.set(1);
  }

  // ── Leave type helpers ──
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

  // ── Leave type class for chips ──
  typeClass(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('annual')) return 'type-annual';
    if (t.includes('sick')) return 'type-sick';
    if (t.includes('comp')) return 'type-comp';
    if (t.includes('emergency')) return 'type-emergency';
    return 'type-annual';
  }

  // ── Bar pct for balance ──
  barPct(used: number, total: number): number {
    if (!total) return 0;
    return Math.min(100, Math.round(((used || 0) / total) * 100));
  }

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

  formatDateFull(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
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
}