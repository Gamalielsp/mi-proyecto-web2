import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);

  const token = localStorage.getItem('accessToken');
  const currentUser = localStorage.getItem('currentUser');
  const role = localStorage.getItem('userRole');

  if (token && currentUser && role) {
    return true;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');

  router.navigate(['/login']);

  return false;
};