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
        return of(this.waitlistService.getWaitlist());
      }),
      finalize(() => {
        this.loading = false;
        this.changeDetectorRef.detectChanges();
      })
    ).subscribe({
      next: entries => {
        this.entries = entries;
      },
      error: error => {
        console.error('Error general al cargar listas de espera:', error);
        this.entries = this.waitlistService.getWaitlist();
        this.loadError = true;
      }
    });
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
