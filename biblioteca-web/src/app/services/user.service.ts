import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private storageKey = 'users';

  private defaultUsers: User[] = [
    {
      id: 1,
      name: 'Carlos Mendoza',
      matricula: '20210145',
      career: 'Ingeniería',
      role: 'Alumno',
      activeLoans: 2,
      email: 'carlos.mendoza@universidad.edu.mx'
    },
    {
      id: 2,
      name: 'Ana López',
      matricula: '20200389',
      career: 'Química',
      role: 'Alumno',
      activeLoans: 1,
      email: 'ana.lopez@universidad.edu.mx'
    },
    {
      id: 3,
      name: 'Dr. Ricardo Fuentes',
      matricula: 'P-00234',
      career: 'Sistemas',
      role: 'Profesor',
      activeLoans: 3,
      email: 'r.fuentes@universidad.edu.mx'
    },
    {
      id: 4,
      name: 'María Rodríguez',
      matricula: 'BIB-001',
      career: 'Biblioteca',
      role: 'Bibliotecario',
      activeLoans: 0,
      email: 'biblioteca@universidad.edu.mx'
    }
  ];

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

  getUserByMatricula(
    matricula: string
  ): User | undefined {

    return this.users.find(
      user => user.matricula === matricula
    );

  }

  getDefaultUserByRole(
    role: string
  ): User | undefined {

    if (role === 'alumno') {

      return this.users.find(
        user => user.role === 'Alumno'
      );

    }

    if (role === 'profesor') {

      return this.users.find(
        user => user.role === 'Profesor'
      );

    }

    return this.users.find(
      user => user.role === 'Bibliotecario'
    );

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

  deleteUser(userId: number): void {

    this.users = this.users.filter(user =>
      user.id !== userId
    );

    this.saveUsers();

  }

}