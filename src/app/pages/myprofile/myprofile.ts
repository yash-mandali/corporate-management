import { Component, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Authservice } from '../../services/Auth-service/authservice';
import { UserService } from '../../services/user-service/user-service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './myprofile.html',
  styleUrl: './myprofile.css',
})
export class MyProfile {
  profileData = signal<any>(null);
  activeTab: 'info' | 'security' = 'info';
  editMode = false;
  pwdMode = false;
  isSaving = false;
  isPwdSaving = false;
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  profileForm!: FormGroup;
  pwdForm!: FormGroup;

  initials = computed(() => {
    const name = this.profileData()?.userName || '';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'E';
  });

  constructor(
    private fb: FormBuilder,
    private auth: Authservice,
    private userService: UserService,
    private toast: ToastrService,
    private router: Router
  ) { }

  ngOnInit() {
    this.profileForm = this.fb.group({
      userName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      gender: ['', Validators.required],
      address: [''],
    });

    this.pwdForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });

    this.loadProfile();
  }

  loadProfile() {
    const Id: any = this.auth.getUserId();
    if (!Id) return;
    this.userService.getUserById(Id).subscribe({
      next: (res) => {
        this.profileData.set(res);
        console.log(res);
      },
      error: (err) => console.error(err)
    });
  }

  enableEdit() {
    const d = this.profileData();
    this.profileForm.patchValue({
      userName: d?.userName || '',
      email: d?.email || '',
      phoneNumber: d?.phoneNumber || '',
      gender: d?.gender || '',
      address: d?.address || '',
    });
    this.editMode = true;
  }

  cancelEdit() {
    this.editMode = false;
    this.profileForm.reset();
  }

  saveProfile() {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.isSaving = true;
    const payload = {
      id: this.profileData()?.id,
      // roleId: this.profileData()?.roleId,
      ...this.profileForm.value
    };
    this.userService.updateUser(payload).subscribe({
      next: () => {
        // this.toast.success('Profile updated successfully!');
        this.editMode = false;
        this.isSaving = false;
        this.loadProfile();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Update failed');
        this.isSaving = false;
      }
    });
  }

  cancelPwd() {
    this.pwdMode = false;
    this.pwdForm.reset();
    this.showCurrent = this.showNew = this.showConfirm = false;
  }

  savePassword() {
    if (this.pwdForm.invalid) { this.pwdForm.markAllAsTouched(); return; }
    this.isPwdSaving = true;
    const payload = {
      id: this.profileData()?.id,
      currentPassword: this.pwdForm.value.currentPassword,
      newPassword: this.pwdForm.value.newPassword,
    };
    // this.userService.changePassword(payload).subscribe({
    //   next: () => {
    //     this.toast.success('Password updated successfully!');
    //     this.cancelPwd();
    //     this.isPwdSaving = false;
    //   },
    //   error: (err) => {
    //     this.toast.error(err?.error?.message || 'Incorrect current password');
    //     this.isPwdSaving = false;
    //   }
    // });
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const n = group.get('newPassword')?.value;
    const c = group.get('confirmPassword')?.value;
    return n && c && n !== c ? { mismatch: true } : null;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}