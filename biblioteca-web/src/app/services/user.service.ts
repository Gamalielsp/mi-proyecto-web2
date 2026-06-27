import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = 'http://127.0.0.1:8000/users';

  private users: User[] = [];

  constructor(
    private http: HttpClient
  ) {}

  loadUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/`).pipe(
      tap(users => {
        this.users = users.map(user => ({
          ...user,
          password: '',
          isActive: user.isActive !== false
        }));
      })
    );
  }

  getUsers(): User[] {
    return this.users;
  }

  getActiveUsers(): User[] {
    return this.users.filter(user =>
      user.isActive !== false
    );
  }

  getUserByMatricula(matricula: string): User | undefined {
    return this.users.find(user =>
      user.matricula.toLowerCase() === matricula.toLowerCase()
    );
  }

  getDefaultUserByRole(role: string): User | undefined {
    if (role === 'alumno') {
      return this.users.find(user =>
        user.role === 'Alumno' &&
        user.isActive !== false
      );
    }

    if (role === 'profesor') {
      return this.users.find(user =>
        user.role === 'Profesor' &&
        user.isActive !== false
      );
    }

    return this.users.find(user =>
      user.role === 'Bibliotecario' &&
      user.isActive !== false
    );
  }

  addUser(user: User): Observable<User> {
    return this.http.post<{ message: string; user: User }>(
      `${this.apiUrl}/`,
      {
        name: user.name,
        matricula: user.matricula,
        career: user.career,
        role: user.role,
        email: user.email,
        password: user.password
      }
    ).pipe(
      map(response => ({
        ...response.user,
        password: '',
        isActive: response.user.isActive !== false
      })),
      tap(createdUser => {
        this.users.push(createdUser);
      })
    );
  }

  updateUser(updatedUser: User): Observable<User> {
    return this.http.put<{ message: string; user: User }>(
      `${this.apiUrl}/${updatedUser.id}`,
      {
        name: updatedUser.name,
        matricula: updatedUser.matricula,
        career: updatedUser.career,
        role: updatedUser.role,
        email: updatedUser.email,
        isActive: updatedUser.isActive !== false
      }
    ).pipe(
      map(response => ({
        ...response.user,
        password: '',
        isActive: response.user.isActive !== false
      })),
      tap(userFromApi => {
        this.users = this.users.map(user =>
          user.id === userFromApi.id
            ? userFromApi
            : user
        );
      })
    );
  }

  resetPassword(userId: number, newPassword: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${userId}/reset-password`,
      {
        password: newPassword
      }
    );
  }

  deactivateUser(userId: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${userId}/deactivate`,
      {}
    ).pipe(
      tap(() => {
        this.users = this.users.map(user =>
          user.id === userId
            ? { ...user, isActive: false }
            : user
        );
      })
    );
  }

  activateUser(userId: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${userId}/activate`,
      {}
    ).pipe(
      tap(() => {
        this.users = this.users.map(user =>
          user.id === userId
            ? { ...user, isActive: true }
            : user
        );
      })
    );
  }

  deleteUser(userId: number): Observable<any> {
    return this.deactivateUser(userId);
  }
}