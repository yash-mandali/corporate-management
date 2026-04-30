import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { DashboardLayout } from './Layout/dashboard-layout/dashboard-layout';
import { authGuard } from './guards/auth-guard';
import { ApplyLeave } from './pages/apply-leave/apply-leave';
import { Newleavepage } from './pages/newleavepage/newleavepage';
import { MyProfile } from './pages/myprofile/myprofile';
import { AttendancePage } from './pages/attendance-page/attendance-page';
import { Dashboardpage } from './pages/dashboard/dashboard';
import { Timesheetpage } from './pages/timesheetpage/timesheetpage';
import { ManagerDashboard } from './manager_pages/managerdashboard/managerdashboard';
import { roleGuard } from './guards/role-guard/roleguard-guard';
import { guestGuard } from './guards/guest-guard/guest-guard';
import { ManagerAttendancePage } from './manager_pages/managerattendance/managerattendance';
import { ManagerLeavepage } from './manager_pages/managerleavepage/managerleavepage';
import { ManagerTimesheetpage } from './manager_pages/managertimesheet/managertimesheet';
import { Managerteampage } from './manager_pages/managerteamspage/managerteamspage';
import { Teamperformance } from './manager_pages/teamperformance/teamperformance';
import { Notfound } from './pages/notfound/notfound';
import { HrDashboard } from './hr_pages/hr-dashboard/hr-dashboard';
import { HrEmployeesPage } from './hr_pages/hr-employees/hr-employees';
import { HrLeavePage } from './hr_pages/hr-leave/hr-leave';
import { HrAttendancePage } from './hr_pages/hr-attendance/hr-attendance';
import { HrPayroll } from './hr_pages/hr-payroll/hr-payroll';
import { HrRecruitment } from './hr_pages/hr_recruitment/hr-recruitment/hr-recruitment';
import { AdminDashboard } from './Admin_Pages/admin-dashboard/admin-dashboard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'login',
        loadComponent: () =>
            import('./components/login/login').then(m => m.Login),
        canActivate: [guestGuard]
    },
    {
        path: 'signup',
        loadComponent: () =>
            import('./components/signup/signup').then(m => m.Signup),
        canActivate: [guestGuard]
    },
    { path: 'dashboard', redirectTo: 'dashboard/dashboardpage', pathMatch: 'full' },
    {
        path: 'dashboard',
        component: DashboardLayout,
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboardpage',
                loadComponent: () =>
                    import('./pages/dashboard/dashboard').then(m => m.Dashboardpage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'leavepage',
                loadComponent: () =>
                    import('./pages/apply-leave/apply-leave').then(m => m.ApplyLeave),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'newleave',
                loadComponent: () =>
                    import('./pages/newleavepage/newleavepage').then(m => m.Newleavepage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'myprofile',
                loadComponent: () =>
                    import('./pages/myprofile/myprofile').then(m => m.MyProfile),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee', 'Manager', 'HR', 'Admin'] }
            },
            {
                path: 'attendance',
                loadComponent: () =>
                    import('./pages/attendance-page/attendance-page').then(m => m.AttendancePage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'timesheet',
                loadComponent: () =>
                    import('./pages/timesheetpage/timesheetpage').then(m => m.Timesheetpage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'managerdashboard',
                loadComponent: () =>
                    import('./manager_pages/managerdashboard/managerdashboard').then(m => m.ManagerDashboard),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'managerattendance',
                loadComponent: () =>
                    import('./manager_pages/managerattendance/managerattendance').then(m => m.ManagerAttendancePage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'managerleave',
                loadComponent: () =>
                    import('./manager_pages/managerleavepage/managerleavepage').then(m => m.ManagerLeavepage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'managertimesheet',
                loadComponent: () =>
                    import('./manager_pages/managertimesheet/managertimesheet').then(m => m.ManagerTimesheetpage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'managerteams',
                loadComponent: () =>
                    import('./manager_pages/managerteamspage/managerteamspage').then(m => m.Managerteampage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'teamperformance',
                loadComponent: () =>
                    import('./manager_pages/teamperformance/teamperformance').then(m => m.Teamperformance),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'hrdashboard',
                loadComponent: () =>
                    import('./hr_pages/hr-dashboard/hr-dashboard').then(m => m.HrDashboard),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['HR'] }
            },
            {
                path: 'hremployees',
                loadComponent: () =>
                    import('./hr_pages/hr-employees/hr-employees').then(m => m.HrEmployeesPage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['HR'] }
            },
            {
                path: 'hrleave',
                loadComponent: () =>
                    import('./hr_pages/hr-leave/hr-leave').then(m => m.HrLeavePage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['HR'] }
            },
            {
                path: 'hrattendance',
                loadComponent: () =>
                    import('./hr_pages/hr-attendance/hr-attendance').then(m => m.HrAttendancePage),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['HR'] }
            },
            {
                path: 'hrpayroll',
                loadComponent: () =>
                    import('./hr_pages/hr-payroll/hr-payroll').then(m => m.HrPayroll),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['HR'] }
            },
            {
                path: 'hrRecruitment',
                loadComponent: () =>
                    import('./hr_pages/hr_recruitment/hr-recruitment/hr-recruitment').then(m => m.HrRecruitment),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['HR'] }
            },
            {
                path: 'admindashboard',
                loadComponent: () =>
                    import('./Admin_Pages/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Admin'] }
            },
            {
                path: 'usermanagement',
                loadComponent: () =>
                    import('./Admin_Pages/admin-user-management/admin-user-management').then(m => m.AdminUserManagement),
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Admin'] }
            },
        ]
    },
    {
        path: '**',
        component: Notfound
    }
];
