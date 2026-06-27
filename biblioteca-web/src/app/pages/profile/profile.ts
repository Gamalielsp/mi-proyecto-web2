import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { catchError, finalize, forkJoin, of } from 'rxjs';

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
export class Profile implements OnInit {

  role = localStorage.getItem('userRole') || 'alumno';

  currentUser = JSON.parse(
    localStorage.getItem('currentUser') || '{}'
  );

  user: User | undefined;

  loans: Loan[] = [];
  historyLoans: Loan[] = [];

  isLoading = false;
  loadError = false;

  constructor(
    private loanService: LoanService,
    private userService: UserService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfileData();
  }

  loadProfileData(): void {
    this.isLoading = true;
    this.loadError = false;

    forkJoin({
      users: this.userService.loadUsers().pipe(
        catchError(error => {
          console.error('Error al cargar usuarios en perfil:', error);
          this.loadError = true;
          return of(this.userService.getUsers());
        })
      ),

      loans: this.loanService.loadLoans().pipe(
        catchError(error => {
          console.error('Error al cargar préstamos en perfil:', error);
          this.loadError = true;
          return of([]);
        })
      )
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.refreshProfileData();
        },
        error: error => {
          console.error('Error general al cargar perfil:', error);
          this.loadError = true;
          this.refreshProfileData();
        }
      });
  }

  private refreshProfileData(): void {
    if (!this.currentUser?.matricula) {
      this.user = undefined;
      this.loans = [];
      this.historyLoans = [];
      return;
    }

    this.user = this.userService.getUserByMatricula(
      this.currentUser.matricula
    );

    this.loans = this.loanService.getActiveLoansByUser(
      this.currentUser.matricula
    );

    this.historyLoans = this.loanService
      .getHistory()
      .filter(loan =>
        loan.matricula === this.currentUser.matricula
      );
  }

  get fullName(): string {
    return this.currentUser.name || this.user?.name || 'Usuario';
  }

  get userRole(): string {
    return this.currentUser.role || this.user?.role || 'Alumno';
  }

  get matricula(): string {
    return this.currentUser.matricula || this.user?.matricula || 'Sin registro';
  }

  get career(): string {
    return this.currentUser.career || this.user?.career || 'Sin carrera';
  }

  get email(): string {
    return this.currentUser.email || this.user?.email || 'Sin correo registrado';
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
    return this.loans;
  }

  get history(): Loan[] {
    return this.historyLoans;
  }

  get totalFines(): number {
    return this.activeLoans.reduce(
      (total, loan) => total + (loan.fineAmount || 0),
      0
    );
  }
}
