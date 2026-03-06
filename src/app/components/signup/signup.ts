import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user-service/user-service';
import { take } from 'rxjs';
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

  constructor(
    private fb: FormBuilder,
    private userservice: UserService,
    private router: Router
  ) { }

  ngOnInit() {
    this.signupForm = this.fb.group({
      userName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: ['', [Validators.maxLength(10), Validators.pattern(/^[0-9]{10}$/)]],
      gender: ['', [Validators.required]],
      address: ['empty'],
      roleId: ['2']
    });
  }
  get userName() { return this.signupForm.get('userName'); }
  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }
  get phoneNumber() { return this.signupForm.get('phoneNumber'); }
  get gender() { return this.signupForm.get('gender'); }

  onSubmit() {
    const data = this.signupForm.value;
    if (this.signupForm.invalid) {
      this.errorMessage.set('Please fill in all required fields with valid data.');
      return;
    }
    this.userservice.signup(data).subscribe({
      next: (res: any) => {
        this.errorMessage.set('Signup successful');
        console.log(res); 
        this.signupForm.reset();
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage.set('Signup failed. Please try again.');
        console.log(err.error.message);
        
      }
    })
  }
  get f() {
    return this.signupForm.controls;
  }
}
