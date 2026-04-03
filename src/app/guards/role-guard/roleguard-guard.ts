import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Authservice } from '../../services/Auth-service/authservice';
import { ToastService } from '../../services/toast-service/toast';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Authservice);
  const router = inject(Router);
  const toast = inject(ToastService)

  const expectedRoles = route.data?.['roles'] as string[] | undefined;
  const userRole = auth.getRole();

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  if (!userRole || (expectedRoles && !expectedRoles.includes(userRole))) {
    // toast.error("UnAuthorized Access");

    if (userRole === 'Employee') {
      router.navigate(['dashboard/dashboardpage']);
    } else if (userRole === 'Manager') {
      router.navigate(['/dashboard/managerdashboard']);
    } else if (userRole === 'HR') {
      router.navigate(['/dashboard/hrdashboard']);
    } else if (userRole === 'Admin') {
      router.navigate(['/dashboard/admindashboard']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }
  return true;
};
