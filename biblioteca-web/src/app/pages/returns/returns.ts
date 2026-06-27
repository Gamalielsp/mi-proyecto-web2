import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Loan } from '../../models/loan.model';
import { LoanService } from '../../services/loan.service';
import { BookService } from '../../services/book.service';
import { WaitlistService } from '../../services/waitlist.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './returns.html',
  styleUrl: './returns.css'
})
export class Returns {

  pendingReturns: Loan[] = [];
  loading = false;

  constructor(
    private loanService: LoanService,
    private bookService: BookService,
    private waitlistService: WaitlistService
  ) {
    this.loadData();
  }

  loadData(): void {
    this.loanService.loadLoans().subscribe({
      next: () => {
        this.pendingReturns =
          this.loanService.getPendingReturns();
      },
      error: () => {
        this.pendingReturns =
          this.loanService.getPendingReturns();
      }
    });
  }

  confirmReturn(loan: Loan): void {
    if (this.loading) {
      return;
    }

    const confirmReception = confirm(
      `¿Confirmas la recepción física del libro "${loan.bookTitle}"?`
    );

    if (!confirmReception) {
      return;
    }

    this.loading = true;

    this.loanService.confirmReturn(loan.id).subscribe({
      next: returnedLoan => {
        this.bookService.loadBooks().subscribe({
          next: () => {
            this.waitlistService.notifyNextUser(
              returnedLoan.bookId
            );
          },
          error: () => {}
        });

        alert(
          `Libro recibido correctamente.\n\nFolio: ${returnedLoan.returnFolio}`
        );

        this.loading = false;
        this.loadData();
      },
      error: error => {
        this.loading = false;

        alert(
          error?.error?.detail ||
          'No se pudo confirmar la devolución.'
        );
      }
    });
  }
}
