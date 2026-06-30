import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';

import { Reservation } from '../../models/reservation.model';
import { ReservationService } from '../../services/reservation';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

type ReservationSection = 'pending' | 'delivered' | 'cancelled' | 'expired';

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

  activeSection: ReservationSection = 'pending';

  isLoading = false;
  loadError = false;

  private syncTimer: any = null;
  private readonly syncInterval = 3000;
  private isSyncing = false;

  constructor(
    private reservationService: ReservationService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReservations();
    this.startAutoSync();
  }

  ngOnDestroy(): void {
    this.stopAutoSync();
  }

  private startAutoSync(): void {
    this.stopAutoSync();

    this.syncTimer = setInterval(() => {
      this.loadReservations(true);
    }, this.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  loadReservations(silent: boolean = false): void {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    if (!silent) {
      this.isLoading = true;
    }

    this.loadError = false;

    this.reservationService.loadReservations().pipe(
      catchError(error => {
        console.error('Error al cargar reservas:', error);
        this.loadError = true;
        return of([]);
      }),
      finalize(() => {
        this.isSyncing = false;

        if (!silent) {
          this.isLoading = false;
        }

        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: (data: Reservation[] | any) => {
        const incomingReservations = Array.isArray(data) ? data : [];
        this.reservations = this.sortReservationsNewestFirst(incomingReservations);
      },
      error: error => {
        console.error('Error general al cargar reservas:', error);
        this.loadError = true;
      }
    });
  }

  changeSection(section: ReservationSection): void {
    this.activeSection = section;
  }

  get pendingReservations(): Reservation[] {
    return this.reservations.filter(reservation =>
      this.normalizeStatus(reservation.status) === 'pending'
    );
  }

  get deliveredReservations(): Reservation[] {
    return this.reservations.filter(reservation =>
      this.normalizeStatus(reservation.status) === 'delivered'
    );
  }

  get cancelledReservations(): Reservation[] {
    return this.reservations.filter(reservation =>
      this.normalizeStatus(reservation.status) === 'cancelled'
    );
  }

  get expiredReservations(): Reservation[] {
    return this.reservations.filter(reservation =>
      this.normalizeStatus(reservation.status) === 'expired'
    );
  }

  get filteredReservations(): Reservation[] {
    if (this.activeSection === 'pending') {
      return this.pendingReservations;
    }

    if (this.activeSection === 'delivered') {
      return this.deliveredReservations;
    }

    if (this.activeSection === 'cancelled') {
      return this.cancelledReservations;
    }

    return this.expiredReservations;
  }

  get sectionTitle(): string {
    if (this.activeSection === 'pending') {
      return 'Reservas pendientes';
    }

    if (this.activeSection === 'delivered') {
      return 'Reservas entregadas';
    }

    if (this.activeSection === 'cancelled') {
      return 'Reservas canceladas';
    }

    return 'Reservas expiradas';
  }

  get emptyMessage(): string {
    if (this.activeSection === 'pending') {
      return 'No hay reservas pendientes.';
    }

    if (this.activeSection === 'delivered') {
      return 'No hay reservas entregadas.';
    }

    if (this.activeSection === 'cancelled') {
      return 'No hay reservas canceladas.';
    }

    return 'No hay reservas expiradas.';
  }

  trackByReservationId(index: number, reservation: Reservation): number {
    return reservation.id;
  }

  private sortReservationsNewestFirst(reservations: Reservation[]): Reservation[] {
    return [...reservations].sort((a, b) =>
      this.getReservationOrderValue(b) - this.getReservationOrderValue(a)
    );
  }

  private getReservationOrderValue(reservation: Reservation): number {
    const dateValue = reservation.requestDate
      ? new Date(reservation.requestDate).getTime()
      : 0;

    const idValue = Number(reservation.id);

    if (!Number.isNaN(dateValue) && dateValue > 0 && !Number.isNaN(idValue)) {
      return dateValue + idValue / 10000000000000;
    }

    if (!Number.isNaN(idValue) && idValue > 0) {
      return idValue;
    }

    return Number.isNaN(dateValue) ? 0 : dateValue;
  }

  private normalizeStatus(status: string | undefined | null): ReservationSection | 'other' {
    const rawStatus = String(status || '').trim().toLowerCase();

    if (
      rawStatus.includes('pendiente') ||
      rawStatus === 'pending'
    ) {
      return 'pending';
    }

    if (
      rawStatus.includes('entregada') ||
      rawStatus.includes('confirmada') ||
      rawStatus.includes('prestamo iniciado') ||
      rawStatus.includes('préstamo iniciado') ||
      rawStatus === 'delivered'
    ) {
      return 'delivered';
    }

    if (
      rawStatus.includes('cancelada') ||
      rawStatus === 'cancelled'
    ) {
      return 'cancelled';
    }

    if (
      rawStatus.includes('expirada') ||
      rawStatus.includes('expirado') ||
      rawStatus === 'expired'
    ) {
      return 'expired';
    }

    return 'other';
  }

  getStatusText(status: string): string {
    const normalized = this.normalizeStatus(status);

    if (normalized === 'pending') {
      return 'Pendiente';
    }

    if (normalized === 'delivered') {
      return 'Entregada';
    }

    if (normalized === 'cancelled') {
      return 'Cancelada';
    }

    if (normalized === 'expired') {
      return 'Expirada';
    }

    return status || 'Sin estado';
  }

  getReservationMessage(reservation: Reservation): string {
    const normalized = this.normalizeStatus(reservation.status);

    if (normalized === 'pending') {
      return 'Esta reserva sigue pendiente de entrega por parte del bibliotecario.';
    }

    if (normalized === 'delivered') {
      return 'La entrega fue confirmada y el préstamo ya fue iniciado.';
    }

    if (normalized === 'cancelled') {
      return 'La reserva fue cancelada y ya no se encuentra activa.';
    }

    if (normalized === 'expired') {
      return 'La reserva venció porque no fue atendida dentro del tiempo permitido.';
    }

    return 'Movimiento registrado en el sistema.';
  }

  getCardClass(reservation: Reservation): string {
    const normalized = this.normalizeStatus(reservation.status);

    if (normalized === 'pending') {
      return 'pending-card';
    }

    if (normalized === 'delivered') {
      return 'delivered-card';
    }

    if (normalized === 'cancelled') {
      return 'cancelled-card';
    }

    if (normalized === 'expired') {
      return 'expired-card';
    }

    return '';
  }

  getStatusClass(reservation: Reservation): string {
    const normalized = this.normalizeStatus(reservation.status);

    if (normalized === 'pending') {
      return 'status-pending';
    }

    if (normalized === 'delivered') {
      return 'status-delivered';
    }

    if (normalized === 'cancelled') {
      return 'status-cancelled';
    }

    if (normalized === 'expired') {
      return 'status-expired';
    }

    return '';
  }

  getMessageClass(reservation: Reservation): string {
    const normalized = this.normalizeStatus(reservation.status);

    if (normalized === 'pending') {
      return 'message-pending';
    }

    if (normalized === 'delivered') {
      return 'message-delivered';
    }

    if (normalized === 'cancelled') {
      return 'message-cancelled';
    }

    if (normalized === 'expired') {
      return 'message-expired';
    }

    return '';
  }
}