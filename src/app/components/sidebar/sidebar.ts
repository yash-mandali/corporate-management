import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { Authservice } from '../../services/Auth-service/authservice';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EmployeeService } from '../../services/employee-service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule,RouterLink,RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  role = signal<any>('');
  isLoggingOut = false;

  // @Output() closeSidebar = new EventEmitter<void>();

  constructor(
    private auth: Authservice,
    public emp: EmployeeService,
    private router: Router) { }

  ngOnInit() {
    this.role.set(this.auth.getRole())
  }

  logout() {
    this.isLoggingOut = true;
    setTimeout(() => {
      this.auth.Logout();
      this.router.navigate(['/login']);
      this.isLoggingOut = false;
    }, 1500);
  }
}
