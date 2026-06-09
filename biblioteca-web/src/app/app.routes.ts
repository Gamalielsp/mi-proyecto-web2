import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { MyBooks } from './pages/my-books/my-books';
import { Profile } from './pages/profile/profile';
import { InventoryComponent } from './pages/inventory/inventory';
import { Alerts } from './pages/alerts/alerts';
import { Returns } from './pages/returns/returns';
import { Waitlists } from './pages/waitlists/waitlists';
import { LibrarianDashboard } from './pages/librarian-dashboard/librarian-dashboard';
import { Reservations } from './pages/reservations/reservations';
import { ActiveLoans } from './pages/active-loans/active-loans';

import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['alumno', 'profesor']
    }
  },

  {
    path: 'my-books',
    component: MyBooks,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['alumno', 'profesor']
    }
  },

  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['alumno', 'profesor']
    }
  },

  {
    path: 'librarian-dashboard',
    component: LibrarianDashboard,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['bibliotecario']
    }
  },

  {
    path: 'reservations',
    component: Reservations,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['bibliotecario']
    }
  },

  {
    path: 'active-loans',
    component: ActiveLoans,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['bibliotecario']
    }
  },

  {
    path: 'inventory',
    component: InventoryComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['bibliotecario']
    }
  },

  {
    path: 'alerts',
    component: Alerts,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['bibliotecario']
    }
  },

  {
    path: 'returns',
    component: Returns,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['bibliotecario']
    }
  },

  {
    path: 'waitlists',
    component: Waitlists,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['bibliotecario']
    }
  }
];