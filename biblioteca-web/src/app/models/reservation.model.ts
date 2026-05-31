export interface Reservation {
  id: number;
  folio: string;

  bookId: number;
  bookTitle: string;
  author: string;

  studentName: string;
  matricula: string;
  userRole: string;

  requestDate: string;
  requestTime: string;
  expiresAt: string;

  status: 'pendiente' | 'entregado' | 'expirada' | 'cancelada';
}