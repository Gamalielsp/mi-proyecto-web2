from fastapi import APIRouter, HTTPException

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


@router.post("/")
async def create_waitlist_entry(entry: WaitlistCreate):
    existing = await database.waitlist.find_one({
        "bookId": entry.bookId,
        "matricula": entry.matricula,
        "status": {
            "$in": ACTIVE_WAITLIST_STATUSES
        }
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

    result = await database.waitlist.insert_one(data)

    created_entry = await database.waitlist.find_one({
        "_id": result.inserted_id
    })

    return {
        "message": "Entrada agregada a lista de espera",
        "entry": serialize_entry(created_entry)
    }


@router.get("/")
async def get_waitlist():
    entries = []

    async for entry in database.waitlist.find():
        entries.append(serialize_entry(entry))

    return entries


@router.get("/user/{matricula}/notifications")
async def get_user_notifications(matricula: str):
    entries = []

    async for entry in database.waitlist.find({
        "matricula": matricula,
        "status": "notificado"
    }):
        entries.append(serialize_entry(entry))

    return entries


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

    await database.waitlist.update_one(
        {
            "_id": entry["_id"]
        },
        {
            "$set": {
                "status": "notificado",
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


@router.delete("/{entry_id}")
async def delete_waitlist_entry(entry_id: int):
    result = await database.waitlist.delete_one(
        id_query("id", entry_id)
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Entrada no encontrada."
        )

    return {
        "message": "Entrada eliminada correctamente"
    }


@router.delete("/book/{book_id}/user/{matricula}")
async def delete_entry_by_book_and_user(book_id: int, matricula: str):
    await database.waitlist.delete_many({
        "$or": [
            {"bookId": book_id},
            {"bookId": str(book_id)}
        ],
        "matricula": matricula
    })

    return {
        "message": "Entrada eliminada correctamente"
    }