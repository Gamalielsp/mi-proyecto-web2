import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';

import { Loan } from '../../models/loan.model';
import { Reservation } from '../../models/reservation.model';

import { LoanService } from '../../services/loan.service';
import { ReservationService } from '../../services/reservation';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-my-books',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './my-books.html',
  styleUrl: './my-books.css'
})
export class MyBooks implements OnDestroy {

  activeSection:
    'reservations' |
    'loans' |
    'folios' |
    'history' = 'reservations';

  loans: Loan[] = [];
  history: Loan[] = [];
  reservations: Reservation[] = [];
  folios: any[] = [];
  processingLoanId: number | null = null;

  currentUser = JSON.parse(
    localStorage.getItem('currentUser') || '{}'
  );

  private timerSubscription: Subscription;

  constructor(
    private loanService: LoanService,
    private reservationService: ReservationService
  ) {
    this.loadDataFromApi();

    this.timerSubscription = interval(60000).subscribe(() => {
      this.loadDataFromApi(false);
    });
  }

  ngOnDestroy(): void {
    this.timerSubscription.unsubscribe();
  }

  changeSection(
    section:
      'reservations' |
      'loans' |
      'folios' |
      'history'
  ): void {
    this.activeSection = section;
  }

  loadDataFromApi(showError: boolean = false): void {
    this.loanService.loadLoans().subscribe({
      next: () => {
        this.loadData();
      },
      error: () => {
        this.loadData();

        if (showError) {
          alert('No se pudieron cargar los préstamos desde MongoDB.');
        }
      }
    });

    this.reservationService.loadReservations().subscribe({
      next: () => {
        this.loadData();
      },
      error: () => {
        this.loadData();
      }
    });
  }

  loadData(): void {
    this.loans =
      this.loanService.getActiveLoansByUser(
        this.currentUser.matricula
      );

    this.history =
      this.loanService
        .getHistory()
        .filter(loan =>
          loan.matricula === this.currentUser.matricula
        );

    this.reservations =
      this.reservationService.getUserReservations(
        this.currentUser.matricula
      );
  }

  requestReturn(loan: Loan): void {
    if (this.processingLoanId !== null) {
      return;
    }

    const confirmRequest = confirm(
      `¿Deseas solicitar la devolución del libro "${loan.bookTitle}"?`
    );

    if (!confirmRequest) {
      return;
    }

    this.processingLoanId = loan.id;

    this.loanService.requestReturn(loan.id).subscribe({
      next: () => {
        this.processingLoanId = null;
        alert('Solicitud de devolución enviada correctamente.');
        this.loadDataFromApi();
      },
      error: error => {
        this.processingLoanId = null;
        alert(
          error?.error?.detail ||
          'No se pudo solicitar la devolución.'
        );
      }
    });
  }

  renewLoan(loan: Loan): void {
    if (this.processingLoanId !== null) {
      return;
    }

    this.processingLoanId = loan.id;

    try {
      this.loanService.renewLoan(loan.id).subscribe({
        next: () => {
          this.processingLoanId = null;
          alert('Préstamo renovado por 1 día adicional.');
          this.loadDataFromApi();
        },
        error: error => {
          this.processingLoanId = null;
          alert(
            error?.error?.detail ||
            'No se pudo renovar el préstamo.'
          );
        }
      });
    } catch (error) {
      this.processingLoanId = null;

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('No se pudo renovar el préstamo.');
      }
    }
  }

  getReservationStatusText(
    status: Reservation['status']
  ): string {
    if (status === 'pendiente') {
      return 'Pendiente de entrega';
    }

    if (status === 'entregado') {
      return 'Entregada / préstamo iniciado';
    }

    if (status === 'expirada') {
      return 'Expirada';
    }

    return 'Cancelada por biblioteca';
  }

  getReservationMessage(
    reservation: Reservation
  ): string {
    if (reservation.status === 'pendiente') {
      return 'Presenta este folio en biblioteca. Tienes máximo 1 hora desde la solicitud para recoger el libro.';
    }

    if (reservation.status === 'entregado') {
      return 'El bibliotecario confirmó la entrega. El préstamo ya inició.';
    }

    if (reservation.status === 'expirada') {
      return 'No se recogió el libro dentro del tiempo permitido. La reserva expiró y el ejemplar volvió al inventario.';
    }

    return 'La solicitud fue cancelada o rechazada por biblioteca.';
  }

  getExpirationTime(
    reservation: Reservation
  ): string {
    return new Date(
      reservation.expiresAt
    ).toLocaleTimeString();
  }
}