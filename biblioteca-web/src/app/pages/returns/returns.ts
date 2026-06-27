import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';

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
export class Returns implements OnInit {

  pendingReturns: Loan[] = [];
  loading = false;
  loadError = false;

  constructor(
    private loanService: LoanService,
    private bookService: BookService,
    private waitlistService: WaitlistService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadError = false;

    this.loanService.loadLoans().pipe(
      catchError(error => {
        console.error('Error al cargar devoluciones pendientes:', error);
        this.loadError = true;
        return of([]);
      }),
      finalize(() => {
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.pendingReturns = this.loanService.getPendingReturns();
      },
      error: error => {
        console.error('Error general al cargar devoluciones:', error);
        this.pendingReturns = this.loanService.getPendingReturns();
        this.loadError = true;
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

    this.loanService.confirmReturn(loan.id).pipe(
      finalize(() => {
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
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
