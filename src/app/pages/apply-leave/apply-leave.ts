import { Component, computed, signal } from '@angular/core';
import { LeaveService } from '../../services/leave-service/leave-service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Authservice } from '../../services/Auth-service/authservice';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../services/toast-service/toast';
import { SlicePipe, NgForOf } from '@angular/common';

// ── Status sets ──
const APPROVED_SET = new Set(['approved', 'managerapproved']);
const REJECTED_SET = new Set(['rejected', 'managerrejected']);

// ── Date helpers (from newleavepage.ts) ──
function todayStr(): string {
  return toYMD(new Date());
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isWeekend(s: string): boolean {
  if (!s) return false;
  const day = parseLocal(s).getDay();
  return day === 0 || day === 6;
}

// ── Validators (from newleavepage.ts) ──
function fromDateValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value;
  if (!val) return null;
  if (val < todayStr()) return { pastDate: true };
  if (isWeekend(val)) return { weekend: true };
  return null;
}

function toDateValidator(group: AbstractControl): ValidationErrors | null {
  const fromVal: string = group.get('fromDate')?.value;
  const toVal: string = group.get('toDate')?.value;
  const session: string = group.get('session')?.value;

  if (!toVal) return null;

  if (isWeekend(toVal)) {
    group.get('toDate')?.setErrors({ weekend: true });
    return null;
  }
  if (fromVal && toVal < fromVal) {
    group.get('toDate')?.setErrors({ beforeFrom: true });
    return null;
  }
  if (session === 'Half Day' && fromVal && toVal !== fromVal) {
    group.get('toDate')?.setErrors({ halfDayMismatch: true });
    return null;
  }
  if (fromVal) {
    const from = parseLocal(fromVal);
    const maxDate = new Date(from.getFullYear(), from.getMonth() + 2, from.getDate());
    if (parseLocal(toVal) > maxDate) {
      group.get('toDate')?.setErrors({ exceedsMaxRange: true });
      return null;
    }
  }

  const toCtrl = group.get('toDate');
  if (toCtrl?.errors && !toCtrl.errors['required']) {
    toCtrl.setErrors(null);
  }
  return null;
}

@Component({
  selector: 'app-apply-leave',
  imports: [ReactiveFormsModule, SlicePipe, NgForOf],
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

  // ── Apply Leave Modal (merged from newleavepage) ──
  applyModalOpen = signal(false);
  leaveForm!: FormGroup;
  leaveTypes = signal<any[]>([]);
  isApplying = false;
  readonly minDate = todayStr();

  // ── Filter + Pagination ──
  activeFilter = signal<string>('all');
  currentPage = signal<number>(1);
  readonly pageSize = 5;

  // ── Computed counts ──
  totalRequests = computed(() => this.myLeaves().length);
  pendingleaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'pending').length);
  approvedleaves = computed(() => this.myLeaves().filter(l => APPROVED_SET.has(l.status?.toLowerCase())).length);
  rejectedleaves = computed(() => this.myLeaves().filter(l => REJECTED_SET.has(l.status?.toLowerCase())).length);
  withdrawnleaves = computed(() => this.myLeaves().filter(l => l.status?.toLowerCase() === 'withdrawn').length);

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

    // Edit form
    this.editForm = this.fb.group({
      requestType: ['', Validators.required],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      session: ['', Validators.required],
      reason: ['', Validators.required],
      handoverTo: [''],
    });

    // Apply Leave form (merged from newleavepage)
    this.leaveForm = this.fb.group(
      {
        UserId: [this.Id(), Validators.required],
        requestType: ['', Validators.required],
        fromDate: ['', [Validators.required, fromDateValidator]],
        toDate: ['', Validators.required],
        session: ['', Validators.required],
        reason: ['', Validators.required],
        handoverTo: [''],
      },
      { validators: toDateValidator }
    );

    this.leaveForm.get('fromDate')?.valueChanges.subscribe(() => this.onFromDateChange());
    this.leaveForm.get('session')?.valueChanges.subscribe(() => this.onSessionChange());

    this.loadLeaveBalance();
    this.loadLeaveTypes();
  }

  // ── Data loaders ──
  loadLeaveBalance() {
    this.leaveService.getUserLeaveBalance(this.Id()).subscribe({
      next: (res) => this.leaveBalances.set(Array.isArray(res) ? res : res ? [res] : []),
      error: (err) => console.error(err)
    });
  }

  loadMyLeaves() {
    this.isLoading = true;
    this.leaveService.getMyleaveList(this.Id()).subscribe({
      next: (res: any) => { this.myLeaves.set(Array.isArray(res) ? res : res ? [res] : []); this.isLoading = false; },
      error: err => { console.error(err); this.isLoading = false; }
    });
  }

  loadLeaveTypes() {
    this.leaveService.getLeaveTypes().subscribe({
      next: (res: any) => {
        this.leaveTypes.set(res.data || [])
        console.log("loadleavetypes called::", res);

      },
      error: (err) => console.error('Error fetching leave types', err)
    });
  }

  // ── Apply Leave Modal ──
  openApplyModal() {
    this.leaveForm.reset({ UserId: this.Id() });
    this.isApplying = false;
    this.applyModalOpen.set(true);
  }

  closeApplyModal() {
    this.applyModalOpen.set(false);
    this.leaveForm.reset({ UserId: this.Id() });
    this.isApplying = false;
  }

  resetLeaveForm() {
    this.leaveForm.reset({ UserId: this.Id() });
  }

  submitLeave() {
    this.leaveForm.markAllAsTouched();
    if (this.leaveForm.invalid) {
      this.toast.error('Please fix the errors before submitting.');
      return;
    }
    this.isApplying = true;
    const data = this.leaveForm.value;
    this.leaveService.createNewLeave(data).subscribe({
      next: (res: any) => {
        this.toast.success(res?.message || 'Leave request submitted successfully!');
        this.closeApplyModal();
        this.loadMyLeaves();
        this.loadLeaveBalance();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.error || 'Network Error');
        this.isApplying = false;
      }
    });
  }

  // Date helpers for Apply form
  get applyToDateMin(): string {
    return this.leaveForm?.get('fromDate')?.value || this.minDate;
  }

  get applyToDateMax(): string {
    const fromVal: string = this.leaveForm?.get('fromDate')?.value;
    const session: string = this.leaveForm?.get('session')?.value;
    if (!fromVal) return '';
    if (session === 'Half Day') return fromVal;
    const from = parseLocal(fromVal);
    return toYMD(new Date(from.getFullYear(), from.getMonth() + 2, from.getDate()));
  }

  get applyToDateDisabled(): boolean {
    return !this.leaveForm?.get('fromDate')?.value;
  }

  onFromDateChange() {
    const session = this.leaveForm.get('session')?.value;
    const fromVal = this.leaveForm.get('fromDate')?.value;
    if (session === 'Half Day') {
      this.leaveForm.get('toDate')?.setValue(fromVal, { emitEvent: false });
    } else {
      const toVal = this.leaveForm.get('toDate')?.value;
      if (toVal && toVal < fromVal) {
        this.leaveForm.get('toDate')?.setValue('', { emitEvent: false });
      }
    }
    this.leaveForm.updateValueAndValidity();
  }

  onSessionChange() {
    const session = this.leaveForm.get('session')?.value;
    const fromVal = this.leaveForm.get('fromDate')?.value;
    if (session === 'Half Day' && fromVal) {
      this.leaveForm.get('toDate')?.setValue(fromVal, { emitEvent: false });
    }
    this.leaveForm.updateValueAndValidity();
  }

  applyFromDateError(): string {
    const ctrl = this.leaveForm.get('fromDate');
    if (!ctrl?.touched && !ctrl?.dirty) return '';
    if (ctrl.errors?.['required']) return 'From date is required.';
    if (ctrl.errors?.['pastDate']) return 'Date cannot be in the past.';
    if (ctrl.errors?.['weekend']) return 'Weekends (Sat/Sun) are not allowed.';
    return '';
  }

  applyToDateError(): string {
    const ctrl = this.leaveForm.get('toDate');
    if (!ctrl?.touched && !ctrl?.dirty) return '';
    if (ctrl.errors?.['required']) return 'To date is required.';
    if (ctrl.errors?.['beforeFrom']) return 'To date cannot be before From date.';
    if (ctrl.errors?.['weekend']) return 'Weekends (Sat/Sun) are not allowed.';
    if (ctrl.errors?.['halfDayMismatch']) return 'Half day leave must be on the same date.';
    if (ctrl.errors?.['exceedsMaxRange']) return 'To date cannot exceed 2 months from From date.';
    return '';
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

  toInputDate(d: string): string { return d ? new Date(d).toISOString().split('T')[0] : ''; }

  formatDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
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