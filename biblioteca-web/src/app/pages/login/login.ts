import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  matricula: string = '';
  password: string = '';
  role: string = 'alumno';
  dark: boolean = false;

  roles = [
    { value: 'alumno', label: 'Alumno' },
    { value: 'profesor', label: 'Profesor' },
    { value: 'bibliotecario', label: 'Bibliotecario' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      this.dark = true;
      document.documentElement.classList.add('dark');
    }
  }

  toggleTheme(): void {
    this.dark = !this.dark;

    if (this.dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  login(): void {
    const identifier = this.matricula.trim();
    const password = this.password.trim();

    if (!identifier || !password) {
      alert('Ingresa tu matrícula/correo y contraseña.');
      return;
    }

    this.authService.login({
      identifier,
      password
    }).subscribe({
      next: response => {
        this.authService.saveSession(response);

        const currentUser = JSON.parse(
          localStorage.getItem('currentUser') || '{}'
        );

        if (currentUser.role !== this.role) {
          this.authService.logout();
          alert('El usuario no corresponde al tipo de acceso seleccionado.');
          return;
        }

        if (currentUser.role === 'bibliotecario') {
          this.router.navigate(['/librarian-dashboard']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => {
        alert('Matrícula/correo o contraseña incorrectos.');
      }
    });
  }
}