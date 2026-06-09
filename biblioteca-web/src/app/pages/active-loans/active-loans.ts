import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class ActiveLoans {

  loans: Loan[] = [];

  constructor(private loanService: LoanService) {
    this.loadLoans();
  }

  loadLoans(): void {
    this.loans = this.loanService.getActiveLoans();
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
