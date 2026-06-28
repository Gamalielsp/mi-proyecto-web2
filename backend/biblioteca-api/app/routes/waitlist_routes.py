import time

from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from app.database import database
from app.models.waitlist_model import WaitlistCreate

router = APIRouter(
    prefix="/waitlist",
    tags=["Waitlist"]
)

ACTIVE_WAITLIST_STATUSES = [
    "esperando",
    "notificado"
]


def now_ms() -> int:
    return int(time.time() * 1000)


def serialize_entry(entry):
    return {
        "id": int(entry["id"]),
        "mongoId": str(entry["_id"]),
        "bookId": int(entry["bookId"]),
        "bookTitle": entry["bookTitle"],
        "studentName": entry["studentName"],
        "matricula": entry["matricula"],
        "requestDate": entry["requestDate"],
        "position": int(entry["position"]),
        "status": entry["status"],
        "reservedUntil": entry.get("reservedUntil")
    }


def id_query(field: str, value: int):
    return {
        "$or": [
            {field: value},
            {field: str(value)}
        ]
    }


def book_query(book_id: int):
    return {
        "$or": [
            {"legacyId": book_id},
            {"legacyId": str(book_id)},
            {"id": book_id},
            {"id": str(book_id)}
        ]
    }


def waitlist_book_query(book_id: int):
    return {
        "$or": [
            {"bookId": book_id},
            {"bookId": str(book_id)}
        ]
    }


async def find_book(book_id: int):
    return await database.books.find_one(
        book_query(book_id)
    )


async def reserve_book_copy(book_id: int) -> bool:
    updated_book = await database.books.find_one_and_update(
        {
            "$and": [
                book_query(book_id),
                {
                    "isActive": True,
                    "availableCopies": {
                        "$gt": 0
                    }
                }
            ]
        },
        {
            "$inc": {
                "availableCopies": -1,
                "stock": -1
            }
        },
        return_document=ReturnDocument.AFTER
    )

    return updated_book is not None


async def release_book_copy(book_id: int) -> None:
    book = await find_book(book_id)

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

    new_available = min(
        available_copies + 1,
        total_copies
    )

    await database.books.update_one(
        {
            "_id": book["_id"]
        },
        {
            "$set": {
                "availableCopies": new_available,
                "stock": new_available,
                "libraryStock": total_copies,
                "totalCopies": total_copies
            }
        }
    )


async def recalculate_positions(book_id: int) -> None:
    entries = []

    async for entry in database.waitlist.find({
        "$and": [
            waitlist_book_query(book_id),
            {
                "$or": [
                    {
                        "status": "esperando"
                    },
                    {
                        "status": "notificado",
                        "reservedUntil": {
                            "$gte": now_ms()
                        }
                    }
                ]
            }
        ]
    }):
        entries.append(entry)

    entries.sort(
        key=lambda item: (
            int(item.get("position", 999999)),
            int(item.get("id", 0))
        )
    )

    for index, entry in enumerate(entries):
        await database.waitlist.update_one(
            {
                "_id": entry["_id"]
            },
            {
                "$set": {
                    "position": index + 1
                }
            }
        )


async def cleanup_expired_notifications(book_id: int | None = None) -> None:
    query = {
        "$or": [
            {
                "status": "notificado",
                "reservedUntil": {
                    "$lt": now_ms()
                }
            },
            {
                "status": "notificado",
                "reservedUntil": {
                    "$exists": False
                }
            },
            {
                "status": "notificado",
                "reservedUntil": None
            }
        ]
    }

    if book_id is not None:
        query = {
            "$and": [
                waitlist_book_query(book_id),
                query
            ]
        }

    expired_entries = []

    async for entry in database.waitlist.find(query):
        expired_entries.append(entry)

    for entry in expired_entries:
        await database.waitlist.delete_one(
            {
                "_id": entry["_id"]
            }
        )

        await release_book_copy(
            int(entry["bookId"])
        )

    affected_book_ids = {
        int(entry["bookId"])
        for entry in expired_entries
    }

    for affected_book_id in affected_book_ids:
        await recalculate_positions(affected_book_id)


async def get_waiting_entries(book_id: int):
    entries = []

    async for entry in database.waitlist.find({
        "$and": [
            waitlist_book_query(book_id),
            {
                "status": "esperando"
            }
        ]
    }):
        entries.append(entry)

    entries.sort(
        key=lambda item: (
            int(item.get("position", 999999)),
            int(item.get("id", 0))
        )
    )

    return entries


async def process_waitlist_for_book(book_id: int):
    await cleanup_expired_notifications(book_id)

    notified_entries = []

    while True:
        book = await find_book(book_id)

        if not book or book.get("isActive") is False:
            break

        available_copies = int(
            book.get("availableCopies", book.get("stock", 0))
        )

        if available_copies <= 0:
            break

        waiting_entries = await get_waiting_entries(book_id)

        if len(waiting_entries) == 0:
            break

        next_entry = waiting_entries[0]

        copy_reserved = await reserve_book_copy(book_id)

        if not copy_reserved:
            break

        reserved_until = now_ms() + (60 * 60 * 1000)

        update_result = await database.waitlist.update_one(
            {
                "_id": next_entry["_id"],
                "status": "esperando"
            },
            {
                "$set": {
                    "status": "notificado",
                    "reservedUntil": reserved_until
                }
            }
        )

        if update_result.matched_count == 0:
            await release_book_copy(book_id)
            continue

        updated_entry = await database.waitlist.find_one({
            "_id": next_entry["_id"]
        })

        if updated_entry:
            notified_entries.append(
                serialize_entry(updated_entry)
            )

        await recalculate_positions(book_id)

    return notified_entries


@router.post("/")
async def create_waitlist_entry(entry: WaitlistCreate):
    existing = await database.waitlist.find_one({
        "$and": [
            waitlist_book_query(entry.bookId),
            {
                "matricula": entry.matricula,
                "status": {
                    "$in": ACTIVE_WAITLIST_STATUSES
                }
            }
        ]
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail="El usuario ya está en la lista de espera de este libro."
        )

    data = entry.model_dump()
    data["id"] = int(data["id"])
    data["bookId"] = int(data["bookId"])
    data["position"] = int(data["position"])
    data["status"] = data.get("status", "esperando")

    result = await database.waitlist.insert_one(data)

    created_entry = await database.waitlist.find_one({
        "_id": result.inserted_id
    })

    await recalculate_positions(int(data["bookId"]))

    return {
        "message": "Entrada agregada a lista de espera",
        "entry": serialize_entry(created_entry)
    }


@router.get("/")
async def get_waitlist():
    await cleanup_expired_notifications()

    entries = []

    async for entry in database.waitlist.find():
        entries.append(serialize_entry(entry))

    return entries


@router.get("/user/{matricula}/notifications")
async def get_user_notifications(matricula: str):
    await cleanup_expired_notifications()

    entries = []

    async for entry in database.waitlist.find({
        "matricula": matricula,
        "status": "notificado",
        "reservedUntil": {
            "$gte": now_ms()
        }
    }):
        entries.append(serialize_entry(entry))

    return entries


@router.post("/process/{book_id}")
async def process_book_waitlist(book_id: int):
    notified_entries = await process_waitlist_for_book(book_id)

    entries = []

    async for entry in database.waitlist.find(
        waitlist_book_query(book_id)
    ):
        entries.append(serialize_entry(entry))

    return {
        "message": "Lista de espera procesada correctamente",
        "notified": notified_entries,
        "entries": entries
    }


@router.delete("/book/{book_id}/user/{matricula}")
async def delete_entry_by_book_and_user(
    book_id: int,
    matricula: str,
    release_stock: bool = False
):
    entries = []

    async for entry in database.waitlist.find({
        "$and": [
            waitlist_book_query(book_id),
            {
                "matricula": matricula
            }
        ]
    }):
        entries.append(entry)

    result = await database.waitlist.delete_many({
        "$and": [
            waitlist_book_query(book_id),
            {
                "matricula": matricula
            }
        ]
    })

    if release_stock:
        for entry in entries:
            if entry.get("status") == "notificado":
                await release_book_copy(
                    int(entry["bookId"])
                )

    await recalculate_positions(book_id)

    if release_stock:
        await process_waitlist_for_book(book_id)

    return {
        "message": "Entrada eliminada correctamente",
        "deleted": result.deleted_count
    }


@router.patch("/{entry_id}/notify")
async def notify_entry(entry_id: int, data: dict):
    entry = await database.waitlist.find_one(
        id_query("id", entry_id)
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Entrada no encontrada."
        )

    if entry.get("status") == "notificado":
        await database.waitlist.update_one(
            {
                "_id": entry["_id"]
            },
            {
                "$set": {
                    "reservedUntil": data.get("reservedUntil")
                }
            }
        )

        updated_entry = await database.waitlist.find_one({
            "_id": entry["_id"]
        })

        return {
            "message": "Usuario notificado correctamente",
            "entry": serialize_entry(updated_entry)
        }

    if entry.get("status") != "esperando":
        raise HTTPException(
            status_code=400,
            detail="Solo se puede notificar a usuarios en espera."
        )

    copy_reserved = await reserve_book_copy(
        int(entry["bookId"])
    )

    if not copy_reserved:
        raise HTTPException(
            status_code=400,
            detail="No hay ejemplares disponibles para notificar al usuario."
        )

    try:
        reserved_until = data.get("reservedUntil") or (
            now_ms() + (60 * 60 * 1000)
        )

        await database.waitlist.update_one(
            {
                "_id": entry["_id"],
                "status": "esperando"
            },
            {
                "$set": {
                    "status": "notificado",
                    "reservedUntil": reserved_until
                }
            }
        )

        updated_entry = await database.waitlist.find_one({
            "_id": entry["_id"]
        })

        await recalculate_positions(
            int(entry["bookId"])
        )

        return {
            "message": "Usuario notificado correctamente",
            "entry": serialize_entry(updated_entry)
        }

    except Exception:
        await release_book_copy(
            int(entry["bookId"])
        )

        raise


@router.delete("/{entry_id}")
async def delete_waitlist_entry(
    entry_id: int,
    release_stock: bool = True
):
    entry = await database.waitlist.find_one(
        id_query("id", entry_id)
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Entrada no encontrada."
        )

    book_id = int(entry["bookId"])

    should_release_stock = (
        release_stock and
        entry.get("status") == "notificado"
    )

    result = await database.waitlist.delete_one(
        {
            "_id": entry["_id"]
        }
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Entrada no encontrada."
        )

    if should_release_stock:
        await release_book_copy(book_id)

    await recalculate_positions(book_id)

    if should_release_stock:
        await process_waitlist_for_book(book_id)

    return {
        "message": "Entrada eliminada correctamente"
    }