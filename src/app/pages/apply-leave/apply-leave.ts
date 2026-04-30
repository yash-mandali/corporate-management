import { Component, computed, signal } from '@angular/core';
import { LeaveService } from '../../services/leave-service/leave-service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Authservice } from '../../services/Auth-service/authservice';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ToastService } from '../../services/toast-service/toast';
import { SlicePipe, NgForOf } from '@angular/common';

// Six statuses from backend
// pending | approved | managerapproved | rejected | managerrejected | withdrawn
// Filter tabs:  all | pending | approved (=approved+managerapproved) | rejected (=rejected+managerrejected) | withdrawn

const APPROVED_SET = new Set(['approved', 'managerapproved']);
const REJECTED_SET = new Set(['rejected', 'managerrejected']);

@Component({
  selector: 'app-apply-leave',
  imports: [RouterLink, ReactiveFormsModule, SlicePipe, NgForOf],
  templateUrl: './apply-leave.html',
  styleUrl: './apply-leave.css',
})
export class ApplyLeave {

  Id = signal<any>(null);
  myLeaves = signal<any[]>([]);
  deletingId = signal<number | null>(null);
  isLoading = false;
  leaveBalances = signal<any[]>([]);

  // ── Edit Modal ──
  editModalOpen = signal(false);
  leaveId = signal<any>(null);
  editForm!: FormGroup;
  isSubmitting = false;

  // ── Filter + Pagination ──
  activeFilter = signal<string>('all');
  currentPage = signal<number>(1);
  readonly pageSize = 5;

  // ── Computed counts — single source of truth ──
  private statusCount = (statuses: Set<string>) =>
    computed(() => this.myLeaves().filter(l => statuses.has(l.status?.toLowerCase())).length);

  totalRequests = computed(() => this.myLeaves().length);
  pendingleaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'pending').length);
  approvedleaves = computed(() => this.myLeaves().filter(l => APPROVED_SET.has(l.status?.toLowerCase())).length);
  rejectedleaves = computed(() => this.myLeaves().filter(l => REJECTED_SET.has(l.status?.toLowerCase())).length);
  withdrawnleaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'withdrawn').length);

  // ── Filter map — each tab knows which statuses to match ──
  private readonly filterMap: Record<string, (s: string) => boolean> = {
    all: () => true,
    pending: (s) => s === 'pending',
    approved: (s) => APPROVED_SET.has(s),
    rejected: (s) => REJECTED_SET.has(s),
    withdrawn: (s) => s === 'withdrawn',
  };

  filteredLeaves = computed(() => {
    const match = this.filterMap[this.activeFilter()];
    return this.myLeaves()
      .filter(l => match(l.status?.toLowerCase() ?? ''))
      .sort((a, b) => new Date(b.appliedOn || 0).getTime() - new Date(a.appliedOn || 0).getTime());
  });

  totalPages = computed(() => Math.max(0, Math.ceil(this.filteredLeaves().length / this.pageSize)));
  pagedLeaves = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.filteredLeaves().slice(s, s + this.pageSize);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages(), cur = this.currentPage();
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  constructor(
    private fb: FormBuilder,
    private auth: Authservice,
    private leaveService: LeaveService,
    private router: Router,
    private toast: ToastService
  ) { }

  ngOnInit() {
    const userId = this.auth.getUserId();
    if (userId) { this.Id.set(userId); this.loadMyLeaves(); }

    this.editForm = this.fb.group({
      requestType: ['', Validators.required],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      session: ['', Validators.required],
      reason: ['', Validators.required],
      handoverTo: [''],
    });
    this.loadLeaveBalance();
  }

  loadLeaveBalance() {
    this.leaveService.getUserLeaveBalance(this.Id()).subscribe({
      next: (res) => {
        this.leaveBalances.set(Array.isArray(res) ? res : res ? [res] : []);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }
  
  loadMyLeaves() {
    this.isLoading = true;
    this.leaveService.getMyleaveList(this.Id()).subscribe({
      next: (res: any) => { this.myLeaves.set(Array.isArray(res) ? res : res ? [res] : []); this.isLoading = false; },
      error: err => { console.error(err); this.isLoading = false; }
    });
  }

  // ── Edit Modal ──
  editLeave(leave: any) {
    this.leaveId.set(leave.leaveRequestId);
    this.editForm.patchValue({
      requestType: leave.requestType,
      fromDate: this.toInputDate(leave.fromDate),
      toDate: this.toInputDate(leave.toDate),
      session: leave.session,
      reason: leave.reason,
      handoverTo: leave.handoverTo ?? '',
    });
    this.editModalOpen.set(true);
  }

  closeEditModal() {
    this.editModalOpen.set(false);
    this.leaveId.set(null);
    this.editForm.reset();
    this.isSubmitting = false;
  }

  submitEdit() {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const v = this.editForm.value;
    const from = new Date(v.fromDate), to = new Date(v.toDate);
    let totalDays = (to.getTime() - from.getTime()) / 86400000 + 1;
    if (v.session === 'Half Day') totalDays = totalDays === 1 ? 0.5 : totalDays - 0.5;

    this.isSubmitting = true;
    this.leaveService.updateLeave(this.leaveId(), {
      leaveRequestId: this.leaveId(),
      requestType: v.requestType, fromDate: v.fromDate, toDate: v.toDate,
      totalDays, session: v.session, reason: v.reason, handoverTo: v.handoverTo || '',
    }).subscribe({
      next: () => { this.closeEditModal(); this.loadMyLeaves(); },
      error: err => { this.toast.error(err?.error?.message || 'Update failed'); this.isSubmitting = false; }
    });
  }

  withdrawLeave(leaveRequestId: number) {
    this.deletingId.set(leaveRequestId);
    this.leaveService.Withdrawleave(leaveRequestId).subscribe({
      next: () => { this.deletingId.set(null); this.loadMyLeaves(); },
      error: err => { this.deletingId.set(null); console.error(err); }
    });
  }

  // ── Navigation ──
  setFilter(f: string) { this.activeFilter.set(f); this.currentPage.set(1); }
  goToPage(p: number | '...') { if (p !== '...' && +p >= 1 && +p <= this.totalPages()) this.currentPage.set(+p); }
  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }

  // ── Helpers ──
  toInputDate(d: string): string { return d ? new Date(d).toISOString().split('T')[0] : ''; }

  formatDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  }

  getLeaveTypeName(typeId: number): string {
    switch (typeId) {
      case 1: return 'Annual Leave';
      case 2: return 'Sick Leave';
      case 3: return 'Comp Off';
      case 4: return 'Emergency';
      default: return 'Leave';
    }
  }

  getPercentage(used: number, total: number): number {
    return (used / total) * 100;
  }

  typeClass(type: string): string {
    if (type?.includes('Annual')) return 'annual';
    if (type?.includes('Sick')) return 'sick';
    if (type?.includes('Emergency')) return 'emergency';
    if (type?.includes('Comp')) return 'compoff';
    if (type?.includes('Unpaid')) return 'unpaid';
    return 'annual';
  }
}