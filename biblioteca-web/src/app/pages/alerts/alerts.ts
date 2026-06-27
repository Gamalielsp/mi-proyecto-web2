import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WaitlistEntry } from '../../models/waitlist.model';
import { WaitlistService } from '../../services/waitlist.service';
import { ReservationService } from '../../services/reservation';
import { BookService } from '../../services/book.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './alerts.html',
  styleUrl: './alerts.css'
})
export class Alerts {

  currentUser = JSON.parse(
    localStorage.getItem('currentUser') || '{}'
  );

  alerts: WaitlistEntry[] = [];
  confirmingEntryId: number | null = null;

  constructor(
    private waitlistService: WaitlistService,
    private reservationService: ReservationService,
    private bookService: BookService
  ) {
    this.loadData();
  }

  get roleLabel(): string {
    if (this.currentUser?.role === 'profesor') {
      return 'Profesor';
    }

    return 'Alumno';
  }

  loadData(): void {
    this.bookService.loadBooks().subscribe({
      next: () => {
        this.waitlistService.loadWaitlist().subscribe({
          next: () => this.refreshAlerts(),
          error: () => this.refreshAlerts()
        });
      },
      error: () => {
        this.waitlistService.loadWaitlist().subscribe({
          next: () => this.refreshAlerts(),
          error: () => this.refreshAlerts()
        });
      }
    });
  }

  private refreshAlerts(): void {
    this.alerts = this.waitlistService.getUserNotifications(
      this.currentUser.matricula
    );
  }

  getMinutesLeft(entry: WaitlistEntry): number {
    return this.waitlistService.getMinutesLeft(entry);
  }

  confirmReservation(entry: WaitlistEntry): void {
    if (this.confirmingEntryId !== null) {
      return;
    }

    this.confirmingEntryId = entry.id;

    const book = this.bookService.getBooks().find(item =>
      item.id === entry.bookId &&
      item.isActive !== false
    );

    if (!book) {
      this.confirmingEntryId = null;
      alert('No se encontró la información del libro o el libro ya no está activo.');
      return;
    }

    const availableStock = Number(
      book.availableCopies ?? book.stock ?? 0
    );

    if (availableStock <= 0) {
      this.confirmingEntryId = null;
      alert('El libro ya no tiene ejemplares disponibles para reservar.');
      return;
    }

    try {
      this.reservationService.createReservation(
        book.id,
        book.title,
        book.author
      ).subscribe({
        next: reservation => {
          this.waitlistService.confirmReservation(entry.id);

          this.alerts = this.alerts.filter(item =>
            item.id !== entry.id
          );

          alert(
            `Solicitud de reserva confirmada.

` +
            `Folio: ${reservation.folio}
` +
            `Ahora aparecerá en Mis Libros / Reservas.`
          );

          this.confirmingEntryId = null;
          this.loadData();
        },
        error: error => {
          this.confirmingEntryId = null;
          alert(error?.error?.detail || 'Ocurrió un error al confirmar la solicitud de reserva.');
        }
      });
    } catch (error) {
      this.confirmingEntryId = null;

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Ocurrió un error al confirmar la solicitud de reserva.');
      }
    }
  }
}
