import { Injectable } from '@angular/core';

import { Reservation } from '../models/reservation.model';
import { BookService } from './book.service';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  private storageKey = 'reservations';

  private reservations: Reservation[] = [];

  constructor(
    private bookService: BookService
  ) {
    const savedReservations =
      localStorage.getItem(this.storageKey);

    if (savedReservations) {
      this.reservations =
        JSON.parse(savedReservations);
    }

    this.checkExpiredReservations();
  }

  private saveReservations(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.reservations)
    );
  }

  getReservations(): Reservation[] {
    this.checkExpiredReservations();
    return this.reservations;
  }

  getPendingReservations(): Reservation[] {
    this.checkExpiredReservations();

    return this.reservations.filter(
      reservation =>
        reservation.status === 'pendiente'
    );
  }

  getReservationHistory(): Reservation[] {
    this.checkExpiredReservations();

    return this.reservations.filter(
      reservation =>
        reservation.status !== 'pendiente'
    );
  }

  getUserReservations(
    matricula: string
  ): Reservation[] {
    this.checkExpiredReservations();

    return this.reservations.filter(
      reservation =>
        reservation.matricula === matricula
    );
  }

  hasPendingReservation(
    matricula: string,
    bookId: number
  ): boolean {
    this.checkExpiredReservations();

    return this.reservations.some(
      reservation =>
        reservation.matricula === matricula &&
        reservation.bookId === bookId &&
        reservation.status === 'pendiente'
    );
  }

  createReservation(
    bookId: number,
    bookTitle: string,
    author: string
  ): Reservation {
    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    const alreadyReserved =
      this.hasPendingReservation(
        currentUser.matricula,
        bookId
      );

    if (alreadyReserved) {
      throw new Error(
        'Ya tienes una reserva pendiente para este libro.'
      );
    }

    const reserved =
      this.bookService.reserveBook(bookId);

    if (!reserved) {
      throw new Error(
        'No hay ejemplares disponibles para reservar.'
      );
    }

    const now = new Date();

    const expiresAt = new Date(
      now.getTime() + (60 * 60 * 1000)
    );

    const reservation: Reservation = {
      id: Date.now(),

      folio:
        'RES-' +
        Math.floor(
          100000 + Math.random() * 900000
        ),

      bookId,
      bookTitle,
      author,

      studentName:
        currentUser.name || 'Usuario sin nombre',

      matricula:
        currentUser.matricula || 'SIN-MATRICULA',

      userRole:
        currentUser.role || 'alumno',

      requestDate:
        now.toISOString().split('T')[0],

      requestTime:
        now.toLocaleTimeString(),

      expiresAt:
        expiresAt.toISOString(),

      status: 'pendiente'
    };

    this.reservations.push(reservation);
    this.saveReservations();

    return reservation;
  }

  markAsDelivered(
    reservationId: number
  ): Reservation | null {
    const reservation =
      this.reservations.find(
        item =>
          item.id === reservationId
      );

    if (!reservation || reservation.status !== 'pendiente') {
      return null;
    }

    reservation.status = 'entregado';

    this.saveReservations();

    return reservation;
  }

  cancelReservation(
    reservationId: number
  ): void {
    const reservation =
      this.reservations.find(
        item =>
          item.id === reservationId
      );

    if (!reservation || reservation.status !== 'pendiente') {
      return;
    }

    reservation.status = 'cancelada';

    this.bookService.increaseStock(
      reservation.bookTitle
    );

    this.saveReservations();
  }

  getRemainingMinutes(
    reservation: Reservation
  ): number {
    if (reservation.status !== 'pendiente') {
      return 0;
    }

    const now = new Date().getTime();

    const expiresAt =
      new Date(reservation.expiresAt).getTime();

    const diff = expiresAt - now;

    if (diff <= 0) {
      return 0;
    }

    return Math.ceil(diff / (1000 * 60));
  }

  private checkExpiredReservations(): void {
    let changed = false;

    const now = new Date();

    this.reservations.forEach(
      reservation => {
        if (reservation.status !== 'pendiente') {
          return;
        }

        const expiresAt =
          new Date(reservation.expiresAt);

        if (now > expiresAt) {
          reservation.status = 'expirada';

          this.bookService.increaseStock(
            reservation.bookTitle
          );

          changed = true;
        }
      }
    );

    if (changed) {
      this.saveReservations();
    }
  }
}