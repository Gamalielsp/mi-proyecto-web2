import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.css'
})
export class MobileNavComponent implements AfterViewInit {

  @ViewChild('mobileNav')
  mobileNav!: ElementRef<HTMLDivElement>;

  currentUser = JSON.parse(
    localStorage.getItem('currentUser') || '{}'
  );

  constructor(
    private router: Router
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => this.centerActiveLink(), 50);
      });
  }

  get isLibrarian(): boolean {
    return this.currentUser?.role === 'bibliotecario';
  }

  get hasManyItems(): boolean {
    return true;
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.centerActiveLink(), 100);
  }

  private centerActiveLink(): void {
    const nav = this.mobileNav?.nativeElement;

    if (!nav) {
      return;
    }

    const activeLink =
      nav.querySelector('a.active') as HTMLElement;

    if (!activeLink) {
      nav.scrollLeft = 0;
      return;
    }

    const navWidth = nav.clientWidth;
    const linkLeft = activeLink.offsetLeft;
    const linkWidth = activeLink.offsetWidth;

    nav.scrollTo({
      left: linkLeft - navWidth / 2 + linkWidth / 2,
      behavior: 'smooth'
    });
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');

    this.router.navigate(['/login']);
  }
}