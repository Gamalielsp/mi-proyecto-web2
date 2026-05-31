import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LoanService } from '../../services/loan.service';
import { UserService } from '../../services/user.service';

import { Loan } from '../../models/loan.model';
import { User } from '../../models/user.model';

import { MobileNavComponent } from '../../components/mobile-nav/mobile-nav';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MobileNavComponent
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {

  role =
    localStorage.getItem('userRole') || 'alumno';

  currentUser = JSON.parse(
    localStorage.getItem('currentUser') || '{}'
  );

  user: User | undefined;

  constructor(
    private loanService: LoanService,
    private userService: UserService
  ) {
    this.user = this.userService.getUserByMatricula(
      this.currentUser.matricula
    );
  }

  get fullName(): string {
    return this.user?.name || this.currentUser.name || 'Usuario';
  }

  get userRole(): string {
    return this.user?.role || this.currentUser.role || 'Alumno';
  }

  get matricula(): string {
    return this.user?.matricula || this.currentUser.matricula || 'Sin registro';
  }

  get career(): string {
    return this.user?.career || this.currentUser.career || 'Sin carrera';
  }

  get email(): string {
    return this.user?.email || this.currentUser.email || 'Sin correo registrado';
  }

  get isStudent(): boolean {
    return this.role === 'alumno';
  }

  get isProfessor(): boolean {
    return this.role === 'profesor';
  }

  get isLibrarian(): boolean {
    return this.role === 'bibliotecario';
  }

  get activeLoans(): Loan[] {
    return this.loanService
      .getActiveLoansByUser(this.matricula);
  }

  get history(): Loan[] {
    return this.loanService
      .getHistory()
      .filter(loan =>
        loan.matricula === this.matricula
      );
  }

  get totalFines(): number {
    return this.activeLoans.reduce(
      (total, loan) => total + (loan.fineAmount || 0),
      0
    );
  }

}