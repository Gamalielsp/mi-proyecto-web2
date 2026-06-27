import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { WaitlistEntry } from '../models/waitlist.model';
import { ReservationService } from './reservation';
import { LoanService } from './loan.service';
import { BookService } from './book.service';

@Injectable({
  providedIn: 'root'
})
export class WaitlistService {

  private apiUrl = 'http://127.0.0.1:8000/waitlist';
  private waitlist: WaitlistEntry[] = [];

  constructor(
    private reservationService: ReservationService,
    private loanService: LoanService,
    private bookService: BookService,
    private http: HttpClient
  ) {
    this.loadWaitlist().subscribe({
      next: () => {},
      error: () => {}
    });
  }

  private normalizeEntry(entry: WaitlistEntry): WaitlistEntry {
    return {
      ...entry,
      id: Number(entry.id),
      bookId: Number(entry.bookId),
      position: Number(entry.position),
      reservedUntil: entry.reservedUntil
        ? Number(entry.reservedUntil)
        : undefined
    };
  }

  loadWaitlist(): Observable<WaitlistEntry[]> {
    return this.http.get<WaitlistEntry[]>(`${this.apiUrl}/`).pipe(
      map(entries => entries.map(entry => this.normalizeEntry(entry))),
      tap(entries => {
        this.waitlist = entries;
        this.cleanInvalidEntries(false);
      })
    );
  }

  getWaitlist(): WaitlistEntry[] {
    this.cleanInvalidEntries();
    return [...this.waitlist];
  }

  getUserWaitlistEntry(
    matricula: string,
    bookId: number
  ): WaitlistEntry | null {
    this.cleanInvalidEntries();

    return this.waitlist.find(entry =>
      entry.matricula === matricula &&
      entry.bookId === bookId &&
      (
        entry.status === 'esperando' ||
        (
          entry.status === 'notificado' &&
          !!entry.reservedUntil &&
          Date.now() <= entry.reservedUntil
        )
      )
    ) || null;
  }

  getUserNotifications(matricula: string): WaitlistEntry[] {
    this.cleanInvalidEntries();

    return this.waitlist.filter(entry =>
      entry.matricula === matricula &&
      entry.status === 'notificado' &&
      !!entry.reservedUntil &&
      Date.now() <= entry.reservedUntil
    );
  }

  getActiveNotifications(): WaitlistEntry[] {
    this.cleanInvalidEntries();

    return this.waitlist.filter(entry =>
      entry.status === 'notificado' &&
      !!entry.reservedUntil &&
      Date.now() <= entry.reservedUntil
    );
  }

  getActiveNotificationForBook(bookId: number): WaitlistEntry | null {
    this.cleanInvalidEntries();

    return this.waitlist.find(entry =>
      entry.bookId === bookId &&
      entry.status === 'notificado' &&
      !!entry.reservedUntil &&
      Date.now() <= entry.reservedUntil
    ) || null;
  }

  isBookLockedByWaitlistForUser(
    bookId: number,
    matricula: string
  ): boolean {
    const activeNotification =
      this.getActiveNotificationForBook(bookId);

    if (!activeNotification) {
      return false;
    }

    return activeNotification.matricula !== matricula;
  }

  addToWaitlist(bookId: number, bookTitle: string) {
    this.cleanInvalidEntries();

    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    if (!currentUser?.matricula) {
      return {
        success: false,
        message: 'No se encontró la sesión del usuario.',
        entry: null
      };
    }

    const hasActiveLoan = this.loanService.hasBookAlready(
      currentUser.matricula,
      bookId
    );

    if (hasActiveLoan) {
      return {
        success: false,
        message: 'Ya tienes un préstamo activo de este libro. No puedes entrar a la lista de espera del mismo libro.',
        entry: null
      };
    }

    const hasPendingReservation =
      this.reservationService.hasPendingReservation(
        currentUser.matricula,
        bookId
      );

    if (hasPendingReservation) {
      return {
        success: false,
        message: 'Ya tienes una reserva pendiente para este libro. No puedes entrar a la lista de espera del mismo libro.',
        entry: null
      };
    }

    const existingEntry = this.waitlist.find(entry =>
      entry.bookId === bookId &&
      entry.matricula === currentUser.matricula &&
      (
        entry.status === 'esperando' ||
        (
          entry.status === 'notificado' &&
          !!entry.reservedUntil &&
          Date.now() <= entry.reservedUntil
        )
      )
    );

    if (existingEntry) {
      return {
        success: false,
        message: `Ya estás en la lista de espera. Tu posición actual es #${existingEntry.position}.`,
        entry: existingEntry
      };
    }

    const position = this.waitlist.filter(entry =>
      entry.bookId === bookId &&
      (
        entry.status === 'esperando' ||
        (
          entry.status === 'notificado' &&
          !!entry.reservedUntil &&
          Date.now() <= entry.reservedUntil
        )
      )
    ).length + 1;

    const entry: WaitlistEntry = {
      id: Date.now(),
      bookId,
      bookTitle,
      studentName: currentUser.name || 'Usuario sin nombre',
      matricula: currentUser.matricula,
      requestDate: new Date().toISOString().split('T')[0],
      position,
      status: 'esperando'
    };

    this.waitlist = [
      ...this.waitlist,
      entry
    ];

    this.http.post<{
      message: string;
      entry: WaitlistEntry;
    }>(
      `${this.apiUrl}/`,
      entry
    ).subscribe({
      next: response => {
        const savedEntry = this.normalizeEntry(response.entry);

        this.waitlist = this.waitlist.map(item =>
          item.id === entry.id
            ? savedEntry
            : item
        );

        this.recalculatePositions();
      },
      error: error => {
        this.waitlist = this.waitlist.filter(item =>
          item.id !== entry.id
        );

        alert(error?.error?.detail || 'No se pudo guardar la lista de espera en MongoDB.');
      }
    });

    return {
      success: true,
      message: 'Te agregaste correctamente a la lista de espera.',
      entry
    };
  }

  notifyNextUser(bookId: number): void {
    this.loadWaitlist().subscribe({
      next: () => {
        this.bookService.loadBooks().subscribe({
          next: () => this.notifyNextUserWithCurrentData(bookId),
          error: () => this.notifyNextUserWithCurrentData(bookId)
        });
      },
      error: () => {
        this.bookService.loadBooks().subscribe({
          next: () => this.notifyNextUserWithCurrentData(bookId),
          error: () => this.notifyNextUserWithCurrentData(bookId)
        });
      }
    });
  }

  private notifyNextUserWithCurrentData(bookId: number): void {
    this.cleanInvalidEntries(false);

    const book = this.bookService.getBookById(bookId);
    const availableStock = Number(
      book?.availableCopies ?? book?.stock ?? 0
    );

    if (!book || book.isActive === false || availableStock <= 0) {
      return;
    }

    const alreadyActive = this.waitlist.some(entry =>
      entry.bookId === bookId &&
      entry.status === 'notificado' &&
      !!entry.reservedUntil &&
      Date.now() <= entry.reservedUntil
    );

    if (alreadyActive) {
      return;
    }

    const nextEntry = this.waitlist
      .filter(entry =>
        entry.bookId === bookId &&
        entry.status === 'esperando'
      )
      .sort((a, b) => a.position - b.position)[0];

    if (!nextEntry) {
      return;
    }

    const reservedUntil = Date.now() + (60 * 60 * 1000);

    this.waitlist = this.waitlist.map(entry =>
      entry.id === nextEntry.id
        ? {
            ...entry,
            status: 'notificado',
            reservedUntil
          }
        : entry
    );

    this.http.patch<{
      message: string;
      entry: WaitlistEntry;
    }>(
      `${this.apiUrl}/${nextEntry.id}/notify`,
      {
        reservedUntil
      }
    ).subscribe({
      next: response => {
        const updatedEntry = this.normalizeEntry(response.entry);

        this.waitlist = this.waitlist.map(item =>
          item.id === updatedEntry.id
            ? updatedEntry
            : item
        );
      },
      error: () => {
        this.waitlist = this.waitlist.map(entry =>
          entry.id === nextEntry.id
            ? {
                ...entry,
                status: 'esperando',
                reservedUntil: undefined
              }
            : entry
        );
      }
    });
  }

  confirmReservation(entryId: number): void {
    this.cleanInvalidEntries();

    const entry = this.waitlist.find(item =>
      item.id === entryId &&
      item.status === 'notificado' &&
      !!item.reservedUntil &&
      Date.now() <= item.reservedUntil
    );

    if (!entry) {
      return;
    }

    this.waitlist = this.waitlist.filter(item =>
      item.id !== entryId
    );

    this.recalculatePositions();

    this.http.delete(
      `${this.apiUrl}/${entryId}`
    ).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  completeReservationByBookAndMatricula(
    bookId: number,
    matricula: string
  ): void {
    this.cleanInvalidEntries();

    this.waitlist = this.waitlist.filter(item =>
      !(
        item.bookId === bookId &&
        item.matricula === matricula
      )
    );

    this.recalculatePositions();

    this.http.delete(
      `${this.apiUrl}/book/${bookId}/user/${matricula}`
    ).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  removeEntry(entryId: number): void {
    this.cleanInvalidEntries();

    const entry = this.waitlist.find(item =>
      item.id === entryId
    );

    const bookId = entry?.bookId;

    this.waitlist = this.waitlist.filter(item =>
      item.id !== entryId
    );

    this.recalculatePositions();

    this.http.delete(
      `${this.apiUrl}/${entryId}`
    ).subscribe({
      next: () => {},
      error: () => {}
    });

    if (bookId) {
      this.notifyNextUser(bookId);
    }
  }

  getMinutesLeft(entry: WaitlistEntry): number {
    if (!entry.reservedUntil) {
      return 0;
    }

    const diff = entry.reservedUntil - Date.now();

    if (diff <= 0) {
      return 0;
    }

    return Math.ceil(diff / 60000);
  }

  cleanExpiredNotifications(): void {
    this.cleanInvalidEntries();
  }

  private cleanInvalidEntries(notifyAfterClean: boolean = true): void {
    const now = Date.now();

    const expiredEntries = this.waitlist.filter(entry =>
      entry.status === 'notificado' &&
      (
        !entry.reservedUntil ||
        now > entry.reservedUntil
      )
    );

    const expiredBookIds = expiredEntries.map(entry =>
      entry.bookId
    );

    const before = this.waitlist.length;

    this.waitlist = this.waitlist.filter(entry => {
      if (
        entry.status === 'notificado' &&
        (
          !entry.reservedUntil ||
          now > entry.reservedUntil
        )
      ) {
        return false;
      }

      if (
        entry.status === 'reserva_confirmada' ||
        entry.status === 'vencido' ||
        entry.status === 'cancelado'
      ) {
        return false;
      }

      return true;
    });

    if (this.waitlist.length !== before) {
      expiredEntries.forEach(entry => {
        this.http.delete(
          `${this.apiUrl}/${entry.id}`
        ).subscribe({
          next: () => {},
          error: () => {}
        });
      });

      this.recalculatePositions();

      if (notifyAfterClean) {
        const uniqueBookIds = [
          ...new Set(expiredBookIds)
        ];

        uniqueBookIds.forEach(bookId => {
          this.notifyNextUser(bookId);
        });
      }
    }
  }

  private recalculatePositions(): void {
    const bookIds = [
      ...new Set(this.waitlist.map(entry => entry.bookId))
    ];

    bookIds.forEach(bookId => {
      const entries = this.waitlist
        .filter(entry => entry.bookId === bookId)
        .sort((a, b) => a.position - b.position);

      entries.forEach((entry, index) => {
        entry.position = index + 1;
      });
    });
  }
}
