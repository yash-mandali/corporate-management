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

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'login',
        component:Login
    },
    {
        path: 'signup',
        component: Signup
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
                canActivate: [authGuard],
            },
            {
                path: 'Leavepage',
                component: ApplyLeave,
                canActivate: [authGuard],
            },
            {
                path: 'newleave',
                component: Newleavepage,
                canActivate: [authGuard],
            },
            {
                path: 'myprofile',
                component:MyProfile,
                canActivate: [authGuard],
            },
            {
                path: 'Attendance',
                component: AttendancePage,
                canActivate: [authGuard],
            },
        ]
    },

    {
        path: '**',
        component: Login
    }
];
