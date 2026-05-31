import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { BookService } from '../../services/book.service';
import { LoanService } from '../../services/loan.service';
import { WaitlistService } from '../../services/waitlist.service';
import { ReservationService } from '../../services/reservation';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent,
    RouterLink
  ],
  templateUrl: './librarian-dashboard.html',
  styleUrl: './librarian-dashboard.css'
})
export class LibrarianDashboard {

  constructor(
    private bookService: BookService,
    private loanService: LoanService,
    private waitlistService: WaitlistService,
    private reservationService: ReservationService
  ) {}

  get totalBooks(): number {
    return this.bookService.getBooks().length;
  }

  get availableBooks(): number {
    return this.bookService.getBooks()
      .filter(book => book.stock > 0).length;
  }

  get activeLoans(): number {
    return this.loanService.getActiveLoans().length;
  }

  get overdueLoans(): number {
    return this.loanService.getOverdueLoans().length;
  }

  get pendingReturns(): number {
    return this.loanService.getPendingReturns().length;
  }

  get pendingReservations(): number {
    return this.reservationService.getPendingReservations().length;
  }

  get waitlistUsers(): number {
    return this.waitlistService.getWaitlist().length;
  }

  get totalFines(): number {
    return this.loanService.getOverdueLoans()
      .reduce((total, loan) => total + (loan.fineAmount || 0), 0);
  }
}