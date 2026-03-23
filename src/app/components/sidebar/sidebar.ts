import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { Authservice } from '../../services/Auth-service/authservice';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EmployeeService } from '../../services/employee-service';
import { UserService } from '../../services/user-service/user-service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule,RouterLink,RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  role = signal<any>('');
  userId = signal<any>('')
  isLoggingOut = false;

  // @Output() closeSidebar = new EventEmitter<void>();

  constructor(
    private auth: Authservice,
    public emp: EmployeeService,
    public userService:UserService,
    private router: Router) { }

  ngOnInit() {
    this.role.set(this.auth.getRole())
    this.userId.set(this.auth.getUserId())
  }

  logout() {
    this.isLoggingOut = true;
    setTimeout(() => {
      this.auth.Logout();
      this.userService.logout(this.userId()).subscribe()
      this.router.navigate(['/login']);
      this.isLoggingOut = false;
    }, 1500);
  }
}
