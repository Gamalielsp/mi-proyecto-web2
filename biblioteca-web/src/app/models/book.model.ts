export interface Book {
  id: number;
  title: string;
  author: string;
  career: string;
  stock: number;
  cover?: string;
  isbn?: string;
  totalCopies?: number;
}