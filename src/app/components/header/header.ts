import { Component, HostListener, signal } from '@angular/core';
import { Authservice } from '../../services/Auth-service/authservice';
import { EmployeeService } from '../../services/employee-service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user-service/user-service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  isLoggingOut = false;
  profileOpen = false;
  userEmail = signal('')

  constructor(
    private auth: Authservice,
    public emp: EmployeeService,
    private userService:UserService,
    private router: Router
  ) { }

  currentDate = '';
  // notifPanelOpen = signal(false);
  // unreadCount = signal(3);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.updateDate();
    this.timer = setInterval(() => this.updateDate(), 60_000);
    this.userEmail.set(this.auth.getEmail())
  }
  

  ngOnDestroy() { clearInterval(this.timer); }

  private updateDate() {
    this.currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-wrap')) {
      this.profileOpen = false;
    }
  }

  // toggleNotif() { this.notifPanelOpen.update(v => !v); }

  logout() {
    this.profileOpen = false;
    this.isLoggingOut = true;
    setTimeout(() => {
      this.auth.Logout();
      this.router.navigate(['/login']);
      this.isLoggingOut = false;
    }, 1500);
  }
}