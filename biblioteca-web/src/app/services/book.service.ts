import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { Book } from '../models/book.model';

interface BookCreateResponse {
  message: string;
  id: number;
  mongoId: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookService {

  private apiUrl = 'https://biblioteca-api-zppt.onrender.com/books/';

  private books: Book[] = [];

  constructor(
    private http: HttpClient
  ) {}

  private normalizeBook(book: Book): Book {
    const totalCopies = Number(
      book.totalCopies ?? book.libraryStock ?? book.stock ?? 0
    );

    const availableCopies = Number(
      book.availableCopies ?? book.stock ?? 0
    );

    return {
      ...book,
      totalCopies,
      availableCopies,
      stock: availableCopies,
      libraryStock: totalCopies,
      isActive: book.isActive !== false
    };
  }

  loadBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(this.apiUrl).pipe(
      map(books =>
        books.map(book => this.normalizeBook(book))
      ),
      tap(books => {
        this.books = books;
      })
    );
  }

  getBooks(): Book[] {
    return this.books.map(book =>
      this.normalizeBook(book)
    );
  }

  getActiveBooks(): Book[] {
    return this.getBooks().filter(book =>
      book.isActive !== false
    );
  }

  getBookById(bookId: number): Book | undefined {
    return this.getBooks().find(book =>
      book.id === bookId
    );
  }

  addBook(book: Book): Observable<Book> {
    const normalizedBook = this.normalizeBook(book);

    return this.http.post<BookCreateResponse>(
      this.apiUrl,
      normalizedBook
    ).pipe(
      map(response => ({
        ...normalizedBook,
        id: response.id,
        isActive: true
      })),
      tap(createdBook => {
        this.books = [
          ...this.books,
          this.normalizeBook(createdBook)
        ];
      })
    );
  }

  updateBook(updatedBook: Book): Observable<Book> {
    const normalizedBook = this.normalizeBook(updatedBook);

    return this.http.put<{ message: string }>(
      `${this.apiUrl}${normalizedBook.id}`,
      normalizedBook
    ).pipe(
      map(() => normalizedBook),
      tap(bookFromApi => {
        this.books = this.books.map(book =>
          book.id === bookFromApi.id
            ? this.normalizeBook(bookFromApi)
            : book
        );
      })
    );
  }

  deactivateBook(bookId: number): Observable<void> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}${bookId}/deactivate`,
      {}
    ).pipe(
      map(() => undefined),
      tap(() => {
        this.books = this.books.map(book =>
          book.id === bookId
            ? this.normalizeBook({ ...book, isActive: false })
            : book
        );
      })
    );
  }

  activateBook(bookId: number): Observable<void> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}${bookId}/activate`,
      {}
    ).pipe(
      map(() => undefined),
      tap(() => {
        this.books = this.books.map(book =>
          book.id === bookId
            ? this.normalizeBook({ ...book, isActive: true })
            : book
        );
      })
    );
  }

  deleteBook(bookId: number): Observable<void> {
    return this.deactivateBook(bookId);
  }

  reserveBook(bookId: number): boolean {
    const book = this.books.find(item =>
      item.id === bookId &&
      item.isActive !== false
    );

    const availableCopies = book?.availableCopies ?? book?.stock ?? 0;

    if (!book || availableCopies <= 0) {
      return false;
    }

    book.availableCopies = availableCopies - 1;
    book.stock = book.availableCopies;
    book.libraryStock = book.totalCopies;

    this.books = this.books.map(item =>
      item.id === bookId
        ? this.normalizeBook(book)
        : item
    );

    return true;
  }

  increaseStockById(bookId: number): void {
    const book = this.books.find(item =>
      item.id === bookId
    );

    if (!book) {
      return;
    }

    const availableCopies = book.availableCopies ?? book.stock ?? 0;
    const totalCopies = book.totalCopies ?? book.libraryStock ?? availableCopies;

    if (availableCopies < totalCopies) {
      book.availableCopies = availableCopies + 1;
    }

    book.stock = book.availableCopies ?? book.stock;
    book.libraryStock = totalCopies;
    book.totalCopies = totalCopies;

    this.books = this.books.map(item =>
      item.id === bookId
        ? this.normalizeBook(book)
        : item
    );
  }

  increaseStock(bookTitle: string): void {
    const book = this.books.find(item =>
      item.title === bookTitle
    );

    if (book) {
      this.increaseStockById(book.id);
    }
  }

  hasIsbnRegistered(isbn: string, ignoredBookId?: number): boolean {
    return this.books.some(book =>
      book.id !== ignoredBookId &&
      book.isbn.toLowerCase() === isbn.toLowerCase()
    );
  }
}
