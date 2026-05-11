import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ɵInternalFormsSharedModule, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { Authservice } from '../../services/Auth-service/authservice';
import { LeaveService } from '../../services/leave-service/leave-service';
import { Backbtn } from "../../components/backbtn/backbtn";
import { ToastService } from '../../services/toast-service/toast';

function todayStr(): string {
  const d = new Date();
  return toYMD(d);
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
    const to = parseLocal(toVal);
    if (to > maxDate) {
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
  selector: 'app-newleavepage',
  imports: [ɵInternalFormsSharedModule, ReactiveFormsModule, Backbtn],
  templateUrl: './newleavepage.html',
  styleUrl: './newleavepage.css',
})
export class Newleavepage {
  leaveForm!: FormGroup;
  message = signal('');
  userid = signal<null | any>(null);
  leaveTypes = signal<any[]>([]);

  readonly minDate = todayStr();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: Authservice,
    private leaveService: LeaveService,
    private toast: ToastService,
  ) { }

  ngOnInit() {
    const userId = this.auth.getUserId();
    this.userid.set(userId);
    this.loadLeaveTypes();

    this.leaveForm = this.fb.group(
      {
        UserId: [this.userid(), Validators.required],
        requestType: ['', Validators.required],
        fromDate: ['', [Validators.required, fromDateValidator]],
        toDate: ['', Validators.required],
        session: ['', Validators.required],
        reason: ['', Validators.required],
        handoverTo: [''],
      },
      { validators: toDateValidator }
    );

    this.leaveForm.get('fromDate')?.valueChanges.subscribe(() => {
      this.onFromDateChange();
    });

    this.leaveForm.get('session')?.valueChanges.subscribe(() => {
      this.onSessionChange();
    });
  }

  loadLeaveTypes() {
    this.leaveService.getLeaveTypes().subscribe({
      next: (res: any) => {
        this.leaveTypes.set(res.data || []);
        console.log("leavetypes::", this.leaveTypes());
        
      },
      error: (err) => {
        console.log('Error fetching leave types', err);
      }
    });
  }

  get toDateMin(): string {
    return this.leaveForm?.get('fromDate')?.value || this.minDate;
  }

  get toDateMax(): string {
    const fromVal: string = this.leaveForm?.get('fromDate')?.value;
    const session: string = this.leaveForm?.get('session')?.value;
    if (!fromVal) return '';
    if (session === 'Half Day') return fromVal;
    const from = parseLocal(fromVal);
    const max = new Date(from.getFullYear(), from.getMonth() + 2, from.getDate());
    return toYMD(max);
  }

  get toDateDisabled(): boolean {
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

  fromDateError(): string {
    const ctrl = this.leaveForm.get('fromDate');
    if (!ctrl?.touched && !ctrl?.dirty) return '';
    if (ctrl.errors?.['required']) return 'From date is required.';
    if (ctrl.errors?.['pastDate']) return 'Date cannot be in the past.';
    if (ctrl.errors?.['weekend']) return 'Weekends (Sat/Sun) are not allowed.';
    return '';
  }

  toDateError(): string {
    const ctrl = this.leaveForm.get('toDate');
    if (!ctrl?.touched && !ctrl?.dirty) return '';
    if (ctrl.errors?.['required']) return 'To date is required.';
    if (ctrl.errors?.['beforeFrom']) return 'To date cannot be before From date.';
    if (ctrl.errors?.['weekend']) return 'Weekends (Sat/Sun) are not allowed.';
    if (ctrl.errors?.['halfDayMismatch']) return 'Half day leave must be on the same date.';
    if (ctrl.errors?.['exceedsMaxRange']) return 'To date cannot exceed 2 months from From date.';
    return '';
  }

  submitLeave() {
    this.leaveForm.markAllAsTouched();
    if (this.leaveForm.invalid) {
      this.toast.error('Please fix the errors before submitting.');
      return;
    }
    const data = this.leaveForm.value;
    this.leaveService.createNewLeave(data).subscribe({
      next: res => {
        this.message.set(res.message);
        this.toast.success(this.message() || 'Request submitted successfully!');
        this.leaveForm.reset();
        this.router.navigate(['/dashboard/leavepage']);
      },
      error: err => {
        this.message.set(err.error.error);
        this.toast.error(this.message() || 'Network Error');
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/leavepage']);
  }

  reset() {
    this.leaveForm.reset();
  }
}