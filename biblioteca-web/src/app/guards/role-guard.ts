import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);

  const userRole = localStorage.getItem('userRole');

  const allowedRoles = route.data?.['roles'] as string[];

  if (!userRole) {
    router.navigate(['/login']);
    return false;
  }

  if (!allowedRoles) {
    return true;
  }

  if (allowedRoles.includes(userRole)) {
    return true;
  }

  if (userRole === 'bibliotecario') {
    router.navigate(['/inventory']);
  } else {
    router.navigate(['/dashboard']);
  }

  return false;
};
