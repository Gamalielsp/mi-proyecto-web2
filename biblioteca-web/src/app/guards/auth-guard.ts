import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);

  const role = localStorage.getItem('userRole');

  if (role) {
    return true;
  }

  router.navigate(['/login']);

  return false;
};
