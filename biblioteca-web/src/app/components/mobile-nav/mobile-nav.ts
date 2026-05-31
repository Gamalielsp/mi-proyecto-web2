import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

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
export class MobileNavComponent {

  role = localStorage.getItem('userRole') || 'alumno';

  constructor(private router: Router) {}

  get isLibrarian(): boolean {
    return this.role === 'bibliotecario';
  }

  logout(): void {
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }
}
