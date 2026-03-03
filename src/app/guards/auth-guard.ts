import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Authservice } from '../services/Auth-service/authservice';

export const authGuard: CanActivateFn = (route, state) => {
  
  const router = inject(Router);
  const auth = inject(Authservice);

  // const token = localStorage.getItem('token');
  if (auth.isloggedin()) {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};
