import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route) => {

  const router = inject(Router);

  const token = localStorage.getItem('accessToken');
  const currentUser = localStorage.getItem('currentUser');
  const userRole = localStorage.getItem('userRole');

  if (!token || !currentUser || !userRole) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');

    router.navigate(['/login']);

    return false;
  }

  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  if (!allowedRoles || allowedRoles.includes(userRole)) {
    return true;
  }

  if (userRole === 'bibliotecario') {
    router.navigate(['/librarian-dashboard']);
  } else {
    router.navigate(['/dashboard']);
  }

  return false;
};