export interface Book {
  id: number;
  title: string;
  author: string;
  career: string;

  stock: number; // Ejemplares disponibles para préstamo
  libraryStock?: number; // Ejemplares disponibles en biblioteca
  totalCopies?: number;

  isbn?: string;
  cover?: string;

  reservedFor?: string;
  reservedUntil?: number;
}