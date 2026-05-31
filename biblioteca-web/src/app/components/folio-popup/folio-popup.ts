import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy
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
export class FolioPopupComponent implements OnInit, OnDestroy {

  @Input() open = false;

  @Input() book: Book | null = null;

  @Output() close =
    new EventEmitter<void>();

  folio = 'BIB-284751';

  seconds = 3600;

  intervalId: any;

  ngOnInit() {

    this.intervalId =
      setInterval(() => {

        if (this.seconds > 0) {
          this.seconds--;
        }

      }, 1000);

  }

  ngOnDestroy() {

    clearInterval(this.intervalId);

  }

  get minutes(): number {

    return Math.floor(
      this.seconds / 60
    );

  }

  get remainingSeconds(): number {

    return this.seconds % 60;

  }

  closePopup() {

    this.close.emit();

  }

}
