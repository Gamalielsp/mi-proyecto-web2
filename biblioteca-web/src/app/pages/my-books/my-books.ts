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
import { UiFeedbackService } from '../../services/ui-feedback.service';

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
    private uiFeedback: UiFeedbackService,
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
      this.sortLoansNewestFirst(
        this.loanService.getActiveLoansByUser(
          this.currentUser.matricula
        )
      );

    this.history =
      this.sortHistoryNewestFirst(
        this.loanService
          .getHistory()
          .filter(loan =>
            loan.matricula === this.currentUser.matricula
          )
      );

    this.reservations =
      this.sortReservationsNewestFirst(
        this.reservationService.getUserReservations(
          this.currentUser.matricula
        )
      );

    this.folios = this.sortFoliosNewestFirst([
      ...this.reservations.map(reservation => ({
        folio: reservation.folio,
        book: reservation.bookTitle,
        date: reservation.requestDate,
        status: this.getReservationStatusText(reservation.status),
        orderValue: this.getReservationOrderValue(reservation)
      })),

      ...this.loans
        .filter(loan => !!loan.returnFolio)
        .map(loan => ({
          folio: loan.returnFolio,
          book: loan.bookTitle,
          date: loan.returnRequestDate || loan.returnDate || loan.dueDate,
          status: 'Folio de devolución',
          orderValue: this.getLoanOrderValue(loan)
        })),

      ...this.history
        .filter(loan => !!loan.returnFolio)
        .map(loan => ({
          folio: loan.returnFolio,
          book: loan.bookTitle,
          date: loan.returnDate || loan.dueDate,
          status: 'Libro devuelto',
          orderValue: this.getHistoryOrderValue(loan)
        }))
    ]);
  }

  private sortReservationsNewestFirst(
    reservations: Reservation[]
  ): Reservation[] {
    return [...reservations].sort((a, b) =>
      this.getReservationOrderValue(b) -
      this.getReservationOrderValue(a)
    );
  }

  private getReservationOrderValue(
    reservation: Reservation
  ): number {
    const item: any = reservation;

    const idValue = this.getNumericValue(item.id);

    if (idValue > 0) {
      return idValue;
    }

    const folioValue = this.getNumericValue(item.folio);

    if (folioValue > 0) {
      return folioValue;
    }

    const dateTimeValue = this.getDateOrderValue(
      `${reservation.requestDate} ${reservation.requestTime}`
    );

    if (dateTimeValue > 0) {
      return dateTimeValue;
    }

    return this.getDateOrderValue(reservation.expiresAt);
  }

  private sortLoansNewestFirst(
    loans: Loan[]
  ): Loan[] {
    return [...loans].sort((a, b) =>
      this.getLoanOrderValue(b) -
      this.getLoanOrderValue(a)
    );
  }

  private getLoanOrderValue(
    loan: Loan
  ): number {
    const item: any = loan;

    const idValue = this.getNumericValue(item.id);

    if (idValue > 0) {
      return idValue;
    }

    const possibleNumericValues = [
      item.loanFolio,
      item.loan_folio,
      item.folio,
      item.returnFolio,
      item.return_folio
    ];

    for (const value of possibleNumericValues) {
      const numericValue = this.getNumericValue(value);

      if (numericValue > 0) {
        return numericValue;
      }
    }

    const possibleDates = [
      item.createdAt,
      item.created_at,
      item.borrowDate,
      item.borrow_date,
      item.loanDate,
      item.loan_date,
      item.startDate,
      item.start_date,
      item.requestDate,
      item.request_date,
      item.dueDate,
      item.due_date
    ];

    for (const date of possibleDates) {
      const dateValue = this.getDateOrderValue(date);

      if (dateValue > 0) {
        return dateValue;
      }
    }

    return 0;
  }

  private sortHistoryNewestFirst(
    history: Loan[]
  ): Loan[] {
    return [...history].sort((a, b) =>
      this.getHistoryOrderValue(b) -
      this.getHistoryOrderValue(a)
    );
  }

  private getHistoryOrderValue(
    loan: Loan
  ): number {
    const item: any = loan;

    /*
      Para historial priorizamos folio de devolución,
      porque normalmente es el dato que representa
      el movimiento más reciente de devolución.
    */
    const returnFolioValue = this.getNumericValue(item.returnFolio);

    if (returnFolioValue > 0) {
      return returnFolioValue;
    }

    const returnFolioSnakeValue = this.getNumericValue(item.return_folio);

    if (returnFolioSnakeValue > 0) {
      return returnFolioSnakeValue;
    }

    const idValue = this.getNumericValue(item.id);

    if (idValue > 0) {
      return idValue;
    }

    const possibleDates = [
      item.returnDate,
      item.return_date,
      item.returnRequestDate,
      item.return_request_date,
      item.updatedAt,
      item.updated_at,
      item.createdAt,
      item.created_at,
      item.dueDate,
      item.due_date
    ];

    for (const date of possibleDates) {
      const dateValue = this.getDateOrderValue(date);

      if (dateValue > 0) {
        return dateValue;
      }
    }

    return 0;
  }

  private sortFoliosNewestFirst(
    folios: any[]
  ): any[] {
    return [...folios].sort((a, b) =>
      this.getFolioOrderValue(b) -
      this.getFolioOrderValue(a)
    );
  }

  private getFolioOrderValue(
    folio: any
  ): number {
    if (folio?.orderValue) {
      return folio.orderValue;
    }

    const numericFolio = this.getNumericValue(folio?.folio);

    if (numericFolio > 0) {
      return numericFolio;
    }

    return this.getDateOrderValue(folio?.date);
  }

  private getNumericValue(
    value: any
  ): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const directNumber = Number(value);

    if (!Number.isNaN(directNumber) && directNumber > 0) {
      return directNumber;
    }

    const onlyNumbers = String(value).replace(/\D/g, '');
    const parsedNumber = Number(onlyNumbers);

    if (!Number.isNaN(parsedNumber) && parsedNumber > 0) {
      return parsedNumber;
    }

    return 0;
  }

  private getDateOrderValue(
    value?: string
  ): number {
    if (!value) {
      return 0;
    }

    const dateValue = new Date(value).getTime();

    if (Number.isNaN(dateValue)) {
      return 0;
    }

    return dateValue;
  }

  requestReturn(loan: Loan): void {
    if (this.processingLoanId !== null) {
      return;
    }

    this.uiFeedback.confirm({
      title: 'Solicitar devolución',
      message: `¿Deseas solicitar la devolución del libro "${loan.bookTitle}"?`,
      confirmText: 'Solicitar',
      cancelText: 'Cancelar',
      type: 'warning'
    }).subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.processingLoanId = loan.id;

      this.loanService.requestReturn(loan.id).subscribe({
        next: () => {
          this.processingLoanId = null;
          this.uiFeedback.success('Solicitud de devolución enviada correctamente.');
          this.loadDataFromApi(true);
        },
        error: error => {
          this.processingLoanId = null;

          this.uiFeedback.error(
            error?.error?.detail ||
            'No se pudo solicitar la devolución.'
          );
        }
      });
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
          this.uiFeedback.success('Préstamo renovado por 1 día adicional.');
          this.loadDataFromApi(true);
        },
        error: error => {
          this.processingLoanId = null;

          this.uiFeedback.error(
            error?.error?.detail ||
            'No se pudo renovar el préstamo.'
          );
        }
      });
    } catch (error) {
      this.processingLoanId = null;

      if (error instanceof Error) {
        this.uiFeedback.error(error.message);
      } else {
        this.uiFeedback.error('No se pudo renovar el préstamo.');
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