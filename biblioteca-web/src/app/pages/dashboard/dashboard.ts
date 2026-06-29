import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { LoanService } from '../../services/loan.service';
import { ReservationService } from '../../services/reservation';
import { WaitlistService } from '../../services/waitlist.service';
import { UiFeedbackService } from '../../services/ui-feedback.service';

import { BookCardComponent } from '../../components/book-card/book-card';
import { FolioPopupComponent } from '../../components/folio-popup/folio-popup';
import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BookCardComponent,
    FolioPopupComponent,
    MobileNavComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {

  search = '';
  career = 'Todas';

  careerDropdownOpen = false;

  careers: string[] = [
    'Todas',
    'Ingeniería en Computación',
    'Ingeniería Química',
    'Ingeniería Industrial',
    'Ingeniería en Petróleos',
    'Ingeniería en Diseño',
    'Ingeniería en Energías Renovables',
    'Licenciatura en Matemáticas Aplicadas'
  ];

  books: Book[] = [];

  selectedBook: Book | null = null;
  selectedFolio = '';
  showFolio = false;
  reservingBookId: number | null = null;

  isLoading = false;
  loadError = false;

  private syncTimer: any = null;
  private readonly syncInterval = 3000;
  private isSyncing = false;

  constructor(
    private bookService: BookService,
    private loanService: LoanService,
    private reservationService: ReservationService,
    private waitlistService: WaitlistService,
    private uiFeedback: UiFeedbackService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.startAutoSync();
  }

  ngOnDestroy(): void {
    this.stopAutoSync();
  }

  private startAutoSync(): void {
    this.stopAutoSync();

    this.syncTimer = setInterval(() => {
      if (this.showFolio || this.reservingBookId !== null) {
        return;
      }

      this.loadInitialData(true);
    }, this.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  @HostListener('document:click', ['$event'])
  closeDropdownWhenClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.career-select')) {
      this.careerDropdownOpen = false;
    }
  }

  loadInitialData(silent: boolean = false): void {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    if (!silent) {
      this.isLoading = true;
    }

    this.loadError = false;

    forkJoin({
      books: this.bookService.loadBooks().pipe(
        catchError(error => {
          console.error('Error al cargar libros:', error);
          this.loadError = true;
          return of(this.bookService.getActiveBooks());
        })
      ),

      loans: this.loanService.loadLoans().pipe(
        catchError(error => {
          console.error('Error al cargar préstamos:', error);
          this.loadError = true;
          return of([]);
        })
      ),

      reservations: this.reservationService.loadReservations().pipe(
        catchError(error => {
          console.error('Error al cargar reservas:', error);
          this.loadError = true;
          return of([]);
        })
      ),

      waitlist: this.waitlistService.loadWaitlist().pipe(
        catchError(error => {
          console.error('Error al cargar lista de espera:', error);
          this.loadError = true;
          return of([]);
        })
      )
    })
      .pipe(
        finalize(() => {
          this.isSyncing = false;

          if (!silent) {
            this.isLoading = false;
          }

          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          this.books = response.books.filter(book =>
            book.isActive !== false
          );
        },
        error: error => {
          console.error('Error general al cargar catálogo:', error);
          this.books = this.bookService.getActiveBooks();
          this.loadError = true;
        }
      });
  }

  toggleCareerDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.careerDropdownOpen = !this.careerDropdownOpen;
  }

  selectCareer(career: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.career = career;
    this.careerDropdownOpen = false;
  }

  get filteredBooks(): Book[] {
    return this.books.filter(book => {
      const title = book.title || '';
      const author = book.author || '';

      const searchMatch =
        title.toLowerCase().includes(this.search.toLowerCase()) ||
        author.toLowerCase().includes(this.search.toLowerCase());

      const careerMatch =
        this.career === 'Todas' ||
        book.career === this.career;

      return searchMatch && careerMatch;
    });
  }

  trackByBookId(index: number, book: Book): number {
    return book.id;
  }

  isBookBlocked(book: Book): boolean {
    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    if (!currentUser?.matricula) {
      return false;
    }

    const hasPendingReservation =
      this.reservationService.hasPendingReservation(
        currentUser.matricula,
        book.id
      );

    const hasActiveLoan =
      this.loanService.hasBookAlready(
        currentUser.matricula,
        book.id
      );

    return hasPendingReservation || hasActiveLoan;
  }

  isBookLockedByWaitlist(book: Book): boolean {
    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    if (!currentUser?.matricula) {
      return false;
    }

    return this.waitlistService.isBookLockedByWaitlistForUser(
      book.id,
      currentUser.matricula
    );
  }

  reserveBook(book: Book): void {
    if (this.reservingBookId !== null) {
      return;
    }

    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    if (!currentUser?.matricula) {
      this.uiFeedback.error('No se encontró la sesión del usuario.');
      return;
    }

    const lockedByWaitlist =
      this.waitlistService.isBookLockedByWaitlistForUser(
        book.id,
        currentUser.matricula
      );

    if (lockedByWaitlist) {
      this.uiFeedback.warning(
        'Este ejemplar está apartado temporalmente para el primer usuario de la lista de espera.'
      );
      return;
    }

    const validation = this.loanService.canBorrow(
      currentUser.matricula,
      book.id
    );

    if (!validation.allowed) {
      this.uiFeedback.warning(validation.message);
      return;
    }

    const alreadyReserved =
      this.reservationService.hasPendingReservation(
        currentUser.matricula,
        book.id
      );

    if (alreadyReserved) {
      this.uiFeedback.warning('Ya tienes una reserva pendiente para este libro.');
      return;
    }

    this.reservingBookId = book.id;

    try {
      this.reservationService.createReservation(
        book.id,
        book.title,
        book.author
      ).subscribe({
        next: reservation => {
          this.selectedBook = book;
          this.selectedFolio = reservation.folio;
          this.showFolio = true;
          this.reservingBookId = null;

          this.loadInitialData(true);
        },
        error: error => {
          this.reservingBookId = null;

          this.uiFeedback.error(
            error?.error?.detail ||
            'Ocurrió un error al generar la reserva.'
          );
        }
      });
    } catch (error) {
      this.reservingBookId = null;

      if (error instanceof Error) {
        this.uiFeedback.error(error.message);
      } else {
        this.uiFeedback.error('Ocurrió un error al generar la reserva.');
      }
    }
  }

  closeFolio(): void {
    this.showFolio = false;
    this.selectedBook = null;
    this.selectedFolio = '';
  }
}