import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { LoanService } from '../../services/loan.service';
import { ReservationService } from '../../services/reservation';
import { WaitlistService } from '../../services/waitlist.service';

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
export class Dashboard {

  search = '';
  career = 'Todas';

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

  constructor(
    private bookService: BookService,
    private loanService: LoanService,
    private reservationService: ReservationService,
    private waitlistService: WaitlistService
  ) {
    this.loadBooks();
  }

  private loadBooks(): void {
    this.bookService.loadBooks().subscribe({
      next: books => {
        this.books = books.filter(book =>
          book.isActive !== false
        );
      },
      error: () => {
        this.books = this.bookService.getActiveBooks();
        alert('No se pudieron cargar los libros desde el servidor.');
      }
    });
  }

  get filteredBooks(): Book[] {
    return this.books.filter(book => {
      const searchMatch =
        book.title.toLowerCase().includes(this.search.toLowerCase()) ||
        book.author.toLowerCase().includes(this.search.toLowerCase());

      const careerMatch =
        this.career === 'Todas' ||
        book.career === this.career;

      return searchMatch && careerMatch;
    });
  }

  isBookBlocked(book: Book): boolean {
    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

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

    const lockedByWaitlist =
      this.waitlistService.isBookLockedByWaitlistForUser(
        book.id,
        currentUser.matricula
      );

    if (lockedByWaitlist) {
      alert(
        'Este ejemplar está apartado temporalmente para el primer usuario de la lista de espera.'
      );
      return;
    }

    const validation = this.loanService.canBorrow(
      currentUser.matricula,
      book.id
    );

    if (!validation.allowed) {
      alert(validation.message);
      return;
    }

    const alreadyReserved =
      this.reservationService.hasPendingReservation(
        currentUser.matricula,
        book.id
      );

    if (alreadyReserved) {
      alert('Ya tienes una reserva pendiente para este libro.');
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

          this.bookService.loadBooks().subscribe({
            next: books => {
              this.books = books.filter(item =>
                item.isActive !== false
              );
            },
            error: () => {
              this.books = this.bookService.getActiveBooks();
            }
          });

          this.showFolio = true;
          this.reservingBookId = null;
        },
        error: error => {
          this.reservingBookId = null;
          alert(error?.error?.detail || 'Ocurrió un error al generar la reserva.');
        }
      });
    } catch (error) {
      this.reservingBookId = null;

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Ocurrió un error al generar la reserva.');
      }
    }
  }

  closeFolio(): void {
    this.showFolio = false;
    this.selectedBook = null;
    this.selectedFolio = '';
  }

}