from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import database
from app.models.reservation_model import ReservationCreate

router = APIRouter(
    prefix="/reservations",
    tags=["Reservations"]
)


def serialize_reservation(reservation):
    return {
        "id": int(reservation["id"]),
        "mongoId": str(reservation["_id"]),
        "folio": reservation["folio"],
        "bookId": int(reservation["bookId"]),
        "bookTitle": reservation["bookTitle"],
        "author": reservation["author"],
        "studentName": reservation["studentName"],
        "matricula": reservation["matricula"],
        "userRole": reservation["userRole"],
        "requestDate": reservation["requestDate"],
        "requestTime": reservation["requestTime"],
        "expiresAt": reservation["expiresAt"],
        "status": reservation["status"]
    }


async def find_reservation(reservation_id: int):
    return await database.reservations.find_one({
        "$or": [
            {"id": reservation_id},
            {"id": str(reservation_id)}
        ]
    })


async def return_book_copy(book_id: int):
    book = await database.books.find_one({
        "$or": [
            {"legacyId": book_id},
            {"legacyId": str(book_id)},
            {"id": book_id},
            {"id": str(book_id)}
        ]
    })

    if not book:
        return

    available_copies = int(
        book.get("availableCopies", book.get("stock", 0))
    )

    total_copies = int(
        book.get(
            "totalCopies",
            book.get("libraryStock", available_copies)
        )
    )

    new_available = min(available_copies + 1, total_copies)

    await database.books.update_one(
        {"_id": book["_id"]},
        {
            "$set": {
                "availableCopies": new_available,
                "stock": new_available,
                "libraryStock": total_copies,
                "totalCopies": total_copies
            }
        }
    )


@router.post("/")
async def create_reservation(reservation: ReservationCreate):
    existing = await database.reservations.find_one({
        "matricula": reservation.matricula,
        "bookId": reservation.bookId,
        "status": "pendiente"
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una reserva pendiente para este libro."
        )

    updated_book = await database.books.find_one_and_update(
        {
            "legacyId": reservation.bookId,
            "isActive": True,
            "availableCopies": {
                "$gt": 0
            }
        },
        {
            "$inc": {
                "availableCopies": -1,
                "stock": -1
            }
        },
        return_document=ReturnDocument.AFTER
    )

    if not updated_book:
        raise HTTPException(
            status_code=400,
            detail="No hay ejemplares disponibles para reservar."
        )

    data = reservation.model_dump()
    data["id"] = int(data["id"])
    data["bookId"] = int(data["bookId"])

    result = await database.reservations.insert_one(data)

    created_reservation = await database.reservations.find_one({
        "_id": result.inserted_id
    })

    return {
        "message": "Reserva creada correctamente",
        "reservation": serialize_reservation(created_reservation)
    }


@router.get("/")
async def get_reservations():
    reservations = []

    async for reservation in database.reservations.find():
        reservations.append(serialize_reservation(reservation))

    return reservations


@router.get("/pending")
async def get_pending_reservations():
    reservations = []

    async for reservation in database.reservations.find({
        "status": "pendiente"
    }):
        reservations.append(serialize_reservation(reservation))

    return reservations


@router.get("/history")
async def get_reservation_history():
    reservations = []

    async for reservation in database.reservations.find({
        "status": {
            "$ne": "pendiente"
        }
    }):
        reservations.append(serialize_reservation(reservation))

    return reservations


@router.get("/user/{matricula}")
async def get_user_reservations(matricula: str):
    reservations = []

    async for reservation in database.reservations.find({
        "matricula": matricula
    }):
        reservations.append(serialize_reservation(reservation))

    return reservations


@router.patch("/{reservation_id}/delivered")
async def mark_as_delivered(reservation_id: int):
    reservation = await find_reservation(reservation_id)

    if not reservation:
        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada."
        )

    if reservation["status"] != "pendiente":
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden entregar reservas pendientes."
        )

    await database.reservations.update_one(
        {
            "_id": reservation["_id"]
        },
        {
            "$set": {
                "status": "entregado"
            }
        }
    )

    updated_reservation = await database.reservations.find_one({
        "_id": reservation["_id"]
    })

    return {
        "message": "Reserva marcada como entregada",
        "reservation": serialize_reservation(updated_reservation)
    }


@router.patch("/{reservation_id}/cancel")
async def cancel_reservation(reservation_id: int):
    reservation = await find_reservation(reservation_id)

    if not reservation:
        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada."
        )

    if reservation["status"] != "pendiente":
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden cancelar reservas pendientes."
        )

    await database.reservations.update_one(
        {
            "_id": reservation["_id"]
        },
        {
            "$set": {
                "status": "cancelada"
            }
        }
    )

    await return_book_copy(int(reservation["bookId"]))

    updated_reservation = await database.reservations.find_one({
        "_id": reservation["_id"]
    })

    return {
        "message": "Reserva cancelada correctamente",
        "reservation": serialize_reservation(updated_reservation)
    }


@router.patch("/{reservation_id}/expire")
async def expire_reservation(reservation_id: int):
    reservation = await find_reservation(reservation_id)

    if not reservation:
        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada."
        )

    if reservation["status"] != "pendiente":
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden expirar reservas pendientes."
        )

    await database.reservations.update_one(
        {
            "_id": reservation["_id"]
        },
        {
            "$set": {
                "status": "expirada"
            }
        }
    )

    await return_book_copy(int(reservation["bookId"]))

    updated_reservation = await database.reservations.find_one({
        "_id": reservation["_id"]
    })

    return {
        "message": "Reserva expirada correctamente",
        "reservation": serialize_reservation(updated_reservation)
    }
