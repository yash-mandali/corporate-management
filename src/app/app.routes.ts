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
import {Timesheetpage } from './pages/timesheetpage/timesheetpage';
import { ManagerDashboard } from './manager_pages/managerdashboard/managerdashboard';
import { roleGuard } from './guards/role-guard/roleguard-guard';
import { guestGuard } from './guards/guest-guard/guest-guard';
import { ManagerAttendancePage } from './manager_pages/managerattendance/managerattendance';
import { ManagerLeavepage } from './manager_pages/managerleavepage/managerleavepage';
import { ManagerTimesheetpage } from './manager_pages/managertimesheet/managertimesheet';
import { Managerteampage } from './manager_pages/managerteamspage/managerteamspage';
import { Teamperformance } from './manager_pages/teamperformance/teamperformance';
import { Notfound } from './pages/notfound/notfound';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'login',
        component: Login,
        canActivate: [guestGuard]
    },
    {
        path: 'signup',
        component: Signup,
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
                component: Dashboardpage,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'Leavepage',
                component: ApplyLeave,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'newleave',
                component: Newleavepage,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'myprofile',
                component:MyProfile,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee','Manager'] }
            },
            {
                path: 'Attendance',
                component: AttendancePage,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'timesheet',
                component: Timesheetpage,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Employee'] }
            },
            {
                path: 'managerdashboard',
                component: ManagerDashboard,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'managerattendance',
                component: ManagerAttendancePage,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'managerleave',
                component:ManagerLeavepage ,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'managertimesheet',
                component: ManagerTimesheetpage,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'managerteams',
                component: Managerteampage,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
            {
                path: 'teamperformance',
                component: Teamperformance,
                canActivate: [authGuard, roleGuard],
                data: { roles: ['Manager'] }
            },
        ]
    },

    {
        path: '**',
        component: Notfound
    }
];
