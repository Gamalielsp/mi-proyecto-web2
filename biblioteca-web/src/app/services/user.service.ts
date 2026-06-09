import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private storageKey = 'users';

  private defaultUsers: User[] = [];

  private users: User[] = [];

  constructor() {
    const savedUsers = localStorage.getItem(this.storageKey);

    if (savedUsers) {
      this.users = JSON.parse(savedUsers);
    } else {
      this.users = this.defaultUsers;
      this.saveUsers();
    }
  }

  private saveUsers(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.users)
    );
  }

  getUsers(): User[] {
    return this.users;
  }

  getUserByMatricula(matricula: string): User | undefined {
    return this.users.find(
      user => user.matricula === matricula
    );
  }

  getDefaultUserByRole(role: string): User | undefined {
    if (role === 'alumno') {
      return this.users.find(user => user.role === 'Alumno');
    }

    if (role === 'profesor') {
      return this.users.find(user => user.role === 'Profesor');
    }

    return this.users.find(user => user.role === 'Bibliotecario');
  }

  addUser(user: User): void {
    this.users.push(user);
    this.saveUsers();
  }

  updateUser(updatedUser: User): void {
    this.users = this.users.map(user =>
      user.id === updatedUser.id
        ? updatedUser
        : user
    );

    this.saveUsers();
  }

  resetPassword(userId: number, newPassword: string): void {
    this.users = this.users.map(user =>
      user.id === userId
        ? { ...user, password: newPassword }
        : user
    );

    this.saveUsers();
  }

  deleteUser(userId: number): void {
    this.users = this.users.filter(user =>
      user.id !== userId
    );

    this.saveUsers();
  }

  login(identifier: string, password: string): User | null {
    const normalizedIdentifier = identifier.toLowerCase().trim();

    return this.users.find(user =>
      (
        user.matricula.toLowerCase() === normalizedIdentifier ||
        (user.email || '').toLowerCase() === normalizedIdentifier
      ) &&
      user.password === password
    ) || null;
  }

}