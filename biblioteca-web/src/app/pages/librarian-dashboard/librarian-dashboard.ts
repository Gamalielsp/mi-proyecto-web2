import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent,
    RouterLink
  ],
  templateUrl: './librarian-dashboard.html',
  styleUrl: './librarian-dashboard.css'
})
export class LibrarianDashboard implements OnInit {

  private apiBaseUrl = 'http://127.0.0.1:8000';

  totalBooks = 0;
  availableBooks = 0;
  activeLoans = 0;
  overdueLoans = 0;
  pendingReturns = 0;
  pendingReservations = 0;
  waitlistUsers = 0;
  totalFines = 0;

  isUpdating = false;
  loadError = false;
  lastUpdated = '';

  constructor(
    private http: HttpClient,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;
    this.loadError = false;

    forkJoin({
      books: this.safeGet('/books/', 'libros'),
      loans: this.safeGet('/loans/', 'préstamos'),
      reservations: this.safeGet('/reservations/', 'reservas'),
      waitlist: this.safeGet('/waitlist/', 'lista de espera')
    })
      .pipe(
        finalize(() => {
          this.isUpdating = false;
          this.lastUpdated = new Date().toLocaleTimeString();

          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: response => {
          this.calculateBooks(response.books);
          this.calculateLoans(response.loans);
          this.calculateReservations(response.reservations);
          this.calculateWaitlist(response.waitlist);
        },
        error: error => {
          console.error('Error general al cargar el Panel Bibliotecario:', error);
          this.loadError = true;
        }
      });
  }

  private safeGet(endpoint: string, label: string) {
    return this.http.get<any[]>(`${this.apiBaseUrl}${endpoint}`).pipe(
      catchError(error => {
        console.error(`Error al cargar ${label}:`, error);
        this.loadError = true;
        return of([]);
      })
    );
  }

  private calculateBooks(books: any[]): void {
    this.totalBooks = books.length;

    this.availableBooks = books.filter(book => {
      const isActive = book.isActive !== false;

      const availableCopies = Number(
        book.availableCopies ??
        book.stock ??
        0
      );

      return isActive && availableCopies > 0;
    }).length;
  }

  private calculateLoans(loans: any[]): void {
    const activeStatuses = [
      'activo',
      'devolucion_pendiente',
      'vencido'
    ];

    const activeLoans = loans.filter(loan =>
      activeStatuses.includes(this.normalizeStatus(loan.status))
    );

    const overdueLoans = loans.filter(loan =>
      this.normalizeStatus(loan.status) === 'vencido'
    );

    const pendingReturns = loans.filter(loan =>
      this.normalizeStatus(loan.status) === 'devolucion_pendiente'
    );

    this.activeLoans = activeLoans.length;
    this.overdueLoans = overdueLoans.length;
    this.pendingReturns = pendingReturns.length;

    this.totalFines = overdueLoans.reduce(
      (total, loan) => total + Number(loan.fineAmount ?? 0),
      0
    );
  }

  private calculateReservations(reservations: any[]): void {
    this.pendingReservations = reservations.filter(reservation =>
      this.normalizeStatus(reservation.status) === 'pendiente'
    ).length;
  }

  private calculateWaitlist(entries: any[]): void {
    this.waitlistUsers = entries.filter(entry => {
      const status = this.normalizeStatus(entry.status);

      return status === 'esperando' ||
             status === 'notificado';
    }).length;
  }

  private normalizeStatus(status: any): string {
    return String(status ?? '')
      .trim()
      .toLowerCase();
  }
}
