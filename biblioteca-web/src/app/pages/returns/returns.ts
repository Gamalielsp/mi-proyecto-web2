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
import { UiFeedbackService } from '../../services/ui-feedback.service';

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
    private uiFeedback: UiFeedbackService,
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
        this.pendingReturns = this.sortLoansNewestFirst(
          this.loanService.getPendingReturns()
        );
      },
      error: error => {
        console.error('Error general al cargar devoluciones:', error);
        this.pendingReturns = this.sortLoansNewestFirst(
          this.loanService.getPendingReturns()
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

  confirmReturn(loan: Loan): void {
    if (this.loading) {
      return;
    }

    this.uiFeedback.confirm({
      title: 'Confirmar devolución',
      message: `¿Confirmas la recepción física del libro "${loan.bookTitle}"?`,
      confirmText: 'Confirmar recepción',
      cancelText: 'Cancelar',
      type: 'warning'
    }).subscribe(confirmed => {
      if (!confirmed) {
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

          this.uiFeedback.success(
            `Folio: ${returnedLoan.returnFolio}`,
            'Libro recibido correctamente'
          );

          this.loading = false;
          this.loadData();
        },
        error: error => {
          this.loading = false;

          this.uiFeedback.error(
            error?.error?.detail ||
            'No se pudo confirmar la devolución.'
          );
        }
      });
    });
  }
}
