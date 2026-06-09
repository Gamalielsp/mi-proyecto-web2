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

  constructor(
    private waitlistService: WaitlistService
  ) {
    this.loadEntries();
  }

  loadEntries(): void {
    this.entries = this.waitlistService.getWaitlist();
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