import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { Firstpage } from './pages/firstpage/firstpage';
import { authGuard } from './guards/auth-guard';

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
        path: 'first',
        component: Firstpage,
        canActivate: [authGuard]
    },
    {
        path: '**',
        component: Login
    }
];
