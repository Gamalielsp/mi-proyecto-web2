import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { Loan } from '../models/loan.model';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private apiUrl = 'https://biblioteca-api-zppt.onrender.com/loans';

  private loans: Loan[] = [];
  private history: Loan[] = [];

  private finePerDay = 20;

  constructor(
    private http: HttpClient
  ) {
    this.loadLoans().subscribe({
      next: () => {},
      error: () => {}
    });
  }

  loadLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.apiUrl}/`).pipe(
      map(loans => loans.map(loan => this.normalizeLoan(loan))),
      tap(loans => {
        this.loans = loans.filter(loan =>
          loan.status !== 'devuelto'
        );

        this.history = loans.filter(loan =>
          loan.status === 'devuelto'
        );

        this.updateOverdueLoans();
      })
    );
  }

  private normalizeLoan(loan: Loan): Loan {
    return {
      ...loan,
      id: Number(loan.id),
      bookId: Number(loan.bookId),
      daysLeft: Number(loan.daysLeft ?? 0),
      renewed: loan.renewed === true,
      status: loan.status || 'activo'
    };
  }

  getLoans(): Loan[] {
    this.updateOverdueLoans();
    return [...this.loans];
  }

  getActiveLoans(): Loan[] {
    this.updateOverdueLoans();

    return this.loans.filter(loan =>
      loan.status === 'activo' ||
      loan.status === 'devolucion_pendiente' ||
      loan.status === 'vencido'
    );
  }

  getActiveLoansByUser(matricula: string): Loan[] {
    this.updateOverdueLoans();

    return this.loans.filter(loan =>
      loan.matricula === matricula &&
      (
        loan.status === 'activo' ||
        loan.status === 'devolucion_pendiente' ||
        loan.status === 'vencido'
      )
    );
  }

  getActiveLoansByBook(bookId: number): Loan[] {
    this.updateOverdueLoans();

    return this.loans.filter(loan =>
      Number(loan.bookId) === Number(bookId) &&
      (
        loan.status === 'activo' ||
        loan.status === 'devolucion_pendiente' ||
        loan.status === 'vencido'
      )
    );
  }

  countActiveLoans(matricula: string): number {
    return this.getActiveLoansByUser(matricula).length;
  }

  countActiveLoansByBook(bookId: number): number {
    return this.getActiveLoansByBook(bookId).length;
  }

  hasActiveLoansByUser(matricula: string): boolean {
    return this.getActiveLoansByUser(matricula).length > 0;
  }

  hasActiveLoansByBook(bookId: number): boolean {
    return this.getActiveLoansByBook(bookId).length > 0;
  }

  hasBookAlready(matricula: string, bookId: number): boolean {
    return this.loans.some(loan =>
      loan.matricula === matricula &&
      Number(loan.bookId) === Number(bookId) &&
      (
        loan.status === 'activo' ||
        loan.status === 'devolucion_pendiente' ||
        loan.status === 'vencido'
      )
    );
  }

  hasOverdueLoans(matricula: string): boolean {
    this.updateOverdueLoans();

    return this.loans.some(loan =>
      loan.matricula === matricula &&
      loan.status === 'vencido'
    );
  }

  canBorrow(matricula: string, bookId: number): {
    allowed: boolean;
    message: string;
  } {
    if (this.hasOverdueLoans(matricula)) {
      return {
        allowed: false,
        message: 'No puedes solicitar nuevos libros porque tienes préstamos vencidos.'
      };
    }

    if (this.hasBookAlready(matricula, bookId)) {
      return {
        allowed: false,
        message: 'No puedes pedir dos ejemplares del mismo libro.'
      };
    }

    if (this.countActiveLoans(matricula) >= 5) {
      return {
        allowed: false,
        message: 'No puedes tener más de 5 libros prestados al mismo tiempo.'
      };
    }

    return {
      allowed: true,
      message: 'Préstamo permitido.'
    };
  }

  getPendingReturns(): Loan[] {
    this.updateOverdueLoans();

    return this.loans.filter(loan =>
      loan.status === 'devolucion_pendiente'
    );
  }

  getOverdueLoans(): Loan[] {
    this.updateOverdueLoans();

    return this.loans.filter(loan =>
      loan.status === 'vencido'
    );
  }

  getHistory(): Loan[] {
    return [...this.history];
  }

  addLoan(loan: Loan): Observable<Loan> {
    const normalizedLoan = this.normalizeLoan(loan);

    return this.http.post<{
      message: string;
      loan: Loan;
    }>(
      `${this.apiUrl}/`,
      normalizedLoan
    ).pipe(
      map(response => this.normalizeLoan(response.loan)),
      tap(createdLoan => {
        this.loans = [
          ...this.loans.filter(item =>
            item.id !== createdLoan.id
          ),
          createdLoan
        ];
      })
    );
  }

  requestReturn(loanId: number): Observable<Loan> {
    const returnRequestDate =
      new Date().toISOString().split('T')[0];

    return this.http.patch<{
      message: string;
      loan: Loan;
    }>(
      `${this.apiUrl}/${loanId}/request-return`,
      {
        returnRequestDate
      }
    ).pipe(
      map(response => this.normalizeLoan(response.loan)),
      tap(updatedLoan => {
        this.loans = this.loans.map(loan =>
          loan.id === updatedLoan.id
            ? updatedLoan
            : loan
        );
      })
    );
  }

  renewLoan(loanId: number): Observable<Loan> {
    this.updateOverdueLoans();

    const loan = this.loans.find(item =>
      item.id === loanId
    );

    if (!loan) {
      throw new Error('Préstamo no encontrado.');
    }

    if (loan.status !== 'activo') {
      throw new Error('Sólo se pueden renovar préstamos activos no vencidos.');
    }

    if (loan.renewed) {
      throw new Error('Este préstamo ya fue renovado una vez.');
    }

    const dueDate = new Date(loan.dueDate);
    dueDate.setDate(dueDate.getDate() + 1);

    const newDueDate = dueDate.toISOString().split('T')[0];
    const newDaysLeft = loan.daysLeft + 1;

    return this.http.patch<{
      message: string;
      loan: Loan;
    }>(
      `${this.apiUrl}/${loanId}/renew`,
      {
        dueDate: newDueDate,
        daysLeft: newDaysLeft
      }
    ).pipe(
      map(response => this.normalizeLoan(response.loan)),
      tap(updatedLoan => {
        this.loans = this.loans.map(item =>
          item.id === updatedLoan.id
            ? updatedLoan
            : item
        );
      })
    );
  }

  confirmReturn(loanId: number): Observable<Loan> {
    const returnFolio =
      'DEV-' + Math.floor(100000 + Math.random() * 900000);

    const returnDate =
      new Date().toISOString().split('T')[0];

    return this.http.patch<{
      message: string;
      loan: Loan;
    }>(
      `${this.apiUrl}/${loanId}/confirm-return`,
      {
        returnFolio,
        returnDate
      }
    ).pipe(
      map(response => this.normalizeLoan(response.loan)),
      tap(returnedLoan => {
        this.loans = this.loans.filter(loan =>
          loan.id !== returnedLoan.id
        );

        this.history = [
          ...this.history.filter(loan =>
            loan.id !== returnedLoan.id
          ),
          returnedLoan
        ];
      })
    );
  }

  private updateOverdueLoans(): void {
    const today = new Date();

    this.loans.forEach(loan => {
      if (loan.status !== 'activo') {
        return;
      }

      const dueDate = new Date(loan.dueDate);

      const diffTime =
        today.getTime() - dueDate.getTime();

      const daysOverdue = Math.floor(
        diffTime / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue <= 0) {
        return;
      }

      const newFine = daysOverdue * this.finePerDay;

      loan.status = 'vencido';
      loan.daysOverdue = daysOverdue;
      loan.fineAmount = newFine;
      loan.daysLeft = 0;

      this.http.patch<{
        message: string;
        loan: Loan;
      }>(
        `${this.apiUrl}/${loan.id}/overdue`,
        {
          daysOverdue,
          fineAmount: newFine
        }
      ).pipe(
        map(response => this.normalizeLoan(response.loan))
      ).subscribe({
        next: updatedLoan => {
          this.loans = this.loans.map(item =>
            item.id === updatedLoan.id
              ? updatedLoan
              : item
          );
        },
        error: () => {}
      });
    });
  }
}
