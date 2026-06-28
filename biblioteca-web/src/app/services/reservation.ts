import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { Reservation } from '../models/reservation.model';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  private apiUrl = 'https://biblioteca-api-zppt.onrender.com/reservations';
  private reservations: Reservation[] = [];

  constructor(
    private http: HttpClient
  ) {}

  private normalizeReservation(reservation: Reservation): Reservation {
    return {
      ...reservation,
      id: Number(reservation.id),
      bookId: Number(reservation.bookId),
      status: reservation.status || 'pendiente'
    };
  }

  loadReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/`).pipe(
      map(reservations =>
        reservations.map(reservation =>
          this.normalizeReservation(reservation)
        )
      ),
      tap(reservations => {
        this.reservations = reservations;
        this.checkExpiredReservations();
      })
    );
  }

  getReservations(): Reservation[] {
    this.checkExpiredReservations();
    return [...this.reservations];
  }

  getPendingReservations(): Reservation[] {
    this.checkExpiredReservations();

    return this.reservations.filter(reservation =>
      reservation.status === 'pendiente'
    );
  }

  getReservationHistory(): Reservation[] {
    this.checkExpiredReservations();

    return this.reservations.filter(reservation =>
      reservation.status !== 'pendiente'
    );
  }

  getUserReservations(matricula: string): Reservation[] {
    this.checkExpiredReservations();

    return this.reservations.filter(reservation =>
      reservation.matricula === matricula
    );
  }

  hasPendingReservation(
    matricula: string,
    bookId: number
  ): boolean {
    this.checkExpiredReservations();

    return this.reservations.some(reservation =>
      reservation.matricula === matricula &&
      Number(reservation.bookId) === Number(bookId) &&
      reservation.status === 'pendiente'
    );
  }

  createReservation(
    bookId: number,
    bookTitle: string,
    author: string
  ): Observable<Reservation> {
    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    if (!currentUser?.matricula) {
      throw new Error('No se encontró la sesión del usuario.');
    }

    const alreadyReserved = this.hasPendingReservation(
      currentUser.matricula,
      bookId
    );

    if (alreadyReserved) {
      throw new Error('Ya tienes una reserva pendiente para este libro.');
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (60 * 60 * 1000)
    );

    const reservation: Reservation = {
      id: Date.now(),
      folio: 'RES-' + Math.floor(100000 + Math.random() * 900000),
      bookId,
      bookTitle,
      author,
      studentName: currentUser.name || 'Usuario sin nombre',
      matricula: currentUser.matricula,
      userRole: currentUser.role || 'alumno',
      requestDate: now.toISOString().split('T')[0],
      requestTime: now.toLocaleTimeString(),
      expiresAt: expiresAt.toISOString(),
      status: 'pendiente'
    };

    return this.http.post<{
      message: string;
      reservation: Reservation;
    }>(
      `${this.apiUrl}/`,
      reservation
    ).pipe(
      map(response => this.normalizeReservation(response.reservation)),
      tap(createdReservation => {
        this.reservations = [
          ...this.reservations.filter(item =>
            item.id !== createdReservation.id
          ),
          createdReservation
        ];
      })
    );
  }

  markAsDelivered(reservationId: number): Observable<Reservation> {
    return this.http.patch<{
      message: string;
      reservation: Reservation;
    }>(
      `${this.apiUrl}/${reservationId}/delivered`,
      {}
    ).pipe(
      map(response => this.normalizeReservation(response.reservation)),
      tap(updatedReservation => {
        this.reservations = this.reservations.map(reservation =>
          reservation.id === updatedReservation.id
            ? updatedReservation
            : reservation
        );
      })
    );
  }

  cancelReservation(reservationId: number): Observable<Reservation> {
    return this.http.patch<{
      message: string;
      reservation: Reservation;
    }>(
      `${this.apiUrl}/${reservationId}/cancel`,
      {}
    ).pipe(
      map(response => this.normalizeReservation(response.reservation)),
      tap(updatedReservation => {
        this.reservations = this.reservations.map(reservation =>
          reservation.id === updatedReservation.id
            ? updatedReservation
            : reservation
        );
      })
    );
  }

  expireReservation(reservationId: number): Observable<Reservation> {
    return this.http.patch<{
      message: string;
      reservation: Reservation;
    }>(
      `${this.apiUrl}/${reservationId}/expire`,
      {}
    ).pipe(
      map(response => this.normalizeReservation(response.reservation)),
      tap(updatedReservation => {
        this.reservations = this.reservations.map(reservation =>
          reservation.id === updatedReservation.id
            ? updatedReservation
            : reservation
        );
      })
    );
  }

  getRemainingMinutes(reservation: Reservation): number {
    if (reservation.status !== 'pendiente') {
      return 0;
    }

    const now = new Date().getTime();
    const expiresAt = new Date(reservation.expiresAt).getTime();
    const diff = expiresAt - now;

    if (diff <= 0) {
      return 0;
    }

    return Math.ceil(diff / (1000 * 60));
  }

  private checkExpiredReservations(): void {
    const now = new Date();

    this.reservations.forEach(reservation => {
      if (reservation.status !== 'pendiente') {
        return;
      }

      const expiresAt = new Date(reservation.expiresAt);

      if (now <= expiresAt) {
        return;
      }

      reservation.status = 'expirada';

      this.expireReservation(reservation.id).subscribe({
        next: () => {},
        error: () => {}
      });
    });
  }
}
