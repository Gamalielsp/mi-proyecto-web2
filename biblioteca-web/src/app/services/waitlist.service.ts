import { Injectable } from '@angular/core';

import { WaitlistEntry } from '../models/waitlist.model';
import { ReservationService } from './reservation';
import { LoanService } from './loan.service';

@Injectable({
  providedIn: 'root'
})
export class WaitlistService {

  private storageKey = 'waitlist';
  private waitlist: WaitlistEntry[] = [];

  constructor(
    private reservationService: ReservationService,
    private loanService: LoanService
  ) {
    const savedWaitlist = localStorage.getItem(this.storageKey);

    if (savedWaitlist) {
      this.waitlist = JSON.parse(savedWaitlist);
    }

    this.cleanInvalidEntries();
  }

  private saveWaitlist(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.waitlist)
    );
  }

  private hasBookStock(bookId: number): boolean {
    const books = JSON.parse(
      localStorage.getItem('books') || '[]'
    );

    const book = books.find(
      (item: any) => item.id === bookId
    );

    return !!book && Number(book.stock) > 0;
  }

  getWaitlist(): WaitlistEntry[] {
    this.cleanInvalidEntries();
    return this.waitlist;
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

  getActiveNotificationForBook(
    bookId: number
  ): WaitlistEntry | null {
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

    const hasActiveLoan =
      this.loanService.hasBookAlready(
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
      studentName: currentUser.name,
      matricula: currentUser.matricula,
      requestDate: new Date().toISOString().split('T')[0],
      position,
      status: 'esperando'
    };

    this.waitlist.push(entry);
    this.saveWaitlist();

    return {
      success: true,
      message: 'Te agregaste correctamente a la lista de espera.',
      entry
    };
  }

  notifyNextUser(bookId: number): void {
    this.cleanInvalidEntries(false);

    if (!this.hasBookStock(bookId)) {
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

    nextEntry.status = 'notificado';
    nextEntry.reservedUntil =
      Date.now() + (60 * 60 * 1000);

    this.saveWaitlist();
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
    this.saveWaitlist();
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
    this.saveWaitlist();
  }

  removeEntry(entryId: number): void {
    this.cleanInvalidEntries();

    const entry =
      this.waitlist.find(item => item.id === entryId);

    const bookId = entry?.bookId;

    this.waitlist = this.waitlist.filter(item =>
      item.id !== entryId
    );

    this.recalculatePositions();
    this.saveWaitlist();

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

  private cleanInvalidEntries(
    notifyAfterClean: boolean = true
  ): void {
    const now = Date.now();

    const expiredBookIds = this.waitlist
      .filter(entry =>
        entry.status === 'notificado' &&
        (
          !entry.reservedUntil ||
          now > entry.reservedUntil
        )
      )
      .map(entry => entry.bookId);

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
      this.recalculatePositions();
      this.saveWaitlist();

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