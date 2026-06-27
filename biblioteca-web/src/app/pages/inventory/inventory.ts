import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { Book } from '../../models/book.model';
import { User } from '../../models/user.model';

import { BookService } from '../../services/book.service';
import { UserService } from '../../services/user.service';
import { WaitlistService } from '../../services/waitlist.service';
import { LoanService } from '../../services/loan.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

type UserRole = 'Alumno' | 'Profesor' | 'Bibliotecario';
type CreatableUserRole = 'Alumno' | 'Profesor';

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
export class InventoryComponent implements OnInit {

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
    role: 'Alumno' as CreatableUserRole,
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

  isLoading = false;
  loadError = false;

  constructor(
    private bookService: BookService,
    private userService: UserService,
    private waitlistService: WaitlistService,
    private loanService: LoanService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.loadError = false;

    forkJoin({
      books: this.bookService.loadBooks().pipe(
        catchError(error => {
          console.error('Error al cargar libros del inventario:', error);
          this.loadError = true;
          return of(this.bookService.getBooks());
        })
      ),

      users: this.userService.loadUsers().pipe(
        catchError(error => {
          console.error('Error al cargar usuarios del inventario:', error);
          this.loadError = true;
          return of(this.userService.getUsers());
        })
      )
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          this.books = response.books;
          this.users = response.users;
        },
        error: error => {
          console.error('Error general al cargar inventario:', error);
          this.books = this.bookService.getBooks();
          this.users = this.userService.getUsers();
          this.loadError = true;
        }
      });
  }

  private loadBooks(): void {
    this.bookService.loadBooks().pipe(
      catchError(error => {
        console.error('Error al recargar libros:', error);
        this.loadError = true;
        return of(this.bookService.getBooks());
      }),
      finalize(() => {
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: books => {
        this.books = books;
      },
      error: error => {
        console.error('Error general al recargar libros:', error);
        this.books = this.bookService.getBooks();
        this.loadError = true;
      }
    });
  }

  private loadUsers(): void {
    this.userService.loadUsers().pipe(
      catchError(error => {
        console.error('Error al recargar usuarios:', error);
        this.loadError = true;
        return of(this.userService.getUsers());
      }),
      finalize(() => {
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: users => {
        this.users = users;
      },
      error: error => {
        console.error('Error general al recargar usuarios:', error);
        this.users = this.userService.getUsers();
        this.loadError = true;
      }
    });
  }

  private isEmpty(value: any): boolean {
    return value === null ||
      value === undefined ||
      String(value).trim() === '';
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  get filteredBooks(): Book[] {
    const term = this.search.toLowerCase();

    return this.books.filter(book =>
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term) ||
      book.career.toLowerCase().includes(term) ||
      book.isbn.toLowerCase().includes(term)
    );
  }

  get filteredUsers(): User[] {
    const term = this.search.toLowerCase();

    return this.users.filter(user =>
      user.name.toLowerCase().includes(term) ||
      user.matricula.toLowerCase().includes(term) ||
      user.career.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term)
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

  setNewUserRole(role: CreatableUserRole): void {
    this.newUser.role = role;
    this.newUser.career = '';
  }

  addBook(): void {
    const title = this.newBook.title.trim();
    const author = this.newBook.author.trim();
    const career = this.newBook.career.trim();
    const isbn = this.newBook.isbn.trim();
    const cover = this.newBook.cover.trim();

    const loanCopies = Number(this.newBook.stock);
    const libraryCopies = Number(this.newBook.libraryStock);

    if (
      this.isEmpty(title) ||
      this.isEmpty(author) ||
      this.isEmpty(career) ||
      this.isEmpty(isbn) ||
      this.isEmpty(cover) ||
      this.isEmpty(this.newBook.stock) ||
      this.isEmpty(this.newBook.libraryStock)
    ) {
      alert('Todos los campos del libro son obligatorios.');
      return;
    }

    if (this.bookService.hasIsbnRegistered(isbn)) {
      alert('Ya existe un libro registrado con ese ISBN.');
      return;
    }

    if (isNaN(loanCopies) || isNaN(libraryCopies)) {
      alert('Los ejemplares deben ser números válidos.');
      return;
    }

    if (loanCopies < 0 || libraryCopies < 0) {
      alert('Los ejemplares no pueden ser negativos.');
      return;
    }

    if (libraryCopies <= 0) {
      alert('Los ejemplares disponibles en biblioteca deben ser mayores a 0.');
      return;
    }

    if (loanCopies > libraryCopies) {
      alert('Los ejemplares para préstamo no pueden ser mayores que los ejemplares disponibles en biblioteca.');
      return;
    }

    const book: Book = {
      id: Date.now(),
      title,
      author,
      career,
      stock: loanCopies,
      libraryStock: libraryCopies,
      totalCopies: libraryCopies,
      availableCopies: loanCopies,
      isbn,
      cover,
      isActive: true
    };

    this.bookService.addBook(book).subscribe({
      next: createdBook => {
        this.books = this.bookService.getBooks();

        if (createdBook.stock > 0) {
          this.waitlistService.notifyNextUser(createdBook.id);
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
        alert('Libro agregado correctamente.');
      },
      error: error => {
        alert(error?.error?.detail || 'No se pudo agregar el libro.');
      }
    });
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
    const currentBook = this.books.find(book =>
      book.id === this.editBook.id
    );

    if (!currentBook) {
      return;
    }

    const title = this.editBook.title.trim();
    const author = this.editBook.author.trim();
    const career = this.editBook.career.trim();
    const isbn = this.editBook.isbn.trim();
    const cover = this.editBook.cover.trim();

    const loanCopies = Number(this.editBook.stock);
    const libraryCopies = Number(this.editBook.libraryStock);

    if (
      this.isEmpty(title) ||
      this.isEmpty(author) ||
      this.isEmpty(career) ||
      this.isEmpty(isbn) ||
      this.isEmpty(cover) ||
      this.isEmpty(this.editBook.stock) ||
      this.isEmpty(this.editBook.libraryStock)
    ) {
      alert('Todos los campos del libro son obligatorios.');
      return;
    }

    if (this.bookService.hasIsbnRegistered(isbn, this.editBook.id)) {
      alert('Ya existe otro libro registrado con ese ISBN.');
      return;
    }

    if (isNaN(loanCopies) || isNaN(libraryCopies)) {
      alert('Los ejemplares deben ser números válidos.');
      return;
    }

    if (loanCopies < 0 || libraryCopies < 0) {
      alert('Los ejemplares no pueden ser negativos.');
      return;
    }

    if (libraryCopies <= 0) {
      alert('Los ejemplares disponibles en biblioteca deben ser mayores a 0.');
      return;
    }

    if (loanCopies > libraryCopies) {
      alert('Los ejemplares para préstamo no pueden ser mayores que los ejemplares disponibles en biblioteca.');
      return;
    }

    const updatedBook: Book = {
      ...currentBook,
      id: this.editBook.id,
      title,
      author,
      career,
      isbn,
      stock: loanCopies,
      libraryStock: libraryCopies,
      totalCopies: libraryCopies,
      availableCopies: loanCopies,
      cover,
      isActive: currentBook.isActive !== false
    };

    this.bookService.updateBook(updatedBook).subscribe({
      next: bookFromApi => {
        this.books = this.bookService.getBooks();

        if (bookFromApi.stock > 0) {
          this.waitlistService.notifyNextUser(bookFromApi.id);
        }

        this.showEditBookModal = false;
        this.selectedBook = null;
        alert('Libro actualizado correctamente.');
      },
      error: error => {
        alert(error?.error?.detail || 'No se pudo actualizar el libro.');
      }
    });
  }

  deleteBook(book: Book): void {
    if (book.isActive === false) {
      const confirmActivate = confirm(
        `¿Deseas reactivar el libro "${book.title}"?`
      );

      if (!confirmActivate) {
        return;
      }

      this.bookService.activateBook(book.id).subscribe({
        next: () => {
          this.books = this.bookService.getBooks();
          alert('Libro reactivado correctamente.');
        },
        error: () => {
          alert('No se pudo reactivar el libro.');
        }
      });

      return;
    }

    if (this.loanService.hasActiveLoansByBook(book.id)) {
      alert(
        'Este libro tiene préstamos activos.\n\n' +
        'No puede ser desactivado hasta que todos los préstamos sean devueltos.'
      );
      return;
    }

    const confirmDeactivate = confirm(
      `¿Seguro que deseas desactivar el libro "${book.title}"?\n\n` +
      'El libro conservará su historial, pero ya no estará disponible para nuevas reservas.'
    );

    if (!confirmDeactivate) {
      return;
    }

    this.bookService.deactivateBook(book.id).subscribe({
      next: () => {
        this.books = this.bookService.getBooks();
        alert('Libro desactivado correctamente.');
      },
      error: () => {
        alert('No se pudo desactivar el libro.');
      }
    });
  }

  addUser(): void {
    const name = this.newUser.name.trim();
    const matricula = this.newUser.matricula.trim();
    const email = this.newUser.email.trim();
    const password = this.newUser.password.trim();
    const career = this.newUser.career.trim();

    if (
      this.isEmpty(name) ||
      this.isEmpty(matricula) ||
      this.isEmpty(this.newUser.role) ||
      this.isEmpty(email) ||
      this.isEmpty(password) ||
      this.isEmpty(career)
    ) {
      alert('Todos los campos del usuario son obligatorios.');
      return;
    }

    if (!this.isValidEmail(email)) {
      alert('Ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 4) {
      alert('La contraseña inicial debe tener al menos 4 caracteres.');
      return;
    }

    const duplicatedMatricula = this.users.some(user =>
      user.matricula.toLowerCase() === matricula.toLowerCase()
    );

    if (duplicatedMatricula) {
      alert('Ya existe un usuario con esa matrícula o número de control.');
      return;
    }

    const duplicatedEmail = this.users.some(user =>
      (user.email || '').toLowerCase() === email.toLowerCase()
    );

    if (duplicatedEmail) {
      alert('Ya existe un usuario con ese correo electrónico.');
      return;
    }

    const user: User = {
      id: Date.now(),
      name,
      matricula,
      career,
      role: this.newUser.role,
      activeLoans: 0,
      email,
      password,
      isActive: true
    };

    this.userService.addUser(user).subscribe({
      next: () => {
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
        alert('Usuario agregado correctamente.');
      },
      error: error => {
        alert(error?.error?.detail || 'No se pudo agregar el usuario.');
      }
    });
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

    const name = this.editUser.name.trim();
    const matricula = this.editUser.matricula.trim();
    const email = this.editUser.email.trim();
    const career = currentUser.role === 'Bibliotecario'
      ? 'Biblioteca'
      : this.editUser.career.trim();

    if (
      this.isEmpty(name) ||
      this.isEmpty(matricula) ||
      this.isEmpty(email) ||
      this.isEmpty(career)
    ) {
      alert('Todos los campos del usuario son obligatorios.');
      return;
    }

    if (!this.isValidEmail(email)) {
      alert('Ingresa un correo electrónico válido.');
      return;
    }

    const duplicatedMatricula = this.users.some(user =>
      user.id !== this.editUser.id &&
      user.matricula.toLowerCase() === matricula.toLowerCase()
    );

    if (duplicatedMatricula) {
      alert('Ya existe otro usuario con esa matrícula o número de control.');
      return;
    }

    const duplicatedEmail = this.users.some(user =>
      user.id !== this.editUser.id &&
      (user.email || '').toLowerCase() === email.toLowerCase()
    );

    if (duplicatedEmail) {
      alert('Ya existe otro usuario con ese correo electrónico.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      name,
      matricula,
      career,
      role: currentUser.role,
      email,
      isActive: currentUser.isActive !== false
    };

    this.userService.updateUser(updatedUser).subscribe({
      next: () => {
        this.users = this.userService.getUsers();

        this.showEditUserModal = false;
        this.selectedUser = null;
        alert('Usuario actualizado correctamente.');
      },
      error: error => {
        alert(error?.error?.detail || 'No se pudo actualizar el usuario.');
      }
    });
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
    ).subscribe({
      next: () => {
        alert('Contraseña restablecida correctamente.');
      },
      error: error => {
        alert(error?.error?.detail || 'No se pudo restablecer la contraseña.');
      }
    });
  }

  deleteUser(user: User): void {
    if (user.isActive === false) {
      const confirmActivate = confirm(
        `¿Deseas reactivar al usuario "${user.name}"?`
      );

      if (!confirmActivate) {
        return;
      }

      this.userService.activateUser(user.id).subscribe({
        next: () => {
          this.users = this.userService.getUsers();
          alert('Usuario reactivado correctamente.');
        },
        error: error => {
          alert(error?.error?.detail || 'No se pudo reactivar el usuario.');
        }
      });

      return;
    }

    if (this.loanService.hasActiveLoansByUser(user.matricula)) {
      alert(
        'Este usuario tiene préstamos activos.\n\n' +
        'Debe devolver todos sus libros antes de ser desactivado.'
      );
      return;
    }

    const confirmDeactivate = confirm(
      `¿Seguro que deseas desactivar al usuario "${user.name}"?\n\n` +
      'El usuario conservará su historial, pero ya no podrá iniciar sesión.'
    );

    if (!confirmDeactivate) {
      return;
    }

    this.userService.deactivateUser(user.id).subscribe({
      next: () => {
        this.users = this.userService.getUsers();
        alert('Usuario desactivado correctamente.');
      },
      error: error => {
        alert(error?.error?.detail || 'No se pudo desactivar el usuario.');
      }
    });
  }
}