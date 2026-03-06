import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { DashboardLayout } from './Layout/dashboard-layout/dashboard-layout';
import { authGuard } from './guards/auth-guard';
import { Dashboard } from './pages/dashboard/dashboard';
import { ApplyLeave } from './pages/apply-leave/apply-leave';
import { Newleavepage } from './pages/newleavepage/newleavepage';

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
    {
        path: 'dashboard',
        component: DashboardLayout,
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboardpage',
                component: Dashboard,
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
        ]
    },

    {
        path: '**',
        component: Login
    }
];
