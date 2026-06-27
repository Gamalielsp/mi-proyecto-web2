from datetime import datetime
import re

from fastapi import APIRouter, HTTPException

from app.database import database
from app.models.book_model import BookCreate

router = APIRouter(
    prefix="/books",
    tags=["Books"]
)


def serialize_book(book):
    available_copies = int(
        book.get("availableCopies", book.get("stock", 0))
    )

    total_copies = int(
        book.get(
            "totalCopies",
            book.get("libraryStock", available_copies)
        )
    )

    return {
        "id": int(book["legacyId"]),
        "mongoId": str(book["_id"]),
        "title": book.get("title", ""),
        "author": book.get("author", ""),
        "career": book.get("career", ""),
        "isbn": book.get("isbn", ""),
        "cover": book.get("cover", ""),
        "stock": available_copies,
        "libraryStock": total_copies,
        "totalCopies": total_copies,
        "availableCopies": available_copies,
        "isActive": book.get("isActive", True)
    }


def validate_book_stock(book: BookCreate):
    if book.stock < 0 or book.availableCopies < 0:
        raise HTTPException(
            status_code=400,
            detail="Los ejemplares disponibles no pueden ser negativos."
        )

    if book.libraryStock <= 0 or book.totalCopies <= 0:
        raise HTTPException(
            status_code=400,
            detail="Los ejemplares de biblioteca deben ser mayores a 0."
        )

    if book.stock > book.libraryStock or book.availableCopies > book.totalCopies:
        raise HTTPException(
            status_code=400,
            detail="Los ejemplares para préstamo no pueden superar el total de ejemplares de biblioteca."
        )


async def find_book_by_isbn(isbn: str, ignored_legacy_id: int | None = None):
    query = {
        "isbn": {
            "$regex": f"^{re.escape(isbn.strip())}$",
            "$options": "i"
        }
    }

    if ignored_legacy_id is not None:
        query["legacyId"] = {
            "$ne": ignored_legacy_id
        }

    return await database.books.find_one(query)


@router.post("/")
async def create_book(book: BookCreate):
    validate_book_stock(book)

    isbn = book.isbn.strip()

    existing_isbn = await find_book_by_isbn(isbn)

    if existing_isbn:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un libro con ese ISBN."
        )

    new_book = book.model_dump()
    new_book["legacyId"] = int(datetime.now().timestamp() * 1000)
    new_book["title"] = new_book["title"].strip()
    new_book["author"] = new_book["author"].strip()
    new_book["career"] = new_book["career"].strip()
    new_book["isbn"] = isbn
    new_book["cover"] = new_book["cover"].strip()
    new_book["stock"] = int(new_book["availableCopies"])
    new_book["libraryStock"] = int(new_book["totalCopies"])
    new_book["isActive"] = new_book.get("isActive", True)

    result = await database.books.insert_one(new_book)

    created_book = await database.books.find_one({
        "_id": result.inserted_id
    })

    return {
        "message": "Libro creado correctamente",
        "id": new_book["legacyId"],
        "mongoId": str(result.inserted_id),
        "book": serialize_book(created_book)
    }


@router.get("/")
async def get_books():
    books = []

    async for book in database.books.find():
        if "legacyId" not in book:
            continue

        books.append(serialize_book(book))

    return books


@router.put("/{book_id}")
async def update_book(book_id: int, book: BookCreate):
    validate_book_stock(book)

    existing_book = await database.books.find_one({
        "legacyId": book_id
    })

    if not existing_book:
        raise HTTPException(
            status_code=404,
            detail="Libro no encontrado."
        )

    isbn = book.isbn.strip()
    duplicated_isbn = await find_book_by_isbn(isbn, book_id)

    if duplicated_isbn:
        raise HTTPException(
            status_code=400,
            detail="Ya existe otro libro con ese ISBN."
        )

    data = book.model_dump()
    data["title"] = data["title"].strip()
    data["author"] = data["author"].strip()
    data["career"] = data["career"].strip()
    data["isbn"] = isbn
    data["cover"] = data["cover"].strip()
    data["stock"] = int(data["availableCopies"])
    data["libraryStock"] = int(data["totalCopies"])

    await database.books.update_one(
        {
            "legacyId": book_id
        },
        {
            "$set": data
        }
    )

    updated_book = await database.books.find_one({
        "legacyId": book_id
    })

    return {
        "message": "Libro actualizado correctamente",
        "book": serialize_book(updated_book)
    }


@router.patch("/{book_id}/deactivate")
async def deactivate_book(book_id: int):
    result = await database.books.update_one(
        {
            "legacyId": book_id
        },
        {
            "$set": {
                "isActive": False
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Libro no encontrado."
        )

    return {
        "message": "Libro desactivado correctamente"
    }


@router.patch("/{book_id}/activate")
async def activate_book(book_id: int):
    result = await database.books.update_one(
        {
            "legacyId": book_id
        },
        {
            "$set": {
                "isActive": True
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Libro no encontrado."
        )

    return {
        "message": "Libro reactivado correctamente"
    }