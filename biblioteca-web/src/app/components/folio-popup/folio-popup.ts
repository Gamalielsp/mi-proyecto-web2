import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Book } from '../../models/book.model';

@Component({
  selector: 'app-folio-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './folio-popup.html',
  styleUrl: './folio-popup.css'
})
export class FolioPopupComponent implements OnChanges, OnDestroy {

  @Input() open = false;
  @Input() book: Book | null = null;
  @Input() folio = '';

  @Output() close = new EventEmitter<void>();

  seconds = 3600;
  intervalId: any = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.seconds = 3600;
        this.startTimer();
      } else {
        this.stopTimer();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startTimer(): void {
    this.stopTimer();

    this.zone.runOutsideAngular(() => {
      this.intervalId = setInterval(() => {
        this.zone.run(() => {
          if (this.seconds > 0) {
            this.seconds--;
            this.cdr.detectChanges();
          } else {
            this.stopTimer();
          }
        });
      }, 1000);
    });
  }

  stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  get minutes(): number {
    return Math.floor(this.seconds / 60);
  }

  get remainingSeconds(): number {
    return this.seconds % 60;
  }

  get formattedSeconds(): string {
    return this.remainingSeconds.toString().padStart(2, '0');
  }

  closePopup(): void {
    this.stopTimer();
    this.close.emit();
  }
}