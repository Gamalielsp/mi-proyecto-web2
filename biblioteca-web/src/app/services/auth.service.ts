import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  matricula: string;
  career: string;
  role: 'Alumno' | 'Profesor' | 'Bibliotecario';
  email: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'https://biblioteca-api-zppt.onrender.com';

  constructor(
    private http: HttpClient
  ) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/auth/login`,
      data
    );
  }

  saveSession(response: LoginResponse): void {
    const normalizedRole = this.normalizeRole(response.user.role);

    const currentUser = {
      id: response.user.id,
      name: response.user.name,
      matricula: response.user.matricula,
      role: normalizedRole,
      career: response.user.career,
      email: response.user.email
    };

    localStorage.setItem(
      'accessToken',
      response.accessToken
    );

    localStorage.setItem(
      'currentUser',
      JSON.stringify(currentUser)
    );

    localStorage.setItem(
      'userRole',
      normalizedRole
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
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
