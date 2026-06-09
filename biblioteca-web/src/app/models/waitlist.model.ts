export interface WaitlistEntry {
  id: number;
  bookId: number;
  bookTitle: string;
  studentName: string;
  matricula: string;
  requestDate: string;
  position: number;
  status:
    | 'esperando'
    | 'notificado'
    | 'reserva_confirmada'
    | 'vencido'
    | 'cancelado';
  reservedUntil?: number;
}