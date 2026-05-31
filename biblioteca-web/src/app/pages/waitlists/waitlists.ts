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

  constructor(private waitlistService: WaitlistService) {
    this.entries = this.waitlistService.getWaitlist();
  }

}
