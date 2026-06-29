import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { WaitlistEntry } from '../../models/waitlist.model';
import { WaitlistService } from '../../services/waitlist.service';
import { ReservationService } from '../../services/reservation';
import { BookService } from '../../services/book.service';
import { UiFeedbackService } from '../../services/ui-feedback.service';

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
export class Alerts implements OnInit, OnDestroy {

  currentUser: any = {};

  alerts: WaitlistEntry[] = [];

  confirmingEntryId: number | null = null;

  isLoading = false;
  loadError = false;

  private syncTimer: any = null;
  private readonly syncInterval = 3000;
  private isSyncing = false;

  constructor(
    private waitlistService: WaitlistService,
    private reservationService: ReservationService,
    private bookService: BookService,
    private uiFeedback: UiFeedbackService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    this.loadData(true);
    this.startAutoSync();
  }

  ngOnDestroy(): void {
    this.stopAutoSync();
  }

  private startAutoSync(): void {
    this.stopAutoSync();

    this.syncTimer = setInterval(() => {
      if (this.confirmingEntryId !== null) {
        return;
      }

      this.loadData(true);
    }, this.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  get roleLabel(): string {
    if (this.currentUser?.role === 'profesor') {
      return 'Profesor';
    }

    return 'Alumno';
  }

  loadData(silent: boolean = false): void {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    if (!silent) {
      this.isLoading = true;
    }

    this.loadError = false;

    forkJoin({
      books: this.bookService.loadBooks().pipe(
        catchError(error => {
          console.error('Error al cargar libros:', error);
          this.loadError = true;
          return of([]);
        })
      ),

      waitlist: this.waitlistService.loadWaitlist().pipe(
        catchError(error => {
          console.error('Error al cargar lista de espera:', error);
          this.loadError = true;
          return of([]);
        })
      )
    })
      .pipe(
        finalize(() => {
          this.isSyncing = false;

          if (!silent) {
            this.isLoading = false;
          }

          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.refreshAlerts();
        },
        error: error => {
          console.error('Error general al cargar alertas:', error);
          this.loadError = true;
          this.refreshAlerts();
        }
      });
  }

  private refreshAlerts(): void {
    if (!this.currentUser?.matricula) {
      this.alerts = [];
      return;
    }

    this.alerts = this.sortEntriesNewestFirst(
      this.waitlistService.getUserNotifications(
        this.currentUser.matricula
      )
    );
  }

  private sortEntriesNewestFirst(
    entries: WaitlistEntry[]
  ): WaitlistEntry[] {
    return [...entries].sort((a, b) =>
      this.getEntryOrderValue(b) -
      this.getEntryOrderValue(a)
    );
  }

  private getEntryOrderValue(entry: WaitlistEntry): number {
    const reservedUntil = Number(entry.reservedUntil);

    if (!Number.isNaN(reservedUntil) && reservedUntil > 0) {
      return reservedUntil;
    }

    const idValue = Number(entry.id);

    if (!Number.isNaN(idValue) && idValue > 0) {
      return idValue;
    }

    const dateValue = new Date(entry.requestDate).getTime();

    if (!Number.isNaN(dateValue)) {
      return dateValue;
    }

    return 0;
  }

  getMinutesLeft(entry: WaitlistEntry): number {
    return this.waitlistService.getMinutesLeft(entry);
  }

  confirmReservation(entry: WaitlistEntry): void {
    if (this.confirmingEntryId !== null) {
      return;
    }

    if (
      entry.status !== 'notificado' ||
      !entry.reservedUntil ||
      Date.now() > entry.reservedUntil
    ) {
      this.uiFeedback.warning(
        'La notificación ya no está disponible. Vuelve a revisar tus alertas.'
      );

      this.loadData(true);
      return;
    }

    this.confirmingEntryId = entry.id;

    const book = this.bookService.getBooks().find(item =>
      item.id === entry.bookId &&
      item.isActive !== false
    );

    if (!book) {
      this.confirmingEntryId = null;
      this.uiFeedback.error(
        'No se encontró la información del libro o el libro ya no está activo.'
      );
      return;
    }

    /*
      Importante:
      NO se valida stock aquí.

      Si el usuario recibió alerta, el backend ya apartó su copia.
      Por eso el libro puede verse con stock 0 y aun así debe poder confirmar.
    */

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

          this.uiFeedback.success(
            `Folio: ${reservation.folio}\n` +
            `Ahora aparecerá en Mis Libros / Reservas.`,
            'Solicitud de reserva confirmada'
          );

          this.confirmingEntryId = null;
          this.loadData(true);
        },
        error: error => {
          this.confirmingEntryId = null;

          this.uiFeedback.error(
            error?.error?.detail ||
            'Ocurrió un error al confirmar la solicitud de reserva.'
          );

          this.loadData(true);
        }
      });
    } catch (error) {
      this.confirmingEntryId = null;

      if (error instanceof Error) {
        this.uiFeedback.error(error.message);
      } else {
        this.uiFeedback.error(
          'Ocurrió un error al confirmar la solicitud de reserva.'
        );
      }

      this.loadData(true);
    }
  }
}