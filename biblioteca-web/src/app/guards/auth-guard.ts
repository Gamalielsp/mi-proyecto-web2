import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);

  const token = localStorage.getItem('accessToken');
  const currentUserRaw = localStorage.getItem('currentUser');
  const userRole = localStorage.getItem('userRole');

  if (!token || !currentUserRaw || !userRole) {
    clearSession();

    router.navigateByUrl('/login', {
      replaceUrl: true
    });

    return false;
  }

  try {
    const currentUser = JSON.parse(currentUserRaw);

    if (!currentUser?.role) {
      clearSession();

      router.navigateByUrl('/login', {
        replaceUrl: true
      });

      return false;
    }

    if (currentUser.role !== userRole) {
      clearSession();

      router.navigateByUrl('/login', {
        replaceUrl: true
      });

      return false;
    }

    return true;

  } catch {
    clearSession();

    router.navigateByUrl('/login', {
      replaceUrl: true
    });

    return false;
  }
};

function clearSession(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');
}