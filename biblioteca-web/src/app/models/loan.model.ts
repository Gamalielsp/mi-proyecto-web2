export interface Loan {
  id: number;
  folio: string;

  studentName: string;
  matricula: string;
  userRole: string;

  bookId: number;
  bookTitle: string;
  author: string;

  borrowDate: string;
  dueDate: string;
  daysLeft: number;

  renewed: boolean;

  status:
    | 'activo'
    | 'devolucion_pendiente'
    | 'devuelto'
    | 'vencido'
    | 'expirado';

  daysOverdue?: number;
  fineAmount?: number;

  returnFolio?: string;
  returnRequestDate?: string;
  returnDate?: string;
}