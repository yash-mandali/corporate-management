import { Component, computed, signal } from '@angular/core';
import { LeaveService } from '../../services/leave-service/leave-service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Authservice } from '../../services/Auth-service/authservice';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-apply-leave',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './apply-leave.html',
  styleUrl: './apply-leave.css',
})
export class ApplyLeave {
  Id = signal<null | any>(null);
  message = signal('');
  myLeaves = signal<any[]>([]);
  totalRequests = signal<number>(0);
  approvedleaves = signal<number>(0);
  pendingleaves = signal<number>(0);
  rejectedleaves = signal<number>(0);
  withdrawnleaves = signal<number>(0);
  deletingId = signal<number | null>(null);
  isLoading = false;

  // ── Edit Modal ──
  editModalOpen = signal(false);
  leaveId = signal<null | any>(null);
  editForm!: FormGroup;
  isSubmitting = false;

  activeFilter = signal<string>('all');
  currentPage = signal<number>(1);
  readonly pageSize = 5;

  filteredLeaves = computed(() => {
    const filter = this.activeFilter().toLowerCase();
    const all = this.myLeaves();

    let filtered = [...all];

    if (filter !== 'all') {

      if (filter === 'approved') {
        filtered = all.filter(r =>
          ['managerapproved', 'approved']
            .includes(r.status?.toLowerCase() || '')
        );
      }

      else if (filter === 'rejected') {
        filtered = all.filter(r =>
          ['managerrejected', 'rejected']
            .includes(r.status?.toLowerCase() || '')
        );
      }

      else {
        filtered = all.filter(r =>
          r.status?.toLowerCase() === filter
        );
      }

    }

    return filtered.sort((a, b) => {
      const dateA = a.appliedOn ? new Date(a.appliedOn).getTime() : 0;
      const dateB = b.appliedOn ? new Date(b.appliedOn).getTime() : 0;
      return dateB - dateA;
    });
  });

  totalPages = computed(() => {
    const len = this.filteredLeaves().length;
    return len === 0 ? 0 : Math.ceil(len / this.pageSize);
  });

  pagedLeaves = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return this.filteredLeaves().slice(start, start + this.pageSize);
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  constructor(
    private fb: FormBuilder,
    private auth: Authservice,
    private readonly leaveService: LeaveService,
    private router: Router,
    private toast: ToastrService
  ) { }

  ngOnInit() {
    const userId = this.auth.getUserId();
    if (userId) {
      this.Id.set(userId);
      this.loadMyLeaves();
    }

    this.editForm = this.fb.group({
      requestType: ['', Validators.required],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      session: ['', Validators.required],
      reason: ['', Validators.required],
      handoverTo: [''],
    });
  }

  // ── Edit Modal ──────────────────────────────────────────────
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
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const v = this.editForm.value;
    const fromDate = new Date(v.fromDate);
    const toDate = new Date(v.toDate);

    // Calculate totalDays (matching your sp_UpdateLeave logic)
    let totalDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
    if (v.session === 'Half Day') totalDays = totalDays === 1 ? 0.5 : totalDays - 0.5;
    const payload = {
      leaveRequestId: this.leaveId(),
      requestType: v.requestType,
      fromDate: v.fromDate,
      toDate: v.toDate,
      totalDays: totalDays,
      session: v.session,
      reason: v.reason,
      handoverTo: v.handoverTo || '',
    };

    this.isSubmitting = true;
    this.leaveService.updateLeave(this.leaveId(), payload).subscribe({
      next: () => {
        // this.toast.success('Leave updated successfully!');
        this.closeEditModal();
        this.loadMyLeaves();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Update failed');
        this.isSubmitting = false;
      }
    });
  }

  withdrawLeave(leaveRequestId: number) {
    this.deletingId.set(leaveRequestId);

    setTimeout(() => {
      this.leaveService.Withdrawleave(leaveRequestId).subscribe({
        next: () => {
          // this.toast.success('Leave cancelled');
          this.deletingId.set(null);
          this.myLeaves.update(leaves => leaves.filter(l => l.leaveRequestId !== leaveRequestId));
          this.recalculateCounts();
          this.loadMyLeaves();
        },
        error: (err) => {
          this.deletingId.set(null);
          console.error('Delete failed:', err.message);
        }
      });
    }, 1000);
  }

  // ── Helpers ─────────────────────────────────────────────────
  recalculateCounts() {
    const all = this.myLeaves();
    this.totalRequests.set(all.length);
    this.approvedleaves.set(all.filter(x => x.status?.toLowerCase() === 'approved').length); 
    this.pendingleaves.set(all.filter(x => x.status?.toLowerCase() === 'pending').length);
    this.rejectedleaves.set(all.filter(x => x.status?.toLowerCase() === 'rejected').length);
    this.withdrawnleaves.set(all.filter(x => x.status?.toLowerCase() === 'withdrawn').length);
  }

  toInputDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  }

  setFilter(filter: string) { this.activeFilter.set(filter); this.currentPage.set(1); }
  goToPage(page: number | '...') { if (page !== '...' && page >= 1 && page <= this.totalPages()) this.currentPage.set(page as number); }
  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  pageEnd(): number { return Math.min(this.currentPage() * this.pageSize, this.filteredLeaves().length); }
  pageStart(): number { return this.filteredLeaves().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1; }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  typeClass(type: string): string {
    if (type.includes('Annual')) return 'annual';
    if (type.includes('Sick')) return 'sick';
    if (type.includes('Emergency')) return 'emergency';
    if (type.includes('Comp')) return 'compoff';
    return 'annual';
  }

  loadMyLeaves() {
    this.isLoading = true;
    this.leaveService.getMyleaveList(this.Id()).subscribe({
      next: (res) => {
        console.log('Leaves loaded:', res.length, res);
        this.myLeaves.set(res);
        this.totalRequests.set(res.length);
        this.approvedleaves.set(res.filter((x: any) => x.status?.toLowerCase() === 'approved').length);
        this.pendingleaves.set(res.filter((x: any) => x.status?.toLowerCase() === 'pending').length);
        this.rejectedleaves.set(res.filter((x: any) => x.status?.toLowerCase() === 'rejected').length);
        this.withdrawnleaves.set(res.filter((x: any) => x.status?.toLowerCase() === 'withdrawn').length);
        this.isLoading = false;
      },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }
}