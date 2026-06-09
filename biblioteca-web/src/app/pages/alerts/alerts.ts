import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WaitlistEntry } from '../../models/waitlist.model';
import { WaitlistService } from '../../services/waitlist.service';

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

  currentUser = JSON.parse(
    localStorage.getItem('currentUser') || '{}'
  );

  constructor(
    private waitlistService: WaitlistService
  ) {}

  get alerts(): WaitlistEntry[] {
    return this.waitlistService.getUserNotifications(
      this.currentUser.matricula
    );
  }

  getMinutesLeft(entry: WaitlistEntry): number {
    return this.waitlistService.getMinutesLeft(entry);
  }

  confirmReservation(entry: WaitlistEntry): void {
    this.waitlistService.confirmReservation(entry.id);

    alert(
      'Solicitud de reserva confirmada. Acude a biblioteca para que el bibliotecario entregue el libro.'
    );
  }
}