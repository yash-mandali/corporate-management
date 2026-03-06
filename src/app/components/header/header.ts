import { Component, signal } from '@angular/core';
import { Authservice } from '../../services/Auth-service/authservice';
import { EmployeeService } from '../../services/employee-service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  isLoggingOut = false;
  constructor(
    private auth: Authservice,
    public emp: EmployeeService,
    private router: Router
  ) { }

  currentDate = '';
  notifPanelOpen = signal(false);
  unreadCount = signal(3);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.updateDate();
    this.timer = setInterval(() => this.updateDate(), 60_000);
  }
  

  ngOnDestroy() { clearInterval(this.timer); }

  private updateDate() {
    this.currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  toggleNotif() { this.notifPanelOpen.update(v => !v); }

  logout() {
    this.isLoggingOut = true;
    setTimeout(() => {
      this.auth.Logout();
      this.router.navigate(['/login']);
      this.isLoggingOut = false;
    }, 1500);
  }

}
