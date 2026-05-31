import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Book } from '../../models/book.model';
import { User } from '../../models/user.model';

import { BookService } from '../../services/book.service';
import { UserService } from '../../services/user.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

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
    'Ingeniería',
    'Sistemas',
    'Química',
    'Administración',
    'Biblioteca'
  ];

  books: Book[] = [];
  users: User[] = [];

  newBook = {
    title: '',
    author: '',
    career: '',
    isbn: '',
    stock: 1
  };

  editBook = {
    id: 0,
    title: '',
    author: '',
    career: '',
    isbn: '',
    stock: 0,
    totalCopies: 0,
    cover: ''
  };

  newUser = {
    name: '',
    matricula: '',
    career: '',
    role: 'Alumno' as 'Alumno' | 'Profesor' | 'Bibliotecario',
    email: ''
  };

  editUser = {
    id: 0,
    name: '',
    matricula: '',
    career: '',
    role: 'Alumno' as 'Alumno' | 'Profesor' | 'Bibliotecario',
    activeLoans: 0,
    email: ''
  };

  constructor(
    private bookService: BookService,
    private userService: UserService
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

  addBook(): void {
    const book: Book = {
      id: Date.now(),
      title: this.newBook.title,
      author: this.newBook.author,
      career: this.newBook.career,
      stock: Number(this.newBook.stock),
      totalCopies: Number(this.newBook.stock),
      isbn: this.newBook.isbn,
      cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=300&fit=crop'
    };

    this.bookService.addBook(book);
    this.books = this.bookService.getBooks();

    this.newBook = {
      title: '',
      author: '',
      career: '',
      isbn: '',
      stock: 1
    };

    this.showBookModal = false;
  }

  openEditBook(book: Book): void {
    this.selectedBook = book;

    this.editBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      career: book.career,
      isbn: book.isbn || '',
      stock: book.stock,
      totalCopies: book.totalCopies || book.stock,
      cover: book.cover || ''
    };

    this.showEditBookModal = true;
  }

  updateBook(): void {
    const updatedBook: Book = {
      id: this.editBook.id,
      title: this.editBook.title,
      author: this.editBook.author,
      career: this.editBook.career,
      isbn: this.editBook.isbn,
      stock: Number(this.editBook.stock),
      totalCopies: Number(this.editBook.totalCopies),
      cover: this.editBook.cover
    };

    this.bookService.updateBook(updatedBook);
    this.books = this.bookService.getBooks();

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
    const user: User = {
      id: Date.now(),
      name: this.newUser.name,
      matricula: this.newUser.matricula,
      career: this.newUser.career,
      role: this.newUser.role,
      activeLoans: 0,
      email: this.newUser.email
    };

    this.userService.addUser(user);
    this.users = this.userService.getUsers();

    this.newUser = {
      name: '',
      matricula: '',
      career: '',
      role: 'Alumno',
      email: ''
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
      activeLoans: user.activeLoans,
      email: user.email || ''
    };

    this.showEditUserModal = true;
  }

  updateUser(): void {
    const updatedUser: User = {
      id: this.editUser.id,
      name: this.editUser.name,
      matricula: this.editUser.matricula,
      career: this.editUser.career,
      role: this.editUser.role,
      activeLoans: Number(this.editUser.activeLoans),
      email: this.editUser.email
    };

    this.userService.updateUser(updatedUser);
    this.users = this.userService.getUsers();

    this.showEditUserModal = false;
    this.selectedUser = null;
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