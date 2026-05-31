import { Injectable } from '@angular/core';
import { Loan } from '../models/loan.model';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private loansStorageKey = 'loans';
  private historyStorageKey = 'loanHistory';

  private loans: Loan[] = [];
  private history: Loan[] = [];

  private finePerDay = 20;

  constructor() {
    const savedLoans = localStorage.getItem(this.loansStorageKey);
    const savedHistory = localStorage.getItem(this.historyStorageKey);

    this.loans = savedLoans ? JSON.parse(savedLoans) : [];
    this.history = savedHistory ? JSON.parse(savedHistory) : [];

    this.updateOverdueLoans();
  }

  private saveLoans(): void {
    localStorage.setItem(
      this.loansStorageKey,
      JSON.stringify(this.loans)
    );
  }

  private saveHistory(): void {
    localStorage.setItem(
      this.historyStorageKey,
      JSON.stringify(this.history)
    );
  }

  private saveAll(): void {
    this.saveLoans();
    this.saveHistory();
  }

  getLoans(): Loan[] {
    this.updateOverdueLoans();
    return this.loans;
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

  countActiveLoans(matricula: string): number {
    return this.getActiveLoansByUser(matricula).length;
  }

  hasBookAlready(matricula: string, bookId: number): boolean {
    return this.loans.some(loan =>
      loan.matricula === matricula &&
      loan.bookId === bookId &&
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
    return this.history;
  }

  addLoan(loan: Loan): void {
    this.loans.push(loan);
    this.updateOverdueLoans();
    this.saveLoans();
  }

  requestReturn(loanId: number): void {
    const loan = this.loans.find(l => l.id === loanId);

    if (!loan || (loan.status !== 'activo' && loan.status !== 'vencido')) {
      return;
    }

    loan.status = 'devolucion_pendiente';
    loan.returnRequestDate = new Date().toISOString().split('T')[0];

    this.saveLoans();
  }

  renewLoan(loanId: number): {
    success: boolean;
    message: string;
  } {
    this.updateOverdueLoans();

    const loan = this.loans.find(l => l.id === loanId);

    if (!loan) {
      return {
        success: false,
        message: 'Préstamo no encontrado.'
      };
    }

    if (loan.status !== 'activo') {
      return {
        success: false,
        message: 'Sólo se pueden renovar préstamos activos no vencidos.'
      };
    }

    if (loan.renewed) {
      return {
        success: false,
        message: 'Este préstamo ya fue renovado una vez.'
      };
    }

    const dueDate = new Date(loan.dueDate);
    dueDate.setDate(dueDate.getDate() + 1);

    loan.dueDate = dueDate.toISOString().split('T')[0];
    loan.daysLeft = loan.daysLeft + 1;
    loan.renewed = true;

    this.saveLoans();

    return {
      success: true,
      message: 'Préstamo renovado por 1 día adicional.'
    };
  }

  confirmReturn(loanId: number): Loan | null {
    this.updateOverdueLoans();

    const loan = this.loans.find(l => l.id === loanId);

    if (!loan || loan.status !== 'devolucion_pendiente') {
      return null;
    }

    loan.status = 'devuelto';
    loan.returnFolio = 'DEV-' + Math.floor(100000 + Math.random() * 900000);
    loan.returnDate = new Date().toISOString().split('T')[0];

    this.loans = this.loans.filter(l => l.id !== loanId);
    this.history.push(loan);

    this.saveAll();

    return loan;
  }

  private updateOverdueLoans(): void {
    const today = new Date();
    let changed = false;

    this.loans.forEach(loan => {
      if (
        loan.status === 'activo' ||
        loan.status === 'vencido'
      ) {
        const dueDate = new Date(loan.dueDate);
        const diffTime = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(
          diffTime / (1000 * 60 * 60 * 24)
        );

        if (daysOverdue > 0) {
          const newFine = daysOverdue * this.finePerDay;

          if (
            loan.status !== 'vencido' ||
            loan.daysOverdue !== daysOverdue ||
            loan.fineAmount !== newFine ||
            loan.daysLeft !== 0
          ) {
            loan.status = 'vencido';
            loan.daysOverdue = daysOverdue;
            loan.fineAmount = newFine;
            loan.daysLeft = 0;
            changed = true;
          }
        }
      }
    });

    if (changed) {
      this.saveLoans();
    }
  }

}