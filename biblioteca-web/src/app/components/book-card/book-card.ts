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

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule],
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

  private timer: any;

  constructor(
    private waitlistService: WaitlistService,
    private reservationService: ReservationService,
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
    }
  }

  get visibleStock(): number {
    return this.waitlistLocked ? 0 : this.book.stock;
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

    this.userWaitlistEntry =
      this.waitlistService.getUserWaitlistEntry(
        currentUser.matricula,
        this.book.id
      );

    const stock = Number(
      this.book.availableCopies ?? this.book.stock ?? 0
    );

    if (
      this.userWaitlistEntry &&
      this.userWaitlistEntry.status === 'notificado' &&
      this.userWaitlistEntry.reservedUntil &&
      Date.now() < this.userWaitlistEntry.reservedUntil &&
      stock > 0
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
      this.notifiedEntry = null;
      return;
    }

    const diff = this.notifiedEntry.reservedUntil - Date.now();

    const stock = Number(
      this.book.availableCopies ?? this.book.stock ?? 0
    );

    if (diff <= 0 || stock <= 0) {
      this.minutesLeft = 0;
      this.secondsLeft = 0;
      this.notifiedEntry = null;
      this.userWaitlistEntry = null;

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

          alert(
            `Solicitud de reserva confirmada.

` +
            `Folio: ${reservation.folio}
` +
            `Ahora aparecerá en Mis Solicitudes de Reserva.`
          );

          this.notifiedEntry = null;
          this.userWaitlistEntry = null;
          this.waitlistEntry = null;
          this.waitlistMessage = '';
          this.confirmingWaitlist = false;
        },
        error: error => {
          this.confirmingWaitlist = false;
          alert(error?.error?.detail || 'Ocurrió un error al confirmar la reserva.');
        }
      });
    } catch (error) {
      this.confirmingWaitlist = false;

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Ocurrió un error al confirmar la reserva.');
      }
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
    }, 500);
  }

  closeWaitlist(): void {
    this.waitlistEntry = null;
    this.waitlistMessage = '';
  }
}
