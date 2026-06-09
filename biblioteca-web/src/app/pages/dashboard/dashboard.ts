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
    'Ingeniería de Petróleos',
    'Ingeniería en Diseño',
    'Ingeniería en Energías Renovables',
    'Licenciatura en Matemáticas Aplicadas'
  ];

  books: Book[] = [];

  selectedBook: Book | null = null;
  selectedFolio = '';
  showFolio = false;

  constructor(
    private bookService: BookService,
    private loanService: LoanService,
    private reservationService: ReservationService,
    private waitlistService: WaitlistService
  ) {
    this.books = this.bookService.getBooks();
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

    try {
      const reservation =
        this.reservationService.createReservation(
          book.id,
          book.title,
          book.author
        );

      this.selectedBook = book;
      this.selectedFolio = reservation.folio;
      this.books = this.bookService.getBooks();
      this.showFolio = true;

    } catch (error) {
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

  resetDataOnly(): void {
    const currentUser =
      localStorage.getItem('currentUser');

    localStorage.removeItem('reservations');
    localStorage.removeItem('waitlist');
    localStorage.removeItem('loans');
    localStorage.removeItem('loanHistory');
    localStorage.removeItem('books');

    if (currentUser) {
      localStorage.setItem('currentUser', currentUser);
    }

    location.reload();
  }

}