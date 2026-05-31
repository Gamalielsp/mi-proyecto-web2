export interface WaitlistEntry {
  id: number;
  bookId: number;
  bookTitle: string;
  studentName: string;
  matricula: string;
  requestDate: string;
  position: number;
  status: 'esperando' | 'notificado' | 'cancelado';
}