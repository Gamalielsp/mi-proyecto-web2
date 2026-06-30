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
  of
} from 'rxjs';

import { Reservation } from '../../models/reservation.model';

import { ReservationService } from '../../services/reservation';
import { LoanService } from '../../services/loan.service';
import { WaitlistService } from '../../services/waitlist.service';
import { BookService } from '../../services/book.service';
import { UiFeedbackService } from '../../services/ui-feedback.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

type ReservationTab = 'pendiente' | 'entregado' | 'cancelada' | 'expirada';

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

  activeTab: ReservationTab = 'pendiente';

  loading = false;
  loadError = false;
  processingReservationId: number | null = null;

  private syncTimer: any = null;
  private clockTimer: any = null;
  private readonly syncInterval = 3000;
  private isSyncing = false;

  constructor(
    private reservationService: ReservationService,
    private loanService: LoanService,
    private waitlistService: WaitlistService,
    private bookService: BookService,
    private uiFeedback: UiFeedbackService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReservationsFromApi();
    this.startAutoSync();
    this.startClock();
  }

  ngOnDestroy(): void {
    this.stopAutoSync();
    this.stopClock();
  }

  private startAutoSync(): void {
    this.stopAutoSync();

    this.syncTimer = setInterval(() => {
      if (this.processingReservationId !== null) {
        return;
      }

      this.loadReservationsFromApi(true);
    }, this.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private startClock(): void {
    this.stopClock();

    this.clockTimer = setInterval(() => {
      this.changeDetectorRef.detectChanges();
    }, 1000);
  }

  private stopClock(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  loadReservationsFromApi(silent: boolean = false): void {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.loadError = false;

    if (!silent) {
      this.loading = true;
    }

    this.reservationService.loadReservations().pipe(
      catchError(error => {
        console.error('Error al cargar reservas:', error);
        this.loadError = true;
        return of([]);
      }),
      finalize(() => {
        this.isSyncing = false;

        if (!silent) {
          this.loading = false;
        }

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
      this.sortReservationsNewestFirst(
        this.reservationService.getPendingReservations()
      );

    this.history =
      this.sortReservationsNewestFirst(
        this.reservationService.getReservationHistory()
      );
  }

  setActiveTab(tab: ReservationTab): void {
    this.activeTab = tab;
  }

  get pendingReservations(): Reservation[] {
    return this.reservations.filter(reservation =>
      reservation.status === 'pendiente'
    );
  }

  get deliveredReservations(): Reservation[] {
    return this.history.filter(reservation =>
      reservation.status === 'entregado'
    );
  }

  get cancelledReservations(): Reservation[] {
    return this.history.filter(reservation =>
      reservation.status === 'cancelada'
    );
  }

  get expiredReservations(): Reservation[] {
    return this.history.filter(reservation =>
      reservation.status === 'expirada'
    );
  }

  get filteredReservations(): Reservation[] {
    if (this.activeTab === 'pendiente') {
      return this.pendingReservations;
    }

    if (this.activeTab === 'entregado') {
      return this.deliveredReservations;
    }

    if (this.activeTab === 'cancelada') {
      return this.cancelledReservations;
    }

    return this.expiredReservations;
  }

  get sectionTitle(): string {
    if (this.activeTab === 'pendiente') {
      return 'Reservas pendientes';
    }

    if (this.activeTab === 'entregado') {
      return 'Reservas entregadas';
    }

    if (this.activeTab === 'cancelada') {
      return 'Reservas canceladas';
    }

    return 'Reservas expiradas';
  }

  get emptyTitle(): string {
    if (this.activeTab === 'pendiente') {
      return 'No hay reservas pendientes';
    }

    if (this.activeTab === 'entregado') {
      return 'No hay reservas entregadas';
    }

    if (this.activeTab === 'cancelada') {
      return 'No hay reservas canceladas';
    }

    return 'No hay reservas expiradas';
  }

  get emptyMessage(): string {
    if (this.activeTab === 'pendiente') {
      return 'Cuando un usuario reserve un libro, aparecerá aquí para confirmar su entrega.';
    }

    if (this.activeTab === 'entregado') {
      return 'Las reservas confirmadas y convertidas en préstamo aparecerán aquí.';
    }

    if (this.activeTab === 'cancelada') {
      return 'Las reservas rechazadas o canceladas aparecerán aquí.';
    }

    return 'Las reservas que vencieron por tiempo aparecerán aquí.';
  }

  trackByReservationId(index: number, reservation: Reservation): number {
    return reservation.id;
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
    const idValue = Number(reservation.id);

    if (!Number.isNaN(idValue) && idValue > 0) {
      return idValue;
    }

    const dateTimeValue = new Date(
      `${reservation.requestDate} ${reservation.requestTime}`
    ).getTime();

    if (!Number.isNaN(dateTimeValue)) {
      return dateTimeValue;
    }

    const expiresAtValue = new Date(reservation.expiresAt).getTime();

    if (!Number.isNaN(expiresAtValue)) {
      return expiresAtValue;
    }

    return 0;
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

            this.waitlistService.notifyNextUser(
              deliveredReservation.bookId
            );

            this.uiFeedback.success(
              'Libro entregado correctamente. El préstamo ha iniciado.'
            );

            this.finishProcessing();
            this.loadReservationsFromApi(true);
          },
          error: error => {
            this.finishProcessing();

            this.uiFeedback.error(
              error?.error?.detail ||
              'La reserva se marcó como entregada, pero no se pudo crear el préstamo.'
            );
          }
        });
      },
      error: error => {
        this.finishProcessing();

        this.uiFeedback.error(
          error?.error?.detail ||
          'No se pudo confirmar la entrega.'
        );
      }
    });
  }

  cancelReservation(reservation: Reservation): void {
    if (this.processingReservationId !== null) {
      return;
    }

    this.uiFeedback.confirm({
      title: 'Cancelar reserva',
      message: `¿Seguro que deseas rechazar o cancelar la reserva ${reservation.folio}?`,
      confirmText: 'Cancelar reserva',
      cancelText: 'Conservar',
      type: 'danger'
    }).subscribe(confirmed => {
      if (!confirmed) {
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

          this.waitlistService.notifyNextUser(
            cancelledReservation.bookId
          );

          this.uiFeedback.success(
            'Reserva cancelada. El libro volvió al inventario y se notificó al siguiente usuario en lista de espera.'
          );

          this.finishProcessing();
          this.loadReservationsFromApi(true);
        },
        error: error => {
          this.finishProcessing();

          this.uiFeedback.error(
            error?.error?.detail ||
            'No se pudo cancelar la reserva.'
          );
        }
      });
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

  getStatusBadgeClass(status: Reservation['status']): string {
    if (status === 'pendiente') {
      return 'pending-badge';
    }

    if (status === 'entregado') {
      return 'delivered-badge';
    }

    if (status === 'expirada') {
      return 'expired-badge';
    }

    return 'cancelled-badge';
  }

  getCardClass(status: Reservation['status']): string {
    if (status === 'entregado') {
      return 'history-delivered';
    }

    if (status === 'expirada') {
      return 'history-expired';
    }

    if (status === 'cancelada') {
      return 'history-cancelled';
    }

    return 'pending-card';
  }
}