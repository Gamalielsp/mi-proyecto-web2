import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { Book } from '../../models/book.model';
import { WaitlistEntry } from '../../models/waitlist.model';

import { WaitlistService } from '../../services/waitlist.service';
import { ReservationService } from '../../services/reservation';
import { UiFeedbackService } from '../../services/ui-feedback.service';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './book-card.html',
  styleUrl: './book-card.css'
})
export class BookCardComponent implements OnInit, OnDestroy {

  @Input() book!: Book;
  @Input() reserved = false;
  @Input() waitlistLocked = false;

  @Output() reserve = new EventEmitter<Book>();

  waitlistEntry: WaitlistEntry | null = null;
  waitlistMessage = '';

  userWaitlistEntry: WaitlistEntry | null = null;
  notifiedEntry: WaitlistEntry | null = null;

  minutesLeft = 0;
  secondsLeft = 0;

  joiningWaitlist = false;
  confirmingWaitlist = false;

  private timer: any = null;

  constructor(
    private waitlistService: WaitlistService,
    private reservationService: ReservationService,
    private uiFeedbackService: UiFeedbackService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.waitlistService.loadWaitlist().subscribe({
      next: () => {
        this.refreshWaitlistState();
        this.cdr.detectChanges();
      },
      error: () => {
        this.refreshWaitlistState();
        this.cdr.detectChanges();
      }
    });

    this.timer = setInterval(() => {
      this.refreshWaitlistState();
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  get visibleStock(): number {
    return this.waitlistLocked ? 0 : Number(this.book.stock ?? 0);
  }

  get available(): boolean {
    return this.visibleStock > 0;
  }

  get formattedTime(): string {
    const minutes = this.minutesLeft
      .toString()
      .padStart(2, '0');

    const seconds = this.secondsLeft
      .toString()
      .padStart(2, '0');

    return `${minutes}:${seconds}`;
  }

  refreshWaitlistState(): void {
    this.loadUserWaitlistData();
    this.updateCountdown();
  }

  loadUserWaitlistData(): void {
    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    if (!currentUser?.matricula || !this.book?.id) {
      this.userWaitlistEntry = null;
      this.notifiedEntry = null;
      return;
    }

    this.userWaitlistEntry =
      this.waitlistService.getUserWaitlistEntry(
        currentUser.matricula,
        this.book.id
      );

    /*
      No se revisa stock aquí.
      Si el usuario está notificado, el backend ya apartó su copia.
    */
    if (
      this.userWaitlistEntry &&
      this.userWaitlistEntry.status === 'notificado' &&
      !!this.userWaitlistEntry.reservedUntil &&
      Date.now() < this.userWaitlistEntry.reservedUntil
    ) {
      this.notifiedEntry = this.userWaitlistEntry;
      return;
    }

    this.notifiedEntry = null;
  }

  updateCountdown(): void {
    if (!this.notifiedEntry?.reservedUntil) {
      this.minutesLeft = 0;
      this.secondsLeft = 0;
      return;
    }

    const diff = this.notifiedEntry.reservedUntil - Date.now();

    /*
      No se revisa stock aquí.
      El tiempo es lo único que decide si puede confirmar.
    */
    if (diff <= 0) {
      this.minutesLeft = 0;
      this.secondsLeft = 0;
      this.notifiedEntry = null;
      this.userWaitlistEntry = null;

      this.waitlistService.cleanExpiredNotifications();
      this.loadUserWaitlistData();

      return;
    }

    this.minutesLeft = Math.floor(diff / 60000);

    this.secondsLeft = Math.floor(
      (diff % 60000) / 1000
    );
  }

  reserveBook(): void {
    this.reserve.emit(this.book);
  }

  confirmWaitlistReservation(): void {
    if (!this.notifiedEntry || this.confirmingWaitlist) {
      return;
    }

    this.confirmingWaitlist = true;

    const entryId = this.notifiedEntry.id;

    try {
      this.reservationService.createReservation(
        this.book.id,
        this.book.title,
        this.book.author
      ).subscribe({
        next: reservation => {
          this.waitlistService.confirmReservation(entryId);

          this.uiFeedbackService.success(
            `Folio: ${reservation.folio}\nAhora aparecerá en Mis Solicitudes de Reserva.`,
            'Solicitud de reserva confirmada'
          );

          this.notifiedEntry = null;
          this.userWaitlistEntry = null;
          this.waitlistEntry = null;
          this.waitlistMessage = '';
          this.confirmingWaitlist = false;

          this.cdr.detectChanges();
        },
        error: error => {
          this.confirmingWaitlist = false;

          this.uiFeedbackService.error(
            error?.error?.detail ||
            'Ocurrió un error al confirmar la reserva.'
          );

          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      this.confirmingWaitlist = false;

      if (error instanceof Error) {
        this.uiFeedbackService.error(error.message);
      } else {
        this.uiFeedbackService.error(
          'Ocurrió un error al confirmar la reserva.'
        );
      }

      this.cdr.detectChanges();
    }
  }

  joinWaitlist(): void {
    if (this.joiningWaitlist) {
      return;
    }

    this.joiningWaitlist = true;

    const result = this.waitlistService.addToWaitlist(
      this.book.id,
      this.book.title
    );

    this.waitlistMessage = result.message;
    this.waitlistEntry = result.entry;

    this.refreshWaitlistState();

    setTimeout(() => {
      this.joiningWaitlist = false;
      this.cdr.detectChanges();
    }, 500);
  }

  closeWaitlist(): void {
    this.waitlistEntry = null;
    this.waitlistMessage = '';
    this.cdr.detectChanges();
  }
}