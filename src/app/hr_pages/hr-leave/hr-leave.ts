import { Component, computed, signal, OnInit } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { UserService } from '../../services/user-service/user-service';
import { LeaveService } from '../../services/leave-service/leave-service';
import { ToastrService } from 'ngx-toastr';

// Manager statuses: Pending | ManagerApproved | ManagerRejected | Withdrawn
const APPROVED_SET = new Set(['approved', 'managerapproved']);
const REJECTED_SET = new Set(['rejected', 'managerrejected']);

@Component({
  selector: 'app-hr-leave',
  imports: [LowerCasePipe],
  templateUrl: './hr-leave.html',
  styleUrl: './hr-leave.css',
})
export class HrLeavePage implements OnInit {

  // ── State ──
  allLeaves = signal<any[]>([]);
  allEmployees = signal<any[]>([]);
  leaveLoading = signal(false);
  actionLoading = signal<any>(null);

  // ── Tab ──
  activeTab = signal<'approvals' | 'history' | 'balance'>('approvals');

  // ── Filters ──
  searchQ = signal('');
  histFilter = signal('all');
  histPage = signal(1);
  balanceSearch = signal('');
  readonly pageSize = 10;

  // ── Leave types config ──
  leaveTypes = [
    { key: 'annual', label: 'Annual', max: 15 },
    { key: 'sick', label: 'Sick', max: 6 },
    { key: 'comp', label: 'Comp Off', max: 2 },
    { key: 'emergency', label: 'Emergency', max: 2 },
  ];

  // ── Colors ──
  private colorPool = [
    '#09637e', '#088395', '#27ae60', '#2980b9',
    '#8e44ad', '#d68910', '#c0392b', '#16a085', '#2c3e50', '#1e8449',
  ];

  // ── Computed stats ──
  managerapprovedCount = computed(() => this.allLeaves().filter(l => l.status?.toLowerCase() === 'managerapproved').length);
  pendingCount = computed(() => this.allLeaves().filter(l => l.status?.toLowerCase() === 'pending').length);
  approvedCount = computed(() => this.allLeaves().filter(l => APPROVED_SET.has(l.status?.toLowerCase())).length);
  rejectedCount = computed(() => this.allLeaves().filter(l => REJECTED_SET.has(l.status?.toLowerCase())).length);
  withdrawnCount = computed(() => this.allLeaves().filter(l => l.status?.toLowerCase() === 'withdrawn').length);

  // ── Pending leaves for approvals tab ──
  pendingLeaves = computed(() =>
    this.allLeaves()
      .filter(l => l.status?.toLowerCase() === 'managerapproved')
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

  // ── Balance tab: approved days per employee per leave type ──
  employeeBalances = computed(() => {
    const approved = this.allLeaves().filter(l => APPROVED_SET.has(l.status?.toLowerCase()));
    return this.allEmployees().map(u => {
      const userLeaves = approved.filter(l => l.userId === u.id);
      const breakdown: Record<string, number> = { annual: 0, sick: 0, comp: 0, emergency: 0 };
      userLeaves.forEach(l => {
        const t = (l.requestType || '').toLowerCase();
        if (t.includes('annual')) breakdown['annual'] += l.totalDays || 0;
        else if (t.includes('sick')) breakdown['sick'] += l.totalDays || 0;
        else if (t.includes('comp')) breakdown['comp'] += l.totalDays || 0;
        else if (t.includes('emer')) breakdown['emergency'] += l.totalDays || 0;
      });
      const totalApproved = Object.values(breakdown).reduce((a, b) => a + b, 0);
      return { userId: u.id, userName: u.userName, roleName: u.roleName, breakdown, totalApproved };
    });
  });

  filteredBalances = computed(() => {
    const q = this.balanceSearch().toLowerCase().trim();
    return this.employeeBalances().filter(e =>
      !q || e.userName.toLowerCase().includes(q)
    );
  });

  constructor(
    private userService: UserService,
    private leaveService: LeaveService,
    private toast: ToastrService
  ) { }

  ngOnInit() {
    this.loadAllEmployees();
    this.loadManagerApprovedLeaves();
  }

  loadAllEmployees() {
    this.userService.getAllEmployee().subscribe({
      next: (res: any) => this.allEmployees.set(Array.isArray(res) ? res : res ? [res] : []),
      error: err => console.error('loadAllEmployees:', err)
    });
  }

  loadManagerApprovedLeaves() {
    this.leaveLoading.set(true);
    this.leaveService.getAllLeaves().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? (res ? [res] : []);
        this.allLeaves.set(list);
        this.leaveLoading.set(false);
      },
      error: err => { console.error('loadManagerApprovedLeaves:', err); this.leaveLoading.set(false); }
    });
  }

  // ── Actions ──
  approveLeave(leaveRequestId: any) {
    this.actionLoading.set(leaveRequestId);
    this.leaveService.HrApproveleave(leaveRequestId).subscribe({
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
    this.leaveService.HrRejectleave(leaveRequestId).subscribe({
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

  // ── Leave type class ──
  typeClass(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('annual')) return 'type-annual';
    if (t.includes('sick')) return 'type-sick';
    if (t.includes('comp')) return 'type-comp';
    if (t.includes('emergency')) return 'type-emergency';
    return 'type-annual';
  }

  // ── Bar pct for balance ──
  barPct(used: number, max: number): number {
    return Math.min(100, Math.round(((used || 0) / max) * 100));
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