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

  constructor(
    private auth: Authservice,
    public emp: EmployeeService,
    public userService:UserService,
    private router: Router) { }

  ngOnInit() {
    this.role.set(this.auth.getRole())
    this.userId.set(this.auth.getUserId())
  }
  menuItems = computed(() => {
    const role = this.role();

    const menus: Record<string, any[]> = {
      Employee: [
        { label: 'Dashboard', route: '/dashboard/dashboardpage', icon: 'fas fa-chart-line' },
        { label: 'My Requests', route: '/dashboard/leavepage', icon: 'fas fa-paper-plane' },
        { label: 'Attendance', route: '/dashboard/attendance', icon: 'fas fa-clock' },
        { label: 'TimeSheet', route: '/dashboard/timesheet', icon: 'fas fa-tasks' },
        { label: 'Salary & Payroll', route: '/dashboard/salarypayroll', icon: 'fas fa-coins' },
        { label: 'Profile', route: '/dashboard/myprofile', icon: 'fas fa-user' },
      ],
      Manager: [
        { label: 'Dashboard', route: '/dashboard/managerdashboard', icon: 'fas fa-chart-line' },
        { label: 'Team', route: '/dashboard/managerteams', icon: 'fas fa-users' },
        { label: 'Attendance', route: '/dashboard/managerattendance', icon: 'fas fa-clock' },
        { label: 'Leave', route: '/dashboard/managerleave', icon: 'fas fa-calendar-alt' },
        { label: 'Timesheet', route: '/dashboard/managertimesheet', icon: 'fas fa-tasks' },
        { label: 'Salary & Payroll', route: '/dashboard/managersalarypayroll', icon: 'fas fa-coins' },
        // { label: 'Performance', route: '/dashboard/teamperformance', icon: 'fas fa-arrow-trend-up' },
      ],
      HR: [
        { label: 'Dashboard', route: '/dashboard/hrdashboard', icon: 'fas fa-chart-line' },
        { label: 'Employees', route: '/dashboard/hremployees', icon: 'fas fa-users' },
        { label: 'Leaves', route: '/dashboard/hrleave', icon: 'fas fa-calendar-alt' },
        { label: 'Attendance', route: '/dashboard/hrattendance', icon: 'fas fa-clock' },
        { label: 'Payroll', route: '/dashboard/hrpayroll', icon: 'fas fa-coins' },
        { label: 'Recruitment', route: '/dashboard/hrRecruitment', icon: 'fas fa-bullhorn' },
      ],
      Admin: [
        { label: 'Dashboard', route: '/dashboard/admindashboard', icon: 'fas fa-chart-line' },
        { label: 'Attendance', route: '/dashboard/attendancemanagement', icon: 'fas fa-clock' },
        { label: 'Leave Management', route: '/dashboard/leavemanagement', icon: 'fas fa-calendar-alt' },
        { label: 'User Management', route: '/dashboard/usermanagement', icon: 'fas fa-users' },
        { label: 'Payroll Management', route: '/dashboard/payrollmanagement', icon: 'fas fa-coins' },
        { label: 'Recruitment Management', route: '/dashboard/recruitmentmanagement', icon: 'fas fa-bullhorn' },
      ],
    };
    return menus[role] || [{ label: 'Dashboard', route: '/dashboard', icon: 'fas fa-tachometer-alt' }];
  });

  trackByRoute(index: number, item: any) {
    return item.route;
  }

  logout() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    setTimeout(() => {
      this.auth.Logout();
      this.userService.logout(this.userId()).subscribe()
      this.router.navigate(['/login']);
      this.isLoggingOut = false;
    }, 1500);
  }
}
