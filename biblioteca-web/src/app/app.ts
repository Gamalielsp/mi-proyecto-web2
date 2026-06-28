import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterOutlet
} from '@angular/router';

import { CommonModule } from '@angular/common';

import {
  filter,
  Observable,
  Subscription
} from 'rxjs';

import {
  UiConfirmRequest,
  UiFeedbackService,
  UiToast
} from './services/ui-feedback.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit, OnDestroy {

  isLoginPage = false;

  toasts$: Observable<UiToast[]>;
  confirm$: Observable<UiConfirmRequest | null>;

  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private uiFeedback: UiFeedbackService
  ) {
    this.toasts$ = this.uiFeedback.toasts$;
    this.confirm$ = this.uiFeedback.confirm$;

    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.isLoginPage =
          event.urlAfterRedirects === '/login';
      });
  }

  ngOnInit(): void {
    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  closeToast(id: number): void {
    this.uiFeedback.closeToast(id);
  }

  respondToConfirm(value: boolean): void {
    this.uiFeedback.respondToConfirm(value);
  }
}