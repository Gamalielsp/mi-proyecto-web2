import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.css'
})
export class MobileNavComponent implements AfterViewInit, OnDestroy {

  isLibrarian = false;

  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private elementRef: ElementRef<HTMLElement>
  ) {
    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    this.isLibrarian =
      currentUser?.role === 'bibliotecario';
  }

  ngAfterViewInit(): void {
    this.scrollActiveItemIntoView(false);

    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.scrollActiveItemIntoView(true);
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

logout(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');

  this.router.navigateByUrl(
    '/login',
    {
      replaceUrl: true
    }
  );
}

  private scrollActiveItemIntoView(smooth: boolean): void {
    setTimeout(() => {
      const nav = this.elementRef.nativeElement.querySelector(
        '.mobile-nav'
      ) as HTMLElement | null;

      if (!nav || !nav.classList.contains('many-items')) {
        return;
      }

      const activeItem = nav.querySelector(
        'a.active, a.router-link-active, a[aria-current="page"]'
      ) as HTMLElement | null;

      if (!activeItem) {
        return;
      }

      const navRect = nav.getBoundingClientRect();
      const activeRect = activeItem.getBoundingClientRect();

      const isOutside =
        activeRect.left < navRect.left + 16 ||
        activeRect.right > navRect.right - 16;

      if (isOutside) {
        activeItem.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 90);
  }
}