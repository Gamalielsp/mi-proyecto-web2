export interface Book {
  id: number;
  title: string;
  author: string;
  career: string;

  stock: number;
  libraryStock: number;
  totalCopies: number;
  availableCopies?: number;

  isbn: string;
  cover: string;

  isActive?: boolean;
}