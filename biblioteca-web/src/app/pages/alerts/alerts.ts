import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BookService } from '../../services/book.service';
import { LoanService } from '../../services/loan.service';
import { WaitlistService } from '../../services/waitlist.service';

import { Loan } from '../../models/loan.model';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './alerts.html',
  styleUrl: './alerts.css'
})
export class Alerts {

  constructor(
    private bookService: BookService,
    private loanService: LoanService,
    private waitlistService: WaitlistService
  ) {}

  get overdueLoans(): Loan[] {
    return this.loanService.getOverdueLoans();
  }

  get pendingReturns(): Loan[] {
    return this.loanService.getPendingReturns();
  }

  get exhaustedBooks() {
    return this.bookService.getBooks().filter(book => book.stock === 0);
  }

  get waitlistEntries() {
    return this.waitlistService.getWaitlist();
  }

  get totalFines(): number {
    return this.overdueLoans.reduce(
      (total, loan) => total + (loan.fineAmount || 0),
      0
    );
  }

  get totalAlerts(): number {
    return (
      this.overdueLoans.length +
      this.pendingReturns.length +
      this.exhaustedBooks.length +
      this.waitlistEntries.length
    );
  }
}