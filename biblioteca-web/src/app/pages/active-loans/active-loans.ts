import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';

import { Loan } from '../../models/loan.model';
import { LoanService } from '../../services/loan.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-active-loans',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './active-loans.html',
  styleUrl: './active-loans.css'
})
export class ActiveLoans implements OnInit {

  loans: Loan[] = [];

  isLoading = false;
  loadError = false;

  constructor(
    private loanService: LoanService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.isLoading = true;
    this.loadError = false;

    this.loanService.loadLoans().pipe(
      catchError(error => {
        console.error('Error al cargar préstamos activos:', error);
        this.loadError = true;
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.loans = this.sortLoansNewestFirst(
          this.loanService.getActiveLoans()
        );
      },
      error: error => {
        console.error('Error general al cargar préstamos activos:', error);
        this.loans = this.sortLoansNewestFirst(
          this.loanService.getActiveLoans()
        );
        this.loadError = true;
      }
    });
  }

  private sortLoansNewestFirst(loans: Loan[]): Loan[] {
    return [...loans].sort((a, b) =>
      this.getLoanOrderValue(b) -
      this.getLoanOrderValue(a)
    );
  }

  private getLoanOrderValue(loan: Loan): number {
    const movementDate =
      loan.returnRequestDate ||
      loan.returnDate ||
      loan.borrowDate ||
      loan.dueDate;

    const dateValue = movementDate
      ? new Date(movementDate).getTime()
      : 0;

    const idValue = Number(loan.id);

    if (!Number.isNaN(dateValue) && dateValue > 0 && !Number.isNaN(idValue)) {
      return dateValue + idValue / 10000000000000;
    }

    if (!Number.isNaN(idValue) && idValue > 0) {
      return idValue;
    }

    return Number.isNaN(dateValue) ? 0 : dateValue;
  }

  getStatusText(status: Loan['status']): string {
    if (status === 'activo') {
      return 'Activo';
    }

    if (status === 'devolucion_pendiente') {
      return 'Devolución pendiente';
    }

    if (status === 'vencido') {
      return 'Vencido';
    }

    return 'Devuelto';
  }
}
