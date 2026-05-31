import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Book } from '../../models/book.model';
import { WaitlistEntry } from '../../models/waitlist.model';
import { WaitlistService } from '../../services/waitlist.service';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-card.html',
  styleUrl: './book-card.css'
})
export class BookCardComponent {

  @Input() book!: Book;

  @Output() reserve = new EventEmitter<Book>();

  waitlistEntry: WaitlistEntry | null = null;
  waitlistMessage = '';

  constructor(private waitlistService: WaitlistService) {}

  get available(): boolean {
    return this.book.stock > 0;
  }

  reserveBook(): void {
    this.reserve.emit(this.book);
  }

  joinWaitlist(): void {
    const result = this.waitlistService.addToWaitlist(
      this.book.id,
      this.book.title
    );

    this.waitlistMessage = result.message;
    this.waitlistEntry = result.entry;
  }

  closeWaitlist(): void {
    this.waitlistEntry = null;
    this.waitlistMessage = '';
  }
}
