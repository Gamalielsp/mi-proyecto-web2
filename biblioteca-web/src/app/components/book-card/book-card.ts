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

  private timer: any;

  constructor(
    private waitlistService: WaitlistService,
    private reservationService: ReservationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.refreshWaitlistState();

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

    if (
      this.userWaitlistEntry &&
      this.userWaitlistEntry.status === 'notificado' &&
      this.userWaitlistEntry.reservedUntil &&
      Date.now() < this.userWaitlistEntry.reservedUntil &&
      this.book.stock > 0
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

    const diff =
      this.notifiedEntry.reservedUntil - Date.now();

    if (diff <= 0 || this.book.stock <= 0) {
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
    if (!this.notifiedEntry) {
      return;
    }

    try {
      const reservation = this.reservationService.createReservation(
        this.book.id,
        this.book.title,
        this.book.author
      );

      this.waitlistService.confirmReservation(
        this.notifiedEntry.id
      );

      alert(
        `Solicitud de reserva confirmada.\n\n` +
        `Folio: ${reservation.folio}\n` +
        `Ahora aparecerá en Mis Solicitudes de Reserva.`
      );

      this.notifiedEntry = null;
      this.userWaitlistEntry = null;
      this.waitlistEntry = null;
      this.waitlistMessage = '';

    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Ocurrió un error al confirmar la reserva.');
      }
    }
  }

  joinWaitlist(): void {
    const result = this.waitlistService.addToWaitlist(
      this.book.id,
      this.book.title
    );

    this.waitlistMessage = result.message;
    this.waitlistEntry = result.entry;
    this.refreshWaitlistState();
  }

  closeWaitlist(): void {
    this.waitlistEntry = null;
    this.waitlistMessage = '';
  }
}