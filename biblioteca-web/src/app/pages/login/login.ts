import {
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { UiFeedbackService } from '../../services/ui-feedback.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {

  matricula: string = '';
  password: string = '';
  role: string = 'alumno';
  dark: boolean = false;

  roles = [
    {
      value: 'alumno',
      label: 'Alumno'
    },
    {
      value: 'profesor',
      label: 'Profesor'
    },
    {
      value: 'bibliotecario',
      label: 'Bibliotecario'
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private uiFeedback: UiFeedbackService
  ) {
    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      this.dark = true;
      document.documentElement.classList.add('dark');
    } else {
      this.dark = false;
      document.documentElement.classList.remove('dark');
    }
  }

  ngOnInit(): void {
    this.redirectIfAlreadyLoggedIn();
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
      this.uiFeedback.warning(
        'Ingresa tu matrícula/correo y contraseña.',
        'Campos incompletos'
      );
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

          this.uiFeedback.error(
            'El usuario no corresponde al tipo de acceso seleccionado.',
            'Tipo de acceso incorrecto'
          );

          return;
        }

        this.goToHomeByRole(currentUser.role);
      },
      error: () => {
        this.authService.logout();

        this.uiFeedback.error(
          'Matrícula/correo o contraseña incorrectos.',
          'No se pudo iniciar sesión'
        );
      }
    });
  }

  private redirectIfAlreadyLoggedIn(): void {
    const token = localStorage.getItem('accessToken');
    const currentUserRaw = localStorage.getItem('currentUser');
    const userRole = localStorage.getItem('userRole');

    if (!token || !currentUserRaw || !userRole) {
      return;
    }

    try {
      const currentUser = JSON.parse(currentUserRaw);

      if (!currentUser?.role) {
        this.authService.logout();
        return;
      }

      this.goToHomeByRole(currentUser.role);
    } catch {
      this.authService.logout();
    }
  }

  private goToHomeByRole(role: string): void {
    if (role === 'bibliotecario') {
      this.router.navigateByUrl(
        '/librarian-dashboard',
        {
          replaceUrl: true
        }
      );
      return;
    }

    if (role === 'alumno' || role === 'profesor') {
      this.router.navigateByUrl(
        '/dashboard',
        {
          replaceUrl: true
        }
      );
      return;
    }

    this.authService.logout();

    this.router.navigateByUrl(
      '/login',
      {
        replaceUrl: true
      }
    );
  }
}