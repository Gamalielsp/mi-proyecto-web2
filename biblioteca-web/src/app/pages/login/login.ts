import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

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
    private userService: UserService
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
    const user = this.userService.getUserByMatricula(
      this.matricula.trim()
    );

    if (!user) {
      alert('Usuario no encontrado. Verifica tu matrícula o número de control.');
      return;
    }

    if (!this.roleMatches(user)) {
      alert('El usuario no corresponde al tipo de acceso seleccionado.');
      return;
    }

    const currentUser = {
      id: user.id,
      name: user.name,
      matricula: user.matricula,
      role: this.normalizeRole(user.role),
      career: user.career,
      email: user.email || ''
    };

    localStorage.setItem(
      'currentUser',
      JSON.stringify(currentUser)
    );

    localStorage.setItem(
      'userRole',
      currentUser.role
    );

    if (currentUser.role === 'bibliotecario') {
      this.router.navigate(['/librarian-dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private roleMatches(user: User): boolean {
    return this.normalizeRole(user.role) === this.role;
  }

  private normalizeRole(
    role: 'Alumno' | 'Profesor' | 'Bibliotecario'
  ): string {
    if (role === 'Alumno') {
      return 'alumno';
    }

    if (role === 'Profesor') {
      return 'profesor';
    }

    return 'bibliotecario';
  }
}