import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user-service/user-service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm!: FormGroup;
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private userservice: UserService
  ) { }

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }


  onSubmit() {
    const data = this.loginForm.value;
    
    if (this.loginForm.invalid) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }
    
    this.userservice.login(data).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        this.errorMessage.set('login successful');
        this.loginForm.reset();
      },
      error: (err) => {
        this.errorMessage.set('Invalid email or password.');
      }
    })

  }
}

