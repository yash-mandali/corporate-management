import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user-service/user-service';
import { Authservice } from '../../services/Auth-service/authservice';

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

  constructor(
    private fb: FormBuilder,
    private userservice: UserService,
    private authService: Authservice,
    private router: Router
  ) { }

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
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
          if (this.authService.getRole() == "Employee") {
            this.router.navigate(['/dashboard/dashboardpage']);         
          }  else if (this.authService.getRole() == "Manager") {
            this.router.navigate(['/dashboard/managerdashboard']);
          } else if (this.authService.getRole() == "HR") {
            this.router.navigate(['/dashboard/hrdashboard']);
          } else {
            this.router.navigate(['/fgfhtjgf']);
          }
          this.loginForm.reset();
        }, 800);
      },
      error: () => {
        this.errorMessage.set('Invalid email or password. Please try again.');
        this.isLoading = false;
      }
    });
  }
}