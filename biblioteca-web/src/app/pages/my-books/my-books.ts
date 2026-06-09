import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';


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
export class MyBooks implements OnDestroy {

  activeSection:
    'reservations' |
    'loans' |
    'folios' |
    'history' = 'reservations';

  loans: Loan[] = [];

  history: Loan[] = [];

  reservations: Reservation[] = [];

  folios: any[] = [];

  currentUser = JSON.parse(
    localStorage.getItem('currentUser') || '{}'
  );

  private timerSubscription: Subscription;

  constructor(
    private loanService: LoanService,
    private reservationService: ReservationService
  ) {
    this.loadData();

    this.timerSubscription = interval(60000).subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.timerSubscription.unsubscribe();
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

  loadData(): void {
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
  }

  requestReturn(loan: Loan): void {
    this.loanService.requestReturn(loan.id);
    this.loadData();
  }

  renewLoan(loan: Loan): void {
    const result =
      this.loanService.renewLoan(loan.id);

    alert(result.message);

    this.loadData();
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
    return new Date(
      reservation.expiresAt
    ).toLocaleTimeString();
  }

}