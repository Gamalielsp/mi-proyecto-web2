import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';

import { WaitlistEntry } from '../../models/waitlist.model';
import { WaitlistService } from '../../services/waitlist.service';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

interface WaitlistBookGroup {
  bookTitle: string;
  total: number;
  firstDate: string;
  entries: WaitlistEntry[];
}

@Component({
  selector: 'app-waitlists',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './waitlists.html',
  styleUrl: './waitlists.css'
})
export class Waitlists implements OnInit {

  entries: WaitlistEntry[] = [];
  groupedEntries: WaitlistBookGroup[] = [];

  loading = false;
  loadError = false;

  constructor(
    private waitlistService: WaitlistService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries(): void {
    this.loading = true;
    this.loadError = false;

    this.waitlistService.loadWaitlist().pipe(
      catchError(error => {
        console.error('Error al cargar listas de espera:', error);
        this.loadError = true;

        return of(
          this.waitlistService.getWaitlist()
        );
      }),
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: entries => {
        this.entries = this.sortEntriesAsQueue(entries);
        this.groupedEntries = this.groupEntriesByBook(this.entries);
      },
      error: error => {
        console.error('Error general al cargar listas de espera:', error);

        this.entries = this.sortEntriesAsQueue(
          this.waitlistService.getWaitlist()
        );

        this.groupedEntries = this.groupEntriesByBook(this.entries);
        this.loadError = true;
      }
    });
  }

  /*
    Lista de espera = cola.
    Primero aparece quien entró primero.
    Dentro del mismo libro se respeta #1, #2, #3...
  */
  private sortEntriesAsQueue(
    entries: WaitlistEntry[]
  ): WaitlistEntry[] {
    return [...entries].sort((a, b) => {
      const sameBook =
        this.getBookKey(a) === this.getBookKey(b);

      if (sameBook) {
        const positionCompare =
          this.getPositionValue(a) -
          this.getPositionValue(b);

        if (positionCompare !== 0) {
          return positionCompare;
        }
      }

      const requestCompare =
        this.getQueueOrderValue(a) -
        this.getQueueOrderValue(b);

      if (requestCompare !== 0) {
        return requestCompare;
      }

      return this.getIdValue(a) - this.getIdValue(b);
    });
  }

  private groupEntriesByBook(
    entries: WaitlistEntry[]
  ): WaitlistBookGroup[] {
    const groupsMap = new Map<string, WaitlistBookGroup>();

    for (const entry of entries) {
      const key = this.getBookKey(entry);
      const bookTitle = entry.bookTitle || 'Libro sin título';

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          bookTitle,
          total: 0,
          firstDate: entry.requestDate,
          entries: []
        });
      }

      const group = groupsMap.get(key)!;

      group.entries.push(entry);
      group.total = group.entries.length;

      const currentFirstDate = this.getDateValue(group.firstDate);
      const entryDate = this.getDateValue(entry.requestDate);

      if (
        entryDate > 0 &&
        (
          currentFirstDate === 0 ||
          entryDate < currentFirstDate
        )
      ) {
        group.firstDate = entry.requestDate;
      }
    }

    return Array.from(groupsMap.values())
      .map(group => ({
        ...group,
        entries: this.sortEntriesAsQueue(group.entries)
      }))
      .sort((a, b) =>
        this.getDateValue(a.firstDate) -
        this.getDateValue(b.firstDate)
      );
  }

  private getQueueOrderValue(
    entry: WaitlistEntry
  ): number {
    const item: any = entry;

    const possibleDates = [
      item.createdAt,
      item.created_at,
      item.requestDate,
      item.request_date,
      item.date
    ];

    for (const date of possibleDates) {
      const dateValue = this.getDateValue(date);

      if (dateValue > 0) {
        return dateValue;
      }
    }

    const idValue = this.getIdValue(entry);

    if (idValue > 0) {
      return idValue;
    }

    return 0;
  }

  private getBookKey(
    entry: WaitlistEntry
  ): string {
    const item: any = entry;

    if (item.bookId !== undefined && item.bookId !== null) {
      return String(item.bookId);
    }

    if (item.book_id !== undefined && item.book_id !== null) {
      return String(item.book_id);
    }

    return String(
      item.bookTitle ||
      item.book_title ||
      item.title ||
      ''
    ).toLowerCase().trim();
  }

  private getPositionValue(
    entry: WaitlistEntry
  ): number {
    const item: any = entry;

    const possiblePositions = [
      item.position,
      item.queuePosition,
      item.queue_position,
      item.place
    ];

    for (const position of possiblePositions) {
      const positionValue = Number(position);

      if (!Number.isNaN(positionValue) && positionValue > 0) {
        return positionValue;
      }
    }

    return 999999;
  }

  private getIdValue(
    entry: WaitlistEntry
  ): number {
    const item: any = entry;
    const idValue = Number(item.id);

    if (!Number.isNaN(idValue) && idValue > 0) {
      return idValue;
    }

    return 0;
  }

  private getDateValue(
    value: any
  ): number {
    if (!value) {
      return 0;
    }

    const dateValue = new Date(value).getTime();

    if (Number.isNaN(dateValue)) {
      return 0;
    }

    return dateValue;
  }

  getStatusText(status: WaitlistEntry['status']): string {
    if (status === 'esperando') {
      return 'Esperando disponibilidad';
    }

    if (status === 'notificado') {
      return 'Notificado para confirmar reserva';
    }

    if (status === 'reserva_confirmada') {
      return 'Solicitud de reserva confirmada';
    }

    if (status === 'vencido') {
      return 'Tiempo vencido';
    }

    if (status === 'cancelado') {
      return 'Cancelado';
    }

    return status;
  }

  getMinutesLeft(entry: WaitlistEntry): number {
    return this.waitlistService.getMinutesLeft(entry);
  }
}