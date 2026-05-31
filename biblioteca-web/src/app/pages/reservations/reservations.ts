import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';

import { Reservation } from '../../models/reservation.model';
import { ReservationService } from '../../services/reservation';
import { LoanService } from '../../services/loan.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css'
})
export class Reservations implements OnDestroy {

  reservations: Reservation[] = [];
  history: Reservation[] = [];

  private timerSubscription: Subscription;

  constructor(
    private reservationService: ReservationService,
    private loanService: LoanService
  ) {
    this.loadReservations();

    this.timerSubscription = interval(60000).subscribe(() => {
      this.loadReservations();
    });
  }

  ngOnDestroy(): void {
    this.timerSubscription.unsubscribe();
  }

  loadReservations(): void {
    this.reservations =
      this.reservationService.getPendingReservations();

    this.history =
      this.reservationService.getReservationHistory();
  }

  confirmDelivery(reservation: Reservation): void {
    const delivered =
      this.reservationService.markAsDelivered(
        reservation.id
      );

    if (!delivered) {
      alert('No se pudo confirmar la entrega.');
      return;
    }

    const today = new Date();
    const dueDate = new Date();

    dueDate.setDate(today.getDate() + 2);

    this.loanService.addLoan({
      id: Date.now(),
      folio: 'PRE-' + Math.floor(100000 + Math.random() * 900000),

      studentName: reservation.studentName,
      matricula: reservation.matricula,
      userRole: reservation.userRole,

      bookId: reservation.bookId,
      bookTitle: reservation.bookTitle,
      author: reservation.author,

      borrowDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      daysLeft: 2,

      renewed: false,
      status: 'activo'
    });

    alert(
      'Libro entregado correctamente. El préstamo ha iniciado.'
    );

    this.loadReservations();
  }

  cancelReservation(reservation: Reservation): void {
    const confirmCancel = confirm(
      `¿Seguro que deseas rechazar o cancelar la reserva ${reservation.folio}?`
    );

    if (!confirmCancel) {
      return;
    }

    this.reservationService.cancelReservation(
      reservation.id
    );

    alert(
      'Reserva cancelada. El libro volvió al inventario.'
    );

    this.loadReservations();
  }

  getExpirationTime(reservation: Reservation): string {
    return new Date(
      reservation.expiresAt
    ).toLocaleTimeString();
  }

  getRemainingMinutes(reservation: Reservation): number {
    return this.reservationService.getRemainingMinutes(
      reservation
    );
  }

  getStatusText(status: Reservation['status']): string {
    if (status === 'pendiente') {
      return 'Pendiente';
    }

    if (status === 'entregado') {
      return 'Entregada';
    }

    if (status === 'expirada') {
      return 'Expirada';
    }

    return 'Cancelada';
  }
}