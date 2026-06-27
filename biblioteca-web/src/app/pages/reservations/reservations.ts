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
  interval,
  of,
  Subscription
} from 'rxjs';

import { Reservation } from '../../models/reservation.model';

import { ReservationService } from '../../services/reservation';
import { LoanService } from '../../services/loan.service';
import { WaitlistService } from '../../services/waitlist.service';
import { BookService } from '../../services/book.service';

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
export class Reservations implements OnInit, OnDestroy {

  reservations: Reservation[] = [];
  history: Reservation[] = [];
  loading = false;
  loadError = false;
  processingReservationId: number | null = null;

  private timerSubscription?: Subscription;

  constructor(
    private reservationService: ReservationService,
    private loanService: LoanService,
    private waitlistService: WaitlistService,
    private bookService: BookService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReservationsFromApi();

    this.timerSubscription = interval(1000).subscribe(() => {
      this.loadReservations();
      this.changeDetectorRef.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }

  loadReservationsFromApi(): void {
    this.loadError = false;

    this.reservationService.loadReservations().pipe(
      catchError(error => {
        console.error('Error al cargar reservas:', error);
        this.loadError = true;
        return of([]);
      }),
      finalize(() => {
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.loadReservations();
      },
      error: error => {
        console.error('Error general al cargar reservas:', error);
        this.loadError = true;
        this.loadReservations();
      }
    });
  }

  loadReservations(): void {
    this.reservations =
      this.reservationService.getPendingReservations();

    this.history =
      this.reservationService.getReservationHistory();
  }

  confirmDelivery(reservation: Reservation): void {
    if (this.processingReservationId !== null) {
      return;
    }

    this.processingReservationId = reservation.id;
    this.loading = true;

    this.reservationService.markAsDelivered(reservation.id).pipe(
      finalize(() => {
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: deliveredReservation => {
        const today = new Date();
        const dueDate = new Date();

        dueDate.setDate(today.getDate() + 7);

        this.loanService.addLoan({
          id: Date.now(),
          folio: 'PRE-' + Math.floor(100000 + Math.random() * 900000),

          studentName: deliveredReservation.studentName,
          matricula: deliveredReservation.matricula,
          userRole: deliveredReservation.userRole,

          bookId: deliveredReservation.bookId,
          bookTitle: deliveredReservation.bookTitle,
          author: deliveredReservation.author,

          borrowDate: today.toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
          daysLeft: 7,

          renewed: false,
          status: 'activo'
        }).subscribe({
          next: () => {
            this.waitlistService.completeReservationByBookAndMatricula(
              deliveredReservation.bookId,
              deliveredReservation.matricula
            );

            this.waitlistService.notifyNextUser(deliveredReservation.bookId);

            alert(
              'Libro entregado correctamente. El préstamo ha iniciado.'
            );

            this.finishProcessing();
            this.loadReservationsFromApi();
          },
          error: error => {
            this.finishProcessing();
            alert(
              error?.error?.detail ||
              'La reserva se marcó como entregada, pero no se pudo crear el préstamo.'
            );
          }
        });
      },
      error: error => {
        this.finishProcessing();
        alert(error?.error?.detail || 'No se pudo confirmar la entrega.');
      }
    });
  }

  cancelReservation(reservation: Reservation): void {
    if (this.processingReservationId !== null) {
      return;
    }

    const confirmCancel = confirm(
      `¿Seguro que deseas rechazar o cancelar la reserva ${reservation.folio}?`
    );

    if (!confirmCancel) {
      return;
    }

    this.processingReservationId = reservation.id;
    this.loading = true;

    this.reservationService.cancelReservation(reservation.id).pipe(
      finalize(() => {
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: cancelledReservation => {
        this.bookService.loadBooks().subscribe({
          next: () => {},
          error: () => {}
        });

        this.waitlistService.completeReservationByBookAndMatricula(
          cancelledReservation.bookId,
          cancelledReservation.matricula
        );

        this.waitlistService.notifyNextUser(cancelledReservation.bookId);

        alert(
          'Reserva cancelada. El libro volvió al inventario y se notificó al siguiente usuario en lista de espera.'
        );

        this.finishProcessing();
        this.loadReservationsFromApi();
      },
      error: error => {
        this.finishProcessing();
        alert(error?.error?.detail || 'No se pudo cancelar la reserva.');
      }
    });
  }

  private finishProcessing(): void {
    this.loading = false;
    this.processingReservationId = null;
    this.changeDetectorRef.detectChanges();
  }

  getExpirationTime(reservation: Reservation): string {
    return new Date(reservation.expiresAt).toLocaleTimeString();
  }

  getRemainingTime(reservation: Reservation): string {
    if (reservation.status !== 'pendiente') {
      return '00:00';
    }

    const now = Date.now();
    const expiresAt = new Date(reservation.expiresAt).getTime();
    const diff = expiresAt - now;

    if (diff <= 0) {
      return '00:00';
    }

    const totalSeconds = Math.floor(diff / 1000);

    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');

    const seconds = (totalSeconds % 60)
      .toString()
      .padStart(2, '0');

    return `${minutes}:${seconds}`;
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
