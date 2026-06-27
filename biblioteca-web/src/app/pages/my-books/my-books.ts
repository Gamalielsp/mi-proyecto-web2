import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  catchError,
  finalize,
  forkJoin,
  interval,
  of,
  Subscription
} from 'rxjs';

import { Loan } from '../../models/loan.model';
import { Reservation } from '../../models/reservation.model';

import { LoanService } from '../../services/loan.service';
import { ReservationService } from '../../services/reservation';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-my-books',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './my-books.html',
  styleUrl: './my-books.css'
})
export class MyBooks implements OnInit, OnDestroy {

  activeSection:
    'reservations' |
    'loans' |
    'folios' |
    'history' = 'reservations';

  loans: Loan[] = [];
  history: Loan[] = [];
  reservations: Reservation[] = [];
  folios: any[] = [];

  processingLoanId: number | null = null;

  isLoading = false;
  loadError = false;

  currentUser: any = {};

  private timerSubscription?: Subscription;

  constructor(
    private loanService: LoanService,
    private reservationService: ReservationService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    this.loadDataFromApi(true);

    this.timerSubscription = interval(60000).subscribe(() => {
      this.loadDataFromApi(false);
    });
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }

  changeSection(
    section:
      'reservations' |
      'loans' |
      'folios' |
      'history'
  ): void {
    this.activeSection = section;
  }

  loadDataFromApi(showLoading: boolean = false): void {
    if (showLoading) {
      this.isLoading = true;
    }

    this.loadError = false;

    forkJoin({
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
      )
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.loadData();
        },
        error: error => {
          console.error('Error general al cargar Mis Libros:', error);
          this.loadError = true;
          this.loadData();
        }
      });
  }

  loadData(): void {
    if (!this.currentUser?.matricula) {
      this.loans = [];
      this.history = [];
      this.reservations = [];
      this.folios = [];
      return;
    }

    this.loans =
      this.loanService.getActiveLoansByUser(
        this.currentUser.matricula
      );

    this.history =
      this.loanService
        .getHistory()
        .filter(loan =>
          loan.matricula === this.currentUser.matricula
        );

    this.reservations =
      this.reservationService.getUserReservations(
        this.currentUser.matricula
      );

    this.folios = [
      ...this.reservations.map(reservation => ({
        folio: reservation.folio,
        book: reservation.bookTitle,
        date: reservation.requestDate,
        status: this.getReservationStatusText(reservation.status)
      })),

      ...this.loans
        .filter(loan => !!loan.returnFolio)
        .map(loan => ({
          folio: loan.returnFolio,
          book: loan.bookTitle,
          date: loan.returnRequestDate || loan.returnDate || loan.dueDate,
          status: 'Folio de devolución'
        })),

      ...this.history
        .filter(loan => !!loan.returnFolio)
        .map(loan => ({
          folio: loan.returnFolio,
          book: loan.bookTitle,
          date: loan.returnDate || loan.dueDate,
          status: 'Libro devuelto'
        }))
    ];
  }

  requestReturn(loan: Loan): void {
    if (this.processingLoanId !== null) {
      return;
    }

    const confirmRequest = confirm(
      `¿Deseas solicitar la devolución del libro "${loan.bookTitle}"?`
    );

    if (!confirmRequest) {
      return;
    }

    this.processingLoanId = loan.id;

    this.loanService.requestReturn(loan.id).subscribe({
      next: () => {
        this.processingLoanId = null;
        alert('Solicitud de devolución enviada correctamente.');
        this.loadDataFromApi(true);
      },
      error: error => {
        this.processingLoanId = null;

        alert(
          error?.error?.detail ||
          'No se pudo solicitar la devolución.'
        );
      }
    });
  }

  renewLoan(loan: Loan): void {
    if (this.processingLoanId !== null) {
      return;
    }

    this.processingLoanId = loan.id;

    try {
      this.loanService.renewLoan(loan.id).subscribe({
        next: () => {
          this.processingLoanId = null;
          alert('Préstamo renovado por 1 día adicional.');
          this.loadDataFromApi(true);
        },
        error: error => {
          this.processingLoanId = null;

          alert(
            error?.error?.detail ||
            'No se pudo renovar el préstamo.'
          );
        }
      });
    } catch (error) {
      this.processingLoanId = null;

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('No se pudo renovar el préstamo.');
      }
    }
  }

  getReservationStatusText(
    status: Reservation['status']
  ): string {
    if (status === 'pendiente') {
      return 'Pendiente de entrega';
    }

    if (status === 'entregado') {
      return 'Entregada / préstamo iniciado';
    }

    if (status === 'expirada') {
      return 'Expirada';
    }

    return 'Cancelada por biblioteca';
  }

  getReservationMessage(
    reservation: Reservation
  ): string {
    if (reservation.status === 'pendiente') {
      return 'Presenta este folio en biblioteca. Tienes máximo 1 hora desde la solicitud para recoger el libro.';
    }

    if (reservation.status === 'entregado') {
      return 'El bibliotecario confirmó la entrega. El préstamo ya inició.';
    }

    if (reservation.status === 'expirada') {
      return 'No se recogió el libro dentro del tiempo permitido. La reserva expiró y el ejemplar volvió al inventario.';
    }

    return 'La solicitud fue cancelada o rechazada por biblioteca.';
  }

  getExpirationTime(
    reservation: Reservation
  ): string {
    if (!reservation.expiresAt) {
      return 'Sin fecha';
    }

    return new Date(
      reservation.expiresAt
    ).toLocaleTimeString();
  }
}
