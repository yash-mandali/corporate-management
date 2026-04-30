import { CommonModule } from '@angular/common';
import { Component, signal, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user-service/user-service';
import { Authservice } from '../../services/Auth-service/authservice';
import { LeaveService } from '../../services/leave-service/leave-service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm!: FormGroup;
  errorMessage = signal('');
  isLoading = false;
  showPassword = false;

  showForgotModal = signal(false);
  fpStep = signal<'email' | 'otp' | 'password'>('email');
  fpEmail = '';
  fpLoading = false;
  fpError = signal('');
  fpSuccess = signal('');

  otpDigits: string[] = ['', '', '', '', '', ''];
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  newPasswordForm!: FormGroup;
  showNewPw = false;
  showConfirmPw = false;

  constructor(
    private fb: FormBuilder,
    private userservice: UserService,
    private authService: Authservice,
    private leaveService: LeaveService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.newPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
    const pw = g.get('newPassword')?.value;
    const cpw = g.get('confirmPassword')?.value;
    return pw && cpw && pw !== cpw ? { mismatch: true } : null;
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }
    this.isLoading = true;
    this.errorMessage.set('');
    const data = this.loginForm.value;

    this.userservice.login(data).subscribe({
      next: (res: any) => {
        this.authService.setToken(res.token);
        this.authService.setUserId(res.userId);
        this.errorMessage.set('Login successful! Redirecting…');
        this.isLoading = false;
        setTimeout(() => {
          const role = this.authService.getRole();
          if (role === 'Employee') this.router.navigate(['/dashboard/dashboardpage']);
          else if (role === 'Manager') this.router.navigate(['/dashboard/managerdashboard']);
          else if (role === 'HR') this.router.navigate(['/dashboard/hrdashboard']);
          else if (role === 'Admin') this.router.navigate(['/dashboard/admindashboard']);
          else this.router.navigate(['/fgfhtjgf']);
          this.loginForm.reset();
        }, 800);
        this.leaveService.InitillizeLeaveBalanceApi().subscribe();
      },
      error: () => {
        this.errorMessage.set('Invalid email or password. Please try again.');
        this.isLoading = false;
      }
    });
  }

  openForgotModal() {
    this.showForgotModal.set(true);
    this.fpStep.set('email');
    this.fpEmail = '';
    this.fpError.set('');
    this.fpSuccess.set('');
    this.otpDigits = ['', '', '', '', '', ''];
    this.newPasswordForm.reset();
  }

  closeForgotModal() {
    this.showForgotModal.set(false);
  }

  onSendOtp() {
    if (!this.fpEmail || !this.fpEmail.includes('@')) {
      this.fpError.set('Please enter a valid email address.');
      return;
    }
    this.fpLoading = true;
    this.fpError.set('');

    this.userservice.sendEmailOtp(this.fpEmail).subscribe({
      next: (res: any) => {
        console.log("onsendOtp res:",res);
        
        this.fpLoading = false;
        this.fpError.set('');
        this.fpStep.set('otp');        
        this.fpSuccess.set('OTP sent! Check your inbox.');

        setTimeout(() => {
          this.fpSuccess.set('');
          const inputs = this.otpInputs?.toArray();
          if (inputs?.length) {
            inputs[0].nativeElement.focus();
          }
        }, 150);                     
      },
      error: (err: any) => {
        this.fpLoading = false;
        this.fpError.set(err?.error?.message || 'Email not found. Please try again.');
      }
    });
  }

  onOtpInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);
    this.otpDigits[index] = val;
    input.value = val;
    if (val && index < 5) {
      const next = this.otpInputs.toArray()[index + 1];
      next?.nativeElement?.focus();
    }
  }

  onOtpKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prev = this.otpInputs.toArray()[index - 1];
      prev?.nativeElement?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    digits.forEach((d, i) => { this.otpDigits[i] = d; });
    const inputs = this.otpInputs.toArray();
    inputs.forEach((el, i) => { el.nativeElement.value = this.otpDigits[i] || ''; });
    const focusIdx = Math.min(digits.length, 5);
    inputs[focusIdx]?.nativeElement?.focus();
  }

  get otpComplete(): boolean {
    return this.otpDigits.every(d => d !== '');
  }

  onVerifyOtp() {
    if (!this.otpComplete) {
      this.fpError.set('Please enter the complete 6-digit OTP.');
      return;
    }
    const otp = this.otpDigits.join('');
    this.fpLoading = true;
    this.fpError.set('');
    this.userservice.verifyEmailOtp(this.fpEmail, otp).subscribe({
      next: () => {
        this.fpLoading = false;
        this.fpStep.set('password');
        this.fpError.set('');
      },
      error: (err: any) => {
        this.fpLoading = false;
        this.fpError.set(err?.error?.message || 'Invalid or expired OTP. Please try again.');
      }
    });
  }

  onChangePassword() {
    if (this.newPasswordForm.invalid) {
      this.newPasswordForm.markAllAsTouched();
      return;
    }
    const { newPassword } = this.newPasswordForm.value;
    const { confirmPassword } = this.newPasswordForm.value;
    this.fpLoading = true;
    this.fpError.set('');
    this.userservice.changePassword(this.fpEmail, newPassword, confirmPassword).subscribe({
      next: () => {
        this.fpLoading = false;
        this.fpSuccess.set('Password changed successfully! Redirecting to login…');
        setTimeout(() => {
          this.closeForgotModal();
        }, 1800);
      },
      error: (err: any) => {
        this.fpLoading = false;
        this.fpError.set(err?.error?.message || 'Password reset failed. Please try again.');
      }
    });
  }

  resendOtp() {
    this.fpLoading = true;
    this.fpError.set('');
    this.otpDigits = ['', '', '', '', '', ''];
    this.otpInputs?.forEach(el => el.nativeElement.value = '');
    this.userservice.sendEmailOtp(this.fpEmail).subscribe({
      next: () => {
        this.fpLoading = false;
        this.fpSuccess.set('OTP resent!');
        setTimeout(() => this.fpSuccess.set(''), 2500);
      },
      error: () => {
        this.fpLoading = false;
        this.fpError.set('Failed to resend OTP.');
      }
    });
  }
}