import { Injectable } from '@angular/core';
import { WaitlistEntry } from '../models/waitlist.model';

@Injectable({
  providedIn: 'root'
})
export class WaitlistService {

  private storageKey = 'waitlist';

  private waitlist: WaitlistEntry[] = [];

  constructor() {

    const savedWaitlist = localStorage.getItem(
      this.storageKey
    );

    if (savedWaitlist) {

      this.waitlist = JSON.parse(savedWaitlist);

    }

  }

  private saveWaitlist(): void {

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.waitlist)
    );

  }

  getWaitlist(): WaitlistEntry[] {

    return this.waitlist;

  }

  getWaitlistByBook(
    bookId: number
  ): WaitlistEntry[] {

    return this.waitlist.filter(entry =>
      entry.bookId === bookId
    );

  }

  isAlreadyInWaitlist(
    bookId: number,
    matricula: string
  ): boolean {

    return this.waitlist.some(entry =>
      entry.bookId === bookId &&
      entry.matricula === matricula &&
      entry.status === 'esperando'
    );

  }

  getUserPosition(
    bookId: number,
    matricula: string
  ): number | null {

    const entry = this.waitlist.find(item =>
      item.bookId === bookId &&
      item.matricula === matricula &&
      item.status === 'esperando'
    );

    return entry
      ? entry.position
      : null;

  }

  addToWaitlist(
    bookId: number,
    bookTitle: string
  ): {
    success: boolean;
    message: string;
    entry: WaitlistEntry | null;
  } {

    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    const existingPosition =
      this.getUserPosition(
        bookId,
        currentUser.matricula
      );

    if (existingPosition !== null) {

      return {
        success: false,
        message:
          `Ya estás en la lista de espera. Tu posición actual es #${existingPosition}.`,
        entry: null
      };

    }

    const position =
      this.getWaitlistByBook(bookId).length + 1;

    const entry: WaitlistEntry = {
      id: Date.now(),
      bookId,
      bookTitle,
      studentName: currentUser.name,
      matricula: currentUser.matricula,
      requestDate: new Date()
        .toISOString()
        .split('T')[0],
      position,
      status: 'esperando'
    };

    this.waitlist.push(entry);

    this.saveWaitlist();

    return {
      success: true,
      message:
        'Te agregaste correctamente a la lista de espera.',
      entry
    };

  }

  removeEntry(
    entryId: number
  ): void {

    this.waitlist =
      this.waitlist.filter(entry =>
        entry.id !== entryId
      );

    this.recalculatePositions();
    this.saveWaitlist();

  }

  markAsNotified(
    entryId: number
  ): void {

    const entry =
      this.waitlist.find(
        e => e.id === entryId
      );

    if (!entry) {
      return;
    }

    entry.status = 'notificado';

    this.saveWaitlist();

  }

  private recalculatePositions(): void {

    const groupedBooks =
      [...new Set(
        this.waitlist.map(
          item => item.bookId
        )
      )];

    groupedBooks.forEach(bookId => {

      const entries =
        this.waitlist
          .filter(item =>
            item.bookId === bookId
          )
          .sort((a, b) =>
            a.position - b.position
          );

      entries.forEach((entry, index) => {

        entry.position = index + 1;

      });

    });

  }

}