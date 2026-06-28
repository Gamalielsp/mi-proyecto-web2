import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  catchError,
  map,
  of,
  tap
} from 'rxjs';

import { WaitlistEntry } from '../models/waitlist.model';
import { ReservationService } from './reservation';
import { LoanService } from './loan.service';
import { BookService } from './book.service';
import { UiFeedbackService } from './ui-feedback.service';

@Injectable({
  providedIn: 'root'
})
export class WaitlistService {

  private apiUrl = 'http://127.0.0.1:8000/waitlist';
  private waitlist: WaitlistEntry[] = [];

  private processingBookIds = new Set<number>();

  constructor(
    private reservationService: ReservationService,
    private loanService: LoanService,
    private bookService: BookService,
    private http: HttpClient,
    private uiFeedback: UiFeedbackService
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
      map(entries =>
        entries.map(entry =>
          this.normalizeEntry(entry)
        )
      ),
      tap(entries => {
        this.waitlist = entries;
        this.recalculatePositions();
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

  getActiveNotificationsForBook(bookId: number): WaitlistEntry[] {
    this.cleanInvalidEntries();

    return this.waitlist.filter(entry =>
      entry.bookId === bookId &&
      entry.status === 'notificado' &&
      !!entry.reservedUntil &&
      Date.now() <= entry.reservedUntil
    );
  }

  getActiveNotificationForBook(bookId: number): WaitlistEntry | null {
    const activeNotifications =
      this.getActiveNotificationsForBook(bookId);

    return activeNotifications.length > 0
      ? activeNotifications[0]
      : null;
  }

  isBookLockedByWaitlistForUser(
    bookId: number,
    matricula: string
  ): boolean {
    this.cleanInvalidEntries();

    const activeNotifications =
      this.getActiveNotificationsForBook(bookId);

    const waitingEntries = this.waitlist.filter(entry =>
      entry.bookId === bookId &&
      entry.status === 'esperando'
    );

    if (
      activeNotifications.length === 0 &&
      waitingEntries.length === 0
    ) {
      return false;
    }

    const userHasActiveNotification =
      activeNotifications.some(entry =>
        entry.matricula === matricula
      );

    if (userHasActiveNotification) {
      return false;
    }

    return true;
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
        this.notifyNextUser(bookId);
      },
      error: error => {
        this.waitlist = this.waitlist.filter(item =>
          item.id !== entry.id
        );

        this.uiFeedback.error(
          error?.error?.detail ||
          'No se pudo guardar la lista de espera en MongoDB.'
        );
      }
    });

    return {
      success: true,
      message: 'Te agregaste correctamente a la lista de espera.',
      entry
    };
  }

  notifyNextUser(bookId: number): void {
    if (this.processingBookIds.has(bookId)) {
      return;
    }

    this.processingBookIds.add(bookId);

    this.http.post<{
      message: string;
      notified: WaitlistEntry[];
      entries: WaitlistEntry[];
    }>(
      `${this.apiUrl}/process/${bookId}`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Error al procesar lista de espera:', error);
        return of(null);
      })
    ).subscribe({
      next: response => {
        if (response?.entries) {
          const normalizedEntries = response.entries.map(entry =>
            this.normalizeEntry(entry)
          );

          const otherEntries = this.waitlist.filter(entry =>
            entry.bookId !== bookId
          );

          this.waitlist = [
            ...otherEntries,
            ...normalizedEntries
          ];

          this.recalculatePositions();
        }

        this.bookService.loadBooks().subscribe({
          next: () => {},
          error: () => {}
        });

        this.loadWaitlist().subscribe({
          next: () => {},
          error: () => {}
        });

        this.processingBookIds.delete(bookId);
      },
      error: () => {
        this.processingBookIds.delete(bookId);
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

    const bookId = entry.bookId;

    this.waitlist = this.waitlist.filter(item =>
      item.id !== entryId
    );

    this.recalculatePositions();

    this.http.delete(
      `${this.apiUrl}/${entryId}?release_stock=false`
    ).subscribe({
      next: () => {
        this.loadWaitlist().subscribe({
          next: () => {},
          error: () => {}
        });

        this.bookService.loadBooks().subscribe({
          next: () => this.notifyNextUser(bookId),
          error: () => this.notifyNextUser(bookId)
        });
      },
      error: () => {
        this.loadWaitlist().subscribe({
          next: () => {},
          error: () => {}
        });

        this.bookService.loadBooks().subscribe({
          next: () => this.notifyNextUser(bookId),
          error: () => this.notifyNextUser(bookId)
        });
      }
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
      `${this.apiUrl}/book/${bookId}/user/${matricula}?release_stock=false`
    ).subscribe({
      next: () => {
        this.loadWaitlist().subscribe({
          next: () => {},
          error: () => {}
        });

        this.bookService.loadBooks().subscribe({
          next: () => this.notifyNextUser(bookId),
          error: () => this.notifyNextUser(bookId)
        });
      },
      error: () => {
        this.loadWaitlist().subscribe({
          next: () => {},
          error: () => {}
        });

        this.bookService.loadBooks().subscribe({
          next: () => this.notifyNextUser(bookId),
          error: () => this.notifyNextUser(bookId)
        });
      }
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
      next: () => {
        if (bookId) {
          this.loadWaitlist().subscribe({
            next: () => {},
            error: () => {}
          });

          this.bookService.loadBooks().subscribe({
            next: () => this.notifyNextUser(bookId),
            error: () => this.notifyNextUser(bookId)
          });
        }
      },
      error: () => {
        if (bookId) {
          this.notifyNextUser(bookId);
        }
      }
    });
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

  private cleanInvalidEntries(): void {
    const now = Date.now();

    const expiredEntries = this.waitlist.filter(entry =>
      entry.status === 'notificado' &&
      (
        !entry.reservedUntil ||
        now > entry.reservedUntil
      )
    );

    if (expiredEntries.length === 0) {
      return;
    }

    const expiredBookIds = [
      ...new Set(
        expiredEntries.map(entry =>
          entry.bookId
        )
      )
    ];

    this.waitlist = this.waitlist.filter(entry =>
      !expiredEntries.some(expired =>
        expired.id === entry.id
      )
    );

    this.recalculatePositions();

    expiredEntries.forEach(entry => {
      this.http.delete(
        `${this.apiUrl}/${entry.id}?release_stock=true`
      ).subscribe({
        next: () => {},
        error: () => {}
      });
    });

    expiredBookIds.forEach(bookId => {
      this.bookService.loadBooks().subscribe({
        next: () => this.notifyNextUser(bookId),
        error: () => this.notifyNextUser(bookId)
      });
    });
  }

  private recalculatePositions(): void {
    const bookIds = [
      ...new Set(this.waitlist.map(entry => entry.bookId))
    ];

    bookIds.forEach(bookId => {
      const entries = this.waitlist
        .filter(entry =>
          entry.bookId === bookId &&
          (
            entry.status === 'esperando' ||
            (
              entry.status === 'notificado' &&
              !!entry.reservedUntil &&
              Date.now() <= entry.reservedUntil
            )
          )
        )
        .sort((a, b) => {
          const positionA = Number(a.position);
          const positionB = Number(b.position);

          if (
            !Number.isNaN(positionA) &&
            !Number.isNaN(positionB) &&
            positionA !== positionB
          ) {
            return positionA - positionB;
          }

          return Number(a.id) - Number(b.id);
        });

      entries.forEach((entry, index) => {
        entry.position = index + 1;
      });
    });
  }
}