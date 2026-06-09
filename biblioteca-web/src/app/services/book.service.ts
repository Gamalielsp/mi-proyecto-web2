import { Injectable } from '@angular/core';
import { Book } from '../models/book.model';

@Injectable({
  providedIn: 'root'
})
export class BookService {

  private storageKey = 'books';

  private defaultBooks: Book[] = [
    {
      id: 1,
      title: 'Cálculo de una Variable',
      author: 'James Stewart',
      career: 'Ingeniería en Computación',
      stock: 3,
      libraryStock: 5,
      totalCopies: 5,
      cover: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=200&h=300&fit=crop',
      isbn: '978-607-522-001'
    },
    {
      id: 2,
      title: 'Fundamentos de Programación',
      author: 'Luis Joyanes',
      career: 'Ingeniería en Computación',
      stock: 0,
      libraryStock: 2,
      totalCopies: 2,
      cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=200&h=300&fit=crop',
      isbn: '978-607-522-002'
    },
    {
      id: 3,
      title: 'Química Orgánica',
      author: 'John McMurry',
      career: 'Ingeniería Química',
      stock: 5,
      libraryStock: 7,
      totalCopies: 7,
      cover: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=200&h=300&fit=crop',
      isbn: '978-607-522-003'
    },
    {
      id: 4,
      title: 'Resistencia de Materiales',
      author: 'Ferdinand Singer',
      career: 'Ingeniería Industrial',
      stock: 2,
      libraryStock: 4,
      totalCopies: 4,
      cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=300&fit=crop',
      isbn: '978-607-522-004'
    },
    {
      id: 5,
      title: 'Administración Estratégica',
      author: 'Fred R. David',
      career: 'Ingeniería Industrial',
      stock: 1,
      libraryStock: 3,
      totalCopies: 3,
      cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop',
      isbn: '978-607-522-005'
    },
    {
      id: 6,
      title: 'Ecuaciones Diferenciales',
      author: 'Dennis Zill',
      career: 'Licenciatura en Matemáticas Aplicadas',
      stock: 4,
      libraryStock: 6,
      totalCopies: 6,
      cover: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200&h=300&fit=crop',
      isbn: '978-607-522-006'
    },
    {
      id: 7,
      title: 'Bases de Datos Relacionales',
      author: 'Abraham Silberschatz',
      career: 'Ingeniería en Computación',
      stock: 2,
      libraryStock: 4,
      totalCopies: 4,
      cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=200&h=300&fit=crop',
      isbn: '978-607-522-007'
    },
    {
      id: 8,
      title: 'Microeconomía',
      author: 'Michael Parkin',
      career: 'Licenciatura en Matemáticas Aplicadas',
      stock: 0,
      libraryStock: 2,
      totalCopies: 2,
      cover: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=300&fit=crop',
      isbn: '978-607-522-008'
    }
  ];

  private books: Book[] = [];

  constructor() {
    const savedBooks = localStorage.getItem(this.storageKey);

    if (savedBooks) {
      this.books = JSON.parse(savedBooks);
    } else {
      this.books = this.defaultBooks;
      this.saveBooks();
    }
  }

  private saveBooks(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.books)
    );
  }

  getBooks(): Book[] {
    return this.books;
  }

  addBook(book: Book): void {
    this.books.push(book);
    this.saveBooks();
  }

  updateBook(updatedBook: Book): void {
    this.books = this.books.map(book =>
      book.id === updatedBook.id
        ? updatedBook
        : book
    );

    this.saveBooks();
  }

  deleteBook(bookId: number): void {
    this.books = this.books.filter(book =>
      book.id !== bookId
    );

    this.saveBooks();
  }

  reserveBook(bookId: number): boolean {
    const book = this.books.find(b => b.id === bookId);

    if (!book || book.stock <= 0) {
      return false;
    }

    book.stock = book.stock - 1;
    book.totalCopies = book.libraryStock || book.totalCopies || book.stock;

    this.saveBooks();

    return true;
  }

  increaseStock(bookTitle: string): void {
    const book = this.books.find(b => b.title === bookTitle);

    if (book) {
      const maxLibraryStock = book.libraryStock || book.totalCopies || 0;

      if (book.stock < maxLibraryStock) {
        book.stock = book.stock + 1;
      }

      book.totalCopies = maxLibraryStock;
      this.saveBooks();
    }
  }
}