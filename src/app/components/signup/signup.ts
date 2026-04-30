import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user-service/user-service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  signupForm!: FormGroup;
  errorMessage = signal('');
  isLoading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private userservice: UserService,
    private router: Router
  ) { }

  ngOnInit() {
    this.signupForm = this.fb.group({
      id: [0],
      userName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      gender: ['', [Validators.required]],
      // address: ['empty'],
      roleId: [2]
    });
  }

  get f() { return this.signupForm.controls; }

  onSubmit() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields with valid data.');
      return;
    }

    this.isLoading = true;
    this.errorMessage.set('');
    const data = this.signupForm.value;
    console.log("data called:", data);

    this.userservice.signup(data).subscribe({
      next: (res: any) => {
        console.log("signup buttom called::", res);

        this.errorMessage.set('Account created successfully! Redirecting…');
        this.isLoading = false;
        this.signupForm.reset();
        setTimeout(() => this.router.navigate(['/']), 900);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Signup failed. Please try again.');
        this.isLoading = false;
      }
    });
  }
}