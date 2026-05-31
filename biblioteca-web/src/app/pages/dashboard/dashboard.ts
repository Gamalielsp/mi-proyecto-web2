import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { LoanService } from '../../services/loan.service';
import { ReservationService } from '../../services/reservation';

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
    'Ingenierías',
    'Computación',
    'Petróleos',
    'Industrial',
    'Matematicas Aplicadas',
    'Quimica',
    'Diseño',
    'Ingeniería',
    'Sistemas',
    'Química',
    'Administración'
  ];

  books: Book[] = [];
  selectedBook: Book | null = null;
  showFolio = false;

  constructor(
    private bookService: BookService,
    private loanService: LoanService,
    private reservationService: ReservationService
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

  reserveBook(book: Book): void {
    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

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

    const success = this.bookService.reserveBook(book.id);

    if (!success) {
      alert('No hay ejemplares disponibles para reservar.');
      return;
    }

    const reservation =
      this.reservationService.createReservation(
        book.id,
        book.title,
        book.author
      );

    this.selectedBook = book;
    this.books = this.bookService.getBooks();
    this.showFolio = true;

    alert(
      `Reserva generada correctamente.\n\n` +
      `Folio: ${reservation.folio}\n` +
      `Tienes máximo 1 hora para recoger el libro en biblioteca.`
    );
  }

  closeFolio(): void {
    this.showFolio = false;
  }
}