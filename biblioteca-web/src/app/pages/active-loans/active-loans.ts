import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';

import { Loan } from '../../models/loan.model';
import { LoanService } from '../../services/loan.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

type ActiveLoanSection = 'active' | 'pending' | 'overdue';

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
export class ActiveLoans implements OnInit, OnDestroy {

  loans: Loan[] = [];

  activeSection: ActiveLoanSection = 'active';

  isLoading = false;
  loadError = false;

  private syncTimer: any = null;
  private readonly syncInterval = 3000;
  private isSyncing = false;

  constructor(
    private loanService: LoanService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLoans();
    this.startAutoSync();
  }

  ngOnDestroy(): void {
    this.stopAutoSync();
  }

  private startAutoSync(): void {
    this.stopAutoSync();

    this.syncTimer = setInterval(() => {
      this.loadLoans(true);
    }, this.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  loadLoans(silent: boolean = false): void {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    if (!silent) {
      this.isLoading = true;
    }

    this.loadError = false;

    this.loanService.loadLoans().pipe(
      catchError(error => {
        console.error('Error al cargar préstamos activos:', error);
        this.loadError = true;
        return of([]);
      }),
      finalize(() => {
        this.isSyncing = false;

        if (!silent) {
          this.isLoading = false;
        }

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

  changeSection(section: ActiveLoanSection): void {
    this.activeSection = section;
  }

  get activeLoans(): Loan[] {
    return this.loans.filter(loan =>
      loan.status === 'activo'
    );
  }

  get pendingLoans(): Loan[] {
    return this.loans.filter(loan =>
      loan.status === 'devolucion_pendiente'
    );
  }

  get overdueLoans(): Loan[] {
    return this.loans.filter(loan =>
      loan.status === 'vencido'
    );
  }

  get filteredLoans(): Loan[] {
    if (this.activeSection === 'active') {
      return this.activeLoans;
    }

    if (this.activeSection === 'pending') {
      return this.pendingLoans;
    }

    return this.overdueLoans;
  }

  get sectionTitle(): string {
    if (this.activeSection === 'active') {
      return 'Préstamos Activos';
    }

    if (this.activeSection === 'pending') {
      return 'Pendientes de Devolución';
    }

    return 'Préstamos Vencidos';
  }

  get emptyMessage(): string {
    if (this.activeSection === 'active') {
      return 'No hay préstamos activos registrados.';
    }

    if (this.activeSection === 'pending') {
      return 'No hay préstamos pendientes de devolución.';
    }

    return 'No hay préstamos vencidos registrados.';
  }

  trackByLoanId(index: number, loan: Loan): number {
    return loan.id;
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

    if (status === 'expirado') {
      return 'Expirado';
    }

    return 'Devuelto';
  }

  getLoanMessage(loan: Loan): string {
    if (loan.status === 'activo') {
      return 'Este préstamo se encuentra vigente dentro del periodo permitido.';
    }

    if (loan.status === 'devolucion_pendiente') {
      return 'El usuario solicitó devolución. Falta validar físicamente el libro en biblioteca.';
    }

    if (loan.status === 'vencido') {
      return 'Este préstamo superó su fecha límite. El usuario debe regularizar la devolución.';
    }

    return 'Movimiento registrado en el sistema.';
  }
}