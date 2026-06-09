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

  constructor(
    private loanService: LoanService,
    private bookService: BookService,
    private waitlistService: WaitlistService
  ) {
    this.loadData();
  }

  loadData(): void {
    this.pendingReturns =
      this.loanService.getPendingReturns();
  }

  confirmReturn(loan: Loan): void {

    const returnedLoan =
      this.loanService.confirmReturn(loan.id);

    if (!returnedLoan) {
      return;
    }

    this.bookService.increaseStock(
      returnedLoan.bookTitle
    );

    this.waitlistService.notifyNextUser(
      returnedLoan.bookId
    );

    alert(
      `Libro recibido correctamente.\n\nFolio: ${returnedLoan.returnFolio}`
    );

    this.loadData();
  }

}