import { Book } from '../models/book.model';

export const CAREERS: string[] = [
  'Todas',
  'Ingeniería',
  'Sistemas',
  'Química',
  'Administración'
];

export const BOOKS: Book[] = [
  {
    id: 1,
    title: 'Cálculo de una Variable',
    author: 'James Stewart',
    career: 'Ingeniería',
    stock: 3,
    cover: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=200&h=300&fit=crop',
    isbn: '978-607-522-001'
  },
  {
    id: 2,
    title: 'Fundamentos de Programación',
    author: 'Luis Joyanes',
    career: 'Sistemas',
    stock: 0,
    cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=200&h=300&fit=crop',
    isbn: '978-607-522-002'
  },
  {
    id: 3,
    title: 'Química Orgánica',
    author: 'John McMurry',
    career: 'Química',
    stock: 5,
    cover: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=200&h=300&fit=crop',
    isbn: '978-607-522-003'
  },
  {
    id: 4,
    title: 'Resistencia de Materiales',
    author: 'Ferdinand Singer',
    career: 'Ingeniería',
    stock: 2,
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=300&fit=crop',
    isbn: '978-607-522-004'
  },
  {
    id: 5,
    title: 'Administración Estratégica',
    author: 'Fred R. David',
    career: 'Administración',
    stock: 1,
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop',
    isbn: '978-607-522-005'
  },
  {
    id: 6,
    title: 'Ecuaciones Diferenciales',
    author: 'Dennis Zill',
    career: 'Ingeniería',
    stock: 4,
    cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200&h=300&fit=crop',
    isbn: '978-607-522-006'
  },
  {
    id: 7,
    title: 'Bases de Datos Relacionales',
    author: 'Abraham Silberschatz',
    career: 'Sistemas',
    stock: 2,
    cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=200&h=300&fit=crop',
    isbn: '978-607-522-007'
  },
  {
    id: 8,
    title: 'Microeconomía',
    author: 'Michael Parkin',
    career: 'Administración',
    stock: 0,
    cover: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=300&fit=crop',
    isbn: '978-607-522-008'
  }
];

export const MY_LOANS = [
  {
    id: 1,
    bookTitle: 'Cálculo de una Variable',
    author: 'James Stewart',
    borrowDate: '2026-05-20',
    dueDate: '2026-06-03',
    daysLeft: 7,
    totalDays: 14
  },
  {
    id: 2,
    bookTitle: 'Resistencia de Materiales',
    author: 'Ferdinand Singer',
    borrowDate: '2026-05-15',
    dueDate: '2026-05-29',
    daysLeft: 2,
    totalDays: 14
  }
];

export const MY_HISTORY = [
  {
    id: 1,
    bookTitle: 'Álgebra Lineal',
    author: 'Stanley Grossman',
    returnDate: '2026-04-10'
  },
  {
    id: 2,
    bookTitle: 'Física Universitaria',
    author: 'Sears & Zemansky',
    returnDate: '2026-03-22'
  },
  {
    id: 3,
    bookTitle: 'Termodinámica',
    author: 'Yunus Çengel',
    returnDate: '2026-02-15'
  }
];

export const FOLIO_HISTORY = [
  {
    id: 1,
    folio: 'BIB-284751',
    book: 'Cálculo de una Variable',
    date: '2026-05-20',
    status: 'recogido'
  },
  {
    id: 2,
    folio: 'BIB-193842',
    book: 'Álgebra Lineal',
    date: '2026-04-08',
    status: 'expirado'
  },
  {
    id: 3,
    folio: 'BIB-376510',
    book: 'Física Universitaria',
    date: '2026-03-15',
    status: 'recogido'
  }
];