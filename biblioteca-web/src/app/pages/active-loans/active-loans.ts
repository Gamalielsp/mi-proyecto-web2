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
        this.loans = this.loanService.getActiveLoans();
      },
      error: error => {
        console.error('Error general al cargar préstamos activos:', error);
        this.loans = this.loanService.getActiveLoans();
        this.loadError = true;
      }
    });
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
