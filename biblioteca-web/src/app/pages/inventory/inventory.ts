import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
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
type ToastType = 'success' | 'error' | 'warning' | 'info';
type CareerDropdownTarget = 'newBook' | 'editBook' | 'newUser' | 'editUser';

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

  showConfirmationModal = false;
  showPasswordModal = false;

  selectedBook: Book | null = null;
  selectedUser: User | null = null;

  careerDropdownOpen: CareerDropdownTarget | null = null;

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

  confirmation = {
    title: '',
    message: '',
    icon: '⚠️',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    danger: false
  };

  private confirmationAction: (() => void) | null = null;

  toast = {
    visible: false,
    type: 'info' as ToastType,
    title: '',
    message: ''
  };

  private toastTimer: any = null;

  passwordValue = '';

  isLoading = false;
  loadError = false;

  isSavingBook = false;
  isSavingUser = false;
  isConfirmationProcessing = false;
  isResettingPassword = false;

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

  @HostListener('document:click')
  closeCareerDropdownFromDocument(): void {
    if (!this.careerDropdownOpen) {
      return;
    }

    this.careerDropdownOpen = null;
    this.forceViewUpdate();
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
          this.forceViewUpdate();
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
          this.forceViewUpdate();
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
        this.forceViewUpdate();
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
        this.forceViewUpdate();
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

  private forceViewUpdate(): void {
    this.changeDetectorRef.detectChanges();

    setTimeout(() => {
      this.changeDetectorRef.detectChanges();
    }, 0);
  }

  private isEmpty(value: any): boolean {
    return value === null ||
      value === undefined ||
      String(value).trim() === '';
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  toggleCareerDropdown(
    target: CareerDropdownTarget,
    event: MouseEvent
  ): void {
    event.stopPropagation();

    this.careerDropdownOpen =
      this.careerDropdownOpen === target
        ? null
        : target;

    this.forceViewUpdate();
  }

  selectCareer(
    target: CareerDropdownTarget,
    career: string,
    event: MouseEvent
  ): void {
    event.stopPropagation();

    if (target === 'newBook') {
      this.newBook.career = career;
    }

    if (target === 'editBook') {
      this.editBook.career = career;
    }

    if (target === 'newUser') {
      this.newUser.career = career;
    }

    if (target === 'editUser') {
      this.editUser.career = career;
    }

    this.careerDropdownOpen = null;
    this.forceViewUpdate();
  }

  getCareerValue(target: CareerDropdownTarget): string {
    if (target === 'newBook') {
      return this.newBook.career;
    }

    if (target === 'editBook') {
      return this.editBook.career;
    }

    if (target === 'newUser') {
      return this.newUser.career;
    }

    return this.editUser.career;
  }

  getCareerLabel(target: CareerDropdownTarget): string {
    return this.getCareerValue(target) || 'Seleccionar carrera';
  }

  isCareerSelected(
    target: CareerDropdownTarget,
    career: string
  ): boolean {
    return this.getCareerValue(target) === career;
  }

  showToast(
    type: ToastType,
    title: string,
    message: string
  ): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast = {
      visible: true,
      type,
      title,
      message
    };

    this.forceViewUpdate();

    this.toastTimer = setTimeout(() => {
      this.closeToast();
    }, 3200);
  }

  closeToast(): void {
    this.toast.visible = false;
    this.forceViewUpdate();
  }

  getToastIcon(): string {
    if (this.toast.type === 'success') {
      return '✅';
    }

    if (this.toast.type === 'error') {
      return '❌';
    }

    if (this.toast.type === 'warning') {
      return '⚠️';
    }

    return 'ℹ️';
  }

  private openConfirmation(
    config: {
      title: string;
      message: string;
      icon?: string;
      confirmText?: string;
      cancelText?: string;
      danger?: boolean;
    },
    action: () => void
  ): void {
    this.confirmation = {
      title: config.title,
      message: config.message,
      icon: config.icon || '⚠️',
      confirmText: config.confirmText || 'Aceptar',
      cancelText: config.cancelText || 'Cancelar',
      danger: config.danger || false
    };

    this.confirmationAction = action;
    this.isConfirmationProcessing = false;
    this.showConfirmationModal = true;
    this.careerDropdownOpen = null;

    this.forceViewUpdate();
  }

  closeConfirmation(): void {
    if (this.isConfirmationProcessing) {
      return;
    }

    this.showConfirmationModal = false;
    this.confirmationAction = null;

    this.forceViewUpdate();
  }

  confirmAction(): void {
    if (!this.confirmationAction || this.isConfirmationProcessing) {
      return;
    }

    this.isConfirmationProcessing = true;
    this.forceViewUpdate();

    this.confirmationAction();
  }

  private closeConfirmationAfterAction(): void {
    this.isConfirmationProcessing = false;
    this.showConfirmationModal = false;
    this.confirmationAction = null;

    this.forceViewUpdate();
  }

  get filteredBooks(): Book[] {
    const term = this.search.toLowerCase();

    return this.books.filter(book =>
      (book.title || '').toLowerCase().includes(term) ||
      (book.author || '').toLowerCase().includes(term) ||
      (book.career || '').toLowerCase().includes(term) ||
      (book.isbn || '').toLowerCase().includes(term)
    );
  }

  get filteredUsers(): User[] {
    const term = this.search.toLowerCase();

    return this.users.filter(user =>
      (user.name || '').toLowerCase().includes(term) ||
      (user.matricula || '').toLowerCase().includes(term) ||
      (user.career || '').toLowerCase().includes(term) ||
      (user.role || '').toLowerCase().includes(term) ||
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

  openAddBook(): void {
    this.newBook = {
      title: '',
      author: '',
      career: '',
      isbn: '',
      stock: 1,
      libraryStock: 1,
      cover: ''
    };

    this.careerDropdownOpen = null;
    this.showBookModal = true;
    this.forceViewUpdate();
  }

  closeAddBook(): void {
    if (this.isSavingBook) {
      return;
    }

    this.careerDropdownOpen = null;
    this.showBookModal = false;
    this.forceViewUpdate();
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

    this.careerDropdownOpen = null;
    this.showUserModal = true;
    this.forceViewUpdate();
  }

  closeAddUser(): void {
    if (this.isSavingUser) {
      return;
    }

    this.careerDropdownOpen = null;
    this.showUserModal = false;
    this.forceViewUpdate();
  }

  setNewUserRole(role: CreatableUserRole): void {
    this.newUser.role = role;
    this.newUser.career = '';
    this.careerDropdownOpen = null;
    this.forceViewUpdate();
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
      this.showToast(
        'warning',
        'Campos obligatorios',
        'Todos los campos del libro son obligatorios.'
      );
      return;
    }

    if (this.bookService.hasIsbnRegistered(isbn)) {
      this.showToast(
        'warning',
        'ISBN duplicado',
        'Ya existe un libro registrado con ese ISBN.'
      );
      return;
    }

    if (isNaN(loanCopies) || isNaN(libraryCopies)) {
      this.showToast(
        'warning',
        'Ejemplares inválidos',
        'Los ejemplares deben ser números válidos.'
      );
      return;
    }

    if (loanCopies < 0 || libraryCopies < 0) {
      this.showToast(
        'warning',
        'Ejemplares inválidos',
        'Los ejemplares no pueden ser negativos.'
      );
      return;
    }

    if (libraryCopies <= 0) {
      this.showToast(
        'warning',
        'Ejemplares inválidos',
        'Los ejemplares disponibles en biblioteca deben ser mayores a 0.'
      );
      return;
    }

    if (loanCopies > libraryCopies) {
      this.showToast(
        'warning',
        'Stock inválido',
        'Los ejemplares para préstamo no pueden ser mayores que los ejemplares disponibles en biblioteca.'
      );
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

    this.isSavingBook = true;
    this.forceViewUpdate();

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

        this.careerDropdownOpen = null;
        this.showBookModal = false;
        this.isSavingBook = false;

        this.forceViewUpdate();

        this.showToast(
          'success',
          'Libro agregado',
          'Libro agregado correctamente.'
        );
      },
      error: error => {
        this.isSavingBook = false;
        this.forceViewUpdate();

        this.showToast(
          'error',
          'No se pudo agregar',
          error?.error?.detail || 'No se pudo agregar el libro.'
        );
      }
    });
  }

  openEditBook(book: Book): void {
    this.selectedBook = book;

    const libraryStock = book.libraryStock ?? book.totalCopies ?? book.stock;

    this.editBook = {
      id: book.id,
      title: book.title || '',
      author: book.author || '',
      career: book.career || '',
      isbn: book.isbn || '',
      stock: book.stock ?? 0,
      libraryStock,
      totalCopies: libraryStock,
      cover: book.cover || ''
    };

    this.careerDropdownOpen = null;
    this.showEditBookModal = true;
    this.forceViewUpdate();
  }

  closeEditBook(): void {
    if (this.isSavingBook) {
      return;
    }

    this.careerDropdownOpen = null;
    this.showEditBookModal = false;
    this.selectedBook = null;

    this.forceViewUpdate();
  }

  updateBook(): void {
    const currentBook = this.books.find(book =>
      book.id === this.editBook.id
    );

    if (!currentBook) {
      this.showToast(
        'error',
        'Libro no encontrado',
        'No se encontró el libro seleccionado para editar.'
      );
      return;
    }

    const title = this.editBook.title.trim();
    const author = this.editBook.author.trim();
    const career = this.editBook.career.trim();
    const isbn = this.editBook.isbn.trim();

    const cover = this.editBook.cover.trim() || currentBook.cover || '';

    const loanCopies = Number(this.editBook.stock);
    const libraryCopies = Number(this.editBook.libraryStock);

    if (
      this.isEmpty(title) ||
      this.isEmpty(author) ||
      this.isEmpty(career) ||
      this.isEmpty(isbn) ||
      this.isEmpty(this.editBook.stock) ||
      this.isEmpty(this.editBook.libraryStock)
    ) {
      this.showToast(
        'warning',
        'Campos incompletos',
        'Revisa que título, autor, carrera, ISBN y ejemplares estén completos.'
      );
      return;
    }

    if (this.bookService.hasIsbnRegistered(isbn, this.editBook.id)) {
      this.showToast(
        'warning',
        'ISBN duplicado',
        'Ya existe otro libro registrado con ese ISBN.'
      );
      return;
    }

    if (isNaN(loanCopies) || isNaN(libraryCopies)) {
      this.showToast(
        'warning',
        'Ejemplares inválidos',
        'Los ejemplares deben ser números válidos.'
      );
      return;
    }

    if (loanCopies < 0 || libraryCopies < 0) {
      this.showToast(
        'warning',
        'Ejemplares inválidos',
        'Los ejemplares no pueden ser negativos.'
      );
      return;
    }

    if (libraryCopies <= 0) {
      this.showToast(
        'warning',
        'Ejemplares inválidos',
        'Los ejemplares disponibles en biblioteca deben ser mayores a 0.'
      );
      return;
    }

    if (loanCopies > libraryCopies) {
      this.showToast(
        'warning',
        'Stock inválido',
        'Los ejemplares para préstamo no pueden ser mayores que los ejemplares disponibles en biblioteca.'
      );
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

    this.isSavingBook = true;
    this.forceViewUpdate();

    this.bookService.updateBook(updatedBook).subscribe({
      next: bookFromApi => {
        this.books = this.bookService.getBooks();

        if (bookFromApi.stock > 0) {
          this.waitlistService.notifyNextUser(bookFromApi.id);
        }

        this.careerDropdownOpen = null;
        this.showEditBookModal = false;
        this.selectedBook = null;
        this.isSavingBook = false;

        this.forceViewUpdate();

        this.showToast(
          'success',
          'Cambios guardados',
          'Libro actualizado correctamente.'
        );
      },
      error: error => {
        this.isSavingBook = false;
        this.forceViewUpdate();

        this.showToast(
          'error',
          'No se pudo actualizar',
          error?.error?.detail || 'No se pudo actualizar el libro.'
        );
      }
    });
  }

  deleteBook(book: Book): void {
    if (book.isActive === false) {
      this.openConfirmation(
        {
          title: 'Reactivar libro',
          message: `¿Deseas reactivar el libro "${book.title}"?`,
          icon: '✅',
          confirmText: 'Reactivar',
          danger: false
        },
        () => {
          this.bookService.activateBook(book.id).subscribe({
            next: () => {
              this.books = this.bookService.getBooks();
              this.closeConfirmationAfterAction();

              this.showToast(
                'success',
                'Libro reactivado',
                'Libro reactivado correctamente.'
              );
            },
            error: () => {
              this.closeConfirmationAfterAction();

              this.showToast(
                'error',
                'No se pudo reactivar',
                'No se pudo reactivar el libro.'
              );
            }
          });
        }
      );

      return;
    }

    if (this.loanService.hasActiveLoansByBook(book.id)) {
      this.showToast(
        'warning',
        'Libro con préstamos activos',
        'Este libro tiene préstamos activos. No puede ser desactivado hasta que todos los préstamos sean devueltos.'
      );
      return;
    }

    this.openConfirmation(
      {
        title: 'Desactivar libro',
        message:
          `¿Seguro que deseas desactivar el libro "${book.title}"?\n\n` +
          'El libro conservará su historial, pero ya no estará disponible para nuevas reservas.',
        icon: '🚫',
        confirmText: 'Desactivar',
        danger: true
      },
      () => {
        this.bookService.deactivateBook(book.id).subscribe({
          next: () => {
            this.books = this.bookService.getBooks();
            this.closeConfirmationAfterAction();

            this.showToast(
              'success',
              'Libro desactivado',
              'Libro desactivado correctamente.'
            );
          },
          error: () => {
            this.closeConfirmationAfterAction();

            this.showToast(
              'error',
              'No se pudo desactivar',
              'No se pudo desactivar el libro.'
            );
          }
        });
      }
    );
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
      this.showToast(
        'warning',
        'Campos obligatorios',
        'Todos los campos del usuario son obligatorios.'
      );
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast(
        'warning',
        'Correo inválido',
        'Ingresa un correo electrónico válido.'
      );
      return;
    }

    if (password.length < 4) {
      this.showToast(
        'warning',
        'Contraseña inválida',
        'La contraseña inicial debe tener al menos 4 caracteres.'
      );
      return;
    }

    const duplicatedMatricula = this.users.some(user =>
      (user.matricula || '').toLowerCase() === matricula.toLowerCase()
    );

    if (duplicatedMatricula) {
      this.showToast(
        'warning',
        'Registro duplicado',
        'Ya existe un usuario con esa matrícula o número de control.'
      );
      return;
    }

    const duplicatedEmail = this.users.some(user =>
      (user.email || '').toLowerCase() === email.toLowerCase()
    );

    if (duplicatedEmail) {
      this.showToast(
        'warning',
        'Correo duplicado',
        'Ya existe un usuario con ese correo electrónico.'
      );
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

    this.isSavingUser = true;
    this.forceViewUpdate();

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

        this.careerDropdownOpen = null;
        this.showUserModal = false;
        this.isSavingUser = false;

        this.forceViewUpdate();

        this.showToast(
          'success',
          'Usuario agregado',
          'Usuario agregado correctamente.'
        );
      },
      error: error => {
        this.isSavingUser = false;
        this.forceViewUpdate();

        this.showToast(
          'error',
          'No se pudo agregar',
          error?.error?.detail || 'No se pudo agregar el usuario.'
        );
      }
    });
  }

  openEditUser(user: User): void {
    this.selectedUser = user;

    this.editUser = {
      id: user.id,
      name: user.name || '',
      matricula: user.matricula || '',
      career: user.career || '',
      role: user.role as UserRole,
      email: user.email || ''
    };

    this.careerDropdownOpen = null;
    this.showEditUserModal = true;
    this.forceViewUpdate();
  }

  closeEditUser(): void {
    if (this.isSavingUser) {
      return;
    }

    this.careerDropdownOpen = null;
    this.showEditUserModal = false;
    this.selectedUser = null;

    this.forceViewUpdate();
  }

  updateUser(): void {
    const currentUser = this.users.find(
      user => user.id === this.editUser.id
    );

    if (!currentUser) {
      this.showToast(
        'error',
        'Usuario no encontrado',
        'No se encontró el usuario seleccionado para editar.'
      );
      return;
    }

    const name = this.editUser.name.trim();
    const matricula = this.editUser.matricula.trim();
    const email = this.editUser.email.trim();

    const career = currentUser.role === 'Bibliotecario'
      ? 'Biblioteca'
      : (this.editUser.career.trim() || currentUser.career || '');

    if (
      this.isEmpty(name) ||
      this.isEmpty(matricula) ||
      this.isEmpty(email) ||
      this.isEmpty(career)
    ) {
      this.showToast(
        'warning',
        'Campos incompletos',
        'Revisa que nombre, matrícula o número de control, correo y carrera estén completos.'
      );
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast(
        'warning',
        'Correo inválido',
        'Ingresa un correo electrónico válido.'
      );
      return;
    }

    const duplicatedMatricula = this.users.some(user =>
      user.id !== this.editUser.id &&
      (user.matricula || '').toLowerCase() === matricula.toLowerCase()
    );

    if (duplicatedMatricula) {
      this.showToast(
        'warning',
        'Registro duplicado',
        'Ya existe otro usuario con esa matrícula o número de control.'
      );
      return;
    }

    const duplicatedEmail = this.users.some(user =>
      user.id !== this.editUser.id &&
      (user.email || '').toLowerCase() === email.toLowerCase()
    );

    if (duplicatedEmail) {
      this.showToast(
        'warning',
        'Correo duplicado',
        'Ya existe otro usuario con ese correo electrónico.'
      );
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

    this.isSavingUser = true;
    this.forceViewUpdate();

    this.userService.updateUser(updatedUser).subscribe({
      next: () => {
        this.users = this.userService.getUsers();

        this.careerDropdownOpen = null;
        this.showEditUserModal = false;
        this.selectedUser = null;
        this.isSavingUser = false;

        this.forceViewUpdate();

        this.showToast(
          'success',
          'Cambios guardados',
          'Usuario actualizado correctamente.'
        );
      },
      error: error => {
        this.isSavingUser = false;
        this.forceViewUpdate();

        this.showToast(
          'error',
          'No se pudo actualizar',
          error?.error?.detail || 'No se pudo actualizar el usuario.'
        );
      }
    });
  }

  resetUserPassword(): void {
    if (!this.selectedUser) {
      return;
    }

    this.passwordValue = '';
    this.showPasswordModal = true;
    this.careerDropdownOpen = null;

    this.forceViewUpdate();
  }

  closePasswordModal(): void {
    if (this.isResettingPassword) {
      return;
    }

    this.passwordValue = '';
    this.showPasswordModal = false;

    this.forceViewUpdate();
  }

  submitPasswordReset(): void {
    if (!this.selectedUser) {
      return;
    }

    const newPassword = this.passwordValue.trim();

    if (newPassword.length < 4) {
      this.showToast(
        'warning',
        'Contraseña inválida',
        'La contraseña debe tener al menos 4 caracteres.'
      );
      return;
    }

    this.isResettingPassword = true;
    this.forceViewUpdate();

    this.userService.resetPassword(
      this.selectedUser.id,
      newPassword
    ).subscribe({
      next: () => {
        this.isResettingPassword = false;
        this.showPasswordModal = false;
        this.passwordValue = '';

        this.forceViewUpdate();

        this.showToast(
          'success',
          'Contraseña restablecida',
          'Contraseña restablecida correctamente.'
        );
      },
      error: error => {
        this.isResettingPassword = false;
        this.forceViewUpdate();

        this.showToast(
          'error',
          'No se pudo restablecer',
          error?.error?.detail || 'No se pudo restablecer la contraseña.'
        );
      }
    });
  }

  deleteUser(user: User): void {
    if (user.isActive === false) {
      this.openConfirmation(
        {
          title: 'Reactivar usuario',
          message: `¿Deseas reactivar al usuario "${user.name}"?`,
          icon: '✅',
          confirmText: 'Reactivar',
          danger: false
        },
        () => {
          this.userService.activateUser(user.id).subscribe({
            next: () => {
              this.users = this.userService.getUsers();
              this.closeConfirmationAfterAction();

              this.showToast(
                'success',
                'Usuario reactivado',
                'Usuario reactivado correctamente.'
              );
            },
            error: error => {
              this.closeConfirmationAfterAction();

              this.showToast(
                'error',
                'No se pudo reactivar',
                error?.error?.detail || 'No se pudo reactivar el usuario.'
              );
            }
          });
        }
      );

      return;
    }

    if (this.loanService.hasActiveLoansByUser(user.matricula)) {
      this.showToast(
        'warning',
        'Usuario con préstamos activos',
        'Este usuario tiene préstamos activos. Debe devolver todos sus libros antes de ser desactivado.'
      );
      return;
    }

    this.openConfirmation(
      {
        title: 'Desactivar usuario',
        message:
          `¿Seguro que deseas desactivar al usuario "${user.name}"?\n\n` +
          'El usuario conservará su historial, pero ya no podrá iniciar sesión.',
        icon: '🚫',
        confirmText: 'Desactivar',
        danger: true
      },
      () => {
        this.userService.deactivateUser(user.id).subscribe({
          next: () => {
            this.users = this.userService.getUsers();
            this.closeConfirmationAfterAction();

            this.showToast(
              'success',
              'Usuario desactivado',
              'Usuario desactivado correctamente.'
            );
          },
          error: error => {
            this.closeConfirmationAfterAction();

            this.showToast(
              'error',
              'No se pudo desactivar',
              error?.error?.detail || 'No se pudo desactivar el usuario.'
            );
          }
        });
      }
    );
  }
}