import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Book } from '../../models/book.model';
import { User } from '../../models/user.model';

import { BookService } from '../../services/book.service';
import { UserService } from '../../services/user.service';
import { WaitlistService } from '../../services/waitlist.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

type UserRole = 'Alumno' | 'Profesor' | 'Bibliotecario';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MobileNavComponent
  ],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class InventoryComponent {

  search = '';
  activeTab = 'books';

  showBookModal = false;
  showUserModal = false;
  showEditBookModal = false;
  showEditUserModal = false;

  selectedBook: Book | null = null;
  selectedUser: User | null = null;

  careers = [
    'Ingeniería en Computación',
    'Ingeniería en Diseño',
    'Ingeniería en Energías Renovables',
    'Ingeniería en Petróleos',
    'Ingeniería Química',
    'Ingeniería Industrial',
    'Licenciatura en Matemáticas Aplicadas'
  ];

  books: Book[] = [];
  users: User[] = [];

  newBook = {
    title: '',
    author: '',
    career: '',
    isbn: '',
    stock: 1,
    libraryStock: 1,
    cover: ''
  };

  editBook = {
    id: 0,
    title: '',
    author: '',
    career: '',
    isbn: '',
    stock: 0,
    libraryStock: 0,
    totalCopies: 0,
    cover: ''
  };

  newUser = {
    name: '',
    matricula: '',
    career: '',
    role: 'Alumno' as UserRole,
    email: '',
    password: ''
  };

  editUser = {
    id: 0,
    name: '',
    matricula: '',
    career: '',
    role: 'Alumno' as UserRole,
    email: ''
  };

  constructor(
    private bookService: BookService,
    private userService: UserService,
    private waitlistService: WaitlistService
  ) {
    this.books = this.bookService.getBooks();
    this.users = this.userService.getUsers();
  }

  get filteredBooks(): Book[] {
    return this.books.filter(book =>
      book.title.toLowerCase().includes(this.search.toLowerCase()) ||
      book.author.toLowerCase().includes(this.search.toLowerCase()) ||
      book.career.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  get filteredUsers(): User[] {
    return this.users.filter(user =>
      user.name.toLowerCase().includes(this.search.toLowerCase()) ||
      user.matricula.toLowerCase().includes(this.search.toLowerCase()) ||
      user.career.toLowerCase().includes(this.search.toLowerCase()) ||
      user.role.toLowerCase().includes(this.search.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(this.search.toLowerCase())
    );
  }

  get newUserControlLabel(): string {
    return this.newUser.role === 'Alumno'
      ? 'Matrícula'
      : 'Número de control';
  }

  get editUserControlLabel(): string {
    return this.editUser.role === 'Alumno'
      ? 'Matrícula'
      : 'Número de control';
  }

  get newUserCareerLabel(): string {
    return this.newUser.role === 'Profesor'
      ? 'Carrera adscrita'
      : 'Carrera';
  }

  get editUserCareerLabel(): string {
    return this.editUser.role === 'Profesor'
      ? 'Carrera adscrita'
      : 'Carrera';
  }

  get showNewUserCareer(): boolean {
    return this.newUser.role !== 'Bibliotecario';
  }

  get showEditUserCareer(): boolean {
    return this.editUser.role !== 'Bibliotecario';
  }

  openAddUser(): void {
    this.newUser = {
      name: '',
      matricula: '',
      career: '',
      role: 'Alumno',
      email: '',
      password: ''
    };

    this.showUserModal = true;
  }

  setNewUserRole(role: UserRole): void {
    this.newUser.role = role;

    if (role === 'Bibliotecario') {
      this.newUser.career = 'Biblioteca';
    } else {
      this.newUser.career = '';
    }
  }

  addBook(): void {
    const loanCopies = Number(this.newBook.stock);
    const libraryCopies = Number(this.newBook.libraryStock);

    if (loanCopies < 0 || libraryCopies < 0) {
      alert('Los ejemplares no pueden ser negativos.');
      return;
    }

    if (loanCopies > libraryCopies) {
      alert('Los ejemplares para préstamo no pueden ser mayores que los ejemplares disponibles en biblioteca.');
      return;
    }

    const book: Book = {
      id: Date.now(),
      title: this.newBook.title,
      author: this.newBook.author,
      career: this.newBook.career,
      stock: loanCopies,
      libraryStock: libraryCopies,
      totalCopies: libraryCopies,
      isbn: this.newBook.isbn,
      cover:
        this.newBook.cover.trim() ||
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=300&fit=crop'
    };

    this.bookService.addBook(book);
    this.books = this.bookService.getBooks();

    if (book.stock > 0) {
      this.waitlistService.notifyNextUser(book.id);
    }

    this.newBook = {
      title: '',
      author: '',
      career: '',
      isbn: '',
      stock: 1,
      libraryStock: 1,
      cover: ''
    };

    this.showBookModal = false;
  }

  openEditBook(book: Book): void {
    this.selectedBook = book;

    const libraryStock = book.libraryStock ?? book.totalCopies ?? book.stock;

    this.editBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      career: book.career,
      isbn: book.isbn || '',
      stock: book.stock,
      libraryStock,
      totalCopies: libraryStock,
      cover: book.cover || ''
    };

    this.showEditBookModal = true;
  }

  updateBook(): void {
    const loanCopies = Number(this.editBook.stock);
    const libraryCopies = Number(this.editBook.libraryStock);

    if (loanCopies < 0 || libraryCopies < 0) {
      alert('Los ejemplares no pueden ser negativos.');
      return;
    }

    if (loanCopies > libraryCopies) {
      alert('Los ejemplares para préstamo no pueden ser mayores que los ejemplares disponibles en biblioteca.');
      return;
    }

    const updatedBook: Book = {
      id: this.editBook.id,
      title: this.editBook.title,
      author: this.editBook.author,
      career: this.editBook.career,
      isbn: this.editBook.isbn,
      stock: loanCopies,
      libraryStock: libraryCopies,
      totalCopies: libraryCopies,
      cover:
        this.editBook.cover.trim() ||
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=300&fit=crop'
    };

    this.bookService.updateBook(updatedBook);
    this.books = this.bookService.getBooks();

    if (updatedBook.stock > 0) {
      this.waitlistService.notifyNextUser(updatedBook.id);
    }

    this.showEditBookModal = false;
    this.selectedBook = null;
  }

  deleteBook(book: Book): void {
    const confirmDelete = confirm(
      `¿Seguro que deseas eliminar el libro "${book.title}"?`
    );

    if (!confirmDelete) {
      return;
    }

    this.bookService.deleteBook(book.id);
    this.books = this.bookService.getBooks();
  }

  addUser(): void {
    if (!this.newUser.name.trim()) {
      alert('Ingresa el nombre completo.');
      return;
    }

    if (!this.newUser.matricula.trim()) {
      alert('Ingresa la matrícula o número de control.');
      return;
    }

    if (this.newUser.role !== 'Bibliotecario' && !this.newUser.career) {
      alert('Selecciona la carrera.');
      return;
    }

    if (!this.newUser.email.trim()) {
      alert('Ingresa el correo institucional.');
      return;
    }

    if (!this.newUser.password || this.newUser.password.trim().length < 4) {
      alert('La contraseña inicial debe tener al menos 4 caracteres.');
      return;
    }

    const exists = this.users.some(user =>
      user.matricula.toLowerCase() === this.newUser.matricula.trim().toLowerCase()
    );

    if (exists) {
      alert('Ya existe un usuario con esa matrícula o número de control.');
      return;
    }

    const user: User = {
      id: Date.now(),
      name: this.newUser.name.trim(),
      matricula: this.newUser.matricula.trim(),
      career: this.newUser.role === 'Bibliotecario'
        ? 'Biblioteca'
        : this.newUser.career,
      role: this.newUser.role,
      activeLoans: 0,
      email: this.newUser.email.trim(),
      password: this.newUser.password.trim()
    };

    this.userService.addUser(user);
    this.users = this.userService.getUsers();

    this.newUser = {
      name: '',
      matricula: '',
      career: '',
      role: 'Alumno',
      email: '',
      password: ''
    };

    this.showUserModal = false;
  }

  openEditUser(user: User): void {
    this.selectedUser = user;

    this.editUser = {
      id: user.id,
      name: user.name,
      matricula: user.matricula,
      career: user.career,
      role: user.role,
      email: user.email || ''
    };

    this.showEditUserModal = true;
  }

  updateUser(): void {
    const currentUser = this.users.find(
      user => user.id === this.editUser.id
    );

    if (!currentUser) {
      return;
    }

    if (!this.editUser.name.trim()) {
      alert('Ingresa el nombre completo.');
      return;
    }

    if (!this.editUser.matricula.trim()) {
      alert('Ingresa la matrícula o número de control.');
      return;
    }

    if (currentUser.role !== 'Bibliotecario' && !this.editUser.career) {
      alert('Selecciona la carrera.');
      return;
    }

    if (!this.editUser.email.trim()) {
      alert('Ingresa el correo institucional.');
      return;
    }

    const duplicated = this.users.some(user =>
      user.id !== this.editUser.id &&
      user.matricula.toLowerCase() === this.editUser.matricula.trim().toLowerCase()
    );

    if (duplicated) {
      alert('Ya existe otro usuario con esa matrícula o número de control.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      name: this.editUser.name.trim(),
      matricula: this.editUser.matricula.trim(),
      career: currentUser.role === 'Bibliotecario'
        ? 'Biblioteca'
        : this.editUser.career,
      role: currentUser.role,
      email: this.editUser.email.trim()
    };

    this.userService.updateUser(updatedUser);
    this.users = this.userService.getUsers();

    this.showEditUserModal = false;
    this.selectedUser = null;
  }

  resetUserPassword(): void {
    if (!this.selectedUser) {
      return;
    }

    const newPassword = prompt(
      `Nueva contraseña para ${this.selectedUser.name}:`
    );

    if (!newPassword || newPassword.trim().length < 4) {
      alert('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    this.userService.resetPassword(
      this.selectedUser.id,
      newPassword.trim()
    );

    this.users = this.userService.getUsers();

    alert('Contraseña restablecida correctamente.');
  }

  deleteUser(user: User): void {
    const confirmDelete = confirm(
      `¿Seguro que deseas eliminar al usuario "${user.name}"?`
    );

    if (!confirmDelete) {
      return;
    }

    this.userService.deleteUser(user.id);
    this.users = this.userService.getUsers();
  }
}