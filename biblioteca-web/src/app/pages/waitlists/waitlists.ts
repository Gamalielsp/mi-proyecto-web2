import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class Waitlists {

  entries: WaitlistEntry[] = [];
  loading = false;

  constructor(
    private waitlistService: WaitlistService
  ) {
    this.loadEntries();
  }

  loadEntries(): void {
    this.loading = true;

    this.waitlistService.loadWaitlist().subscribe({
      next: entries => {
        this.entries = entries;
        this.loading = false;
      },
      error: () => {
        this.entries = this.waitlistService.getWaitlist();
        this.loading = false;
        alert('No se pudieron cargar las listas de espera desde el servidor.');
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
