import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route) => {

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

  let currentUser: any;

  try {
    currentUser = JSON.parse(currentUserRaw);
  } catch {
    clearSession();

    router.navigateByUrl('/login', {
      replaceUrl: true
    });

    return false;
  }

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

  const allowedRoles = route.data?.['roles'] as string[] | undefined;

  if (!allowedRoles || allowedRoles.includes(userRole)) {
    return true;
  }

  redirectByRole(router, userRole);

  return false;
};

function redirectByRole(
  router: Router,
  role: string
): void {
  if (role === 'bibliotecario') {
    router.navigateByUrl('/librarian-dashboard', {
      replaceUrl: true
    });

    return;
  }

  if (role === 'alumno' || role === 'profesor') {
    router.navigateByUrl('/dashboard', {
      replaceUrl: true
    });

    return;
  }

  clearSession();

  router.navigateByUrl('/login', {
    replaceUrl: true
  });
}

function clearSession(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');
}