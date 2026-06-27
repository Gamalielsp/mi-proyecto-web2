from fastapi import APIRouter, HTTPException
from app.database import database
from app.models.loan_model import LoanCreate

router = APIRouter(
    prefix="/loans",
    tags=["Loans"]
)

ACTIVE_STATUSES = [
    "activo",
    "devolucion_pendiente",
    "vencido"
]


def serialize_loan(loan):
    return {
        "id": int(loan["id"]),
        "mongoId": str(loan["_id"]),
        "folio": loan["folio"],

        "studentName": loan["studentName"],
        "matricula": loan["matricula"],
        "userRole": loan["userRole"],

        "bookId": int(loan["bookId"]),
        "bookTitle": loan["bookTitle"],
        "author": loan["author"],

        "borrowDate": loan["borrowDate"],
        "dueDate": loan["dueDate"],
        "daysLeft": int(loan.get("daysLeft", 0)),

        "renewed": loan.get("renewed", False),
        "status": loan["status"],

        "daysOverdue": loan.get("daysOverdue"),
        "fineAmount": loan.get("fineAmount"),

        "returnFolio": loan.get("returnFolio"),
        "returnRequestDate": loan.get("returnRequestDate"),
        "returnDate": loan.get("returnDate")
    }


async def find_loan(loan_id: int):
    return await database.loans.find_one({
        "$or": [
            {"id": loan_id},
            {"id": str(loan_id)}
        ]
    })


async def find_book(book_id):
    return await database.books.find_one({
        "$or": [
            {"legacyId": book_id},
            {"legacyId": str(book_id)},
            {"id": book_id},
            {"id": str(book_id)}
        ]
    })


@router.post("/")
async def create_loan(loan: LoanCreate):
    existing = await database.loans.find_one({
        "matricula": loan.matricula,
        "bookId": loan.bookId,
        "status": {
            "$in": ACTIVE_STATUSES
        }
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail="El usuario ya tiene un préstamo activo de este libro."
        )

    data = loan.model_dump()
    data["id"] = int(data["id"])
    data["bookId"] = int(data["bookId"])

    result = await database.loans.insert_one(data)

    created_loan = await database.loans.find_one({
        "_id": result.inserted_id
    })

    return {
        "message": "Préstamo creado correctamente",
        "loan": serialize_loan(created_loan)
    }


@router.get("/")
async def get_loans():
    loans = []

    async for loan in database.loans.find():
        loans.append(serialize_loan(loan))

    return loans


@router.get("/active")
async def get_active_loans():
    loans = []

    async for loan in database.loans.find({
        "status": {
            "$in": ACTIVE_STATUSES
        }
    }):
        loans.append(serialize_loan(loan))

    return loans


@router.get("/history")
async def get_loan_history():
    loans = []

    async for loan in database.loans.find({
        "status": "devuelto"
    }):
        loans.append(serialize_loan(loan))

    return loans


@router.get("/user/{matricula}")
async def get_user_loans(matricula: str):
    loans = []

    async for loan in database.loans.find({
        "matricula": matricula
    }):
        loans.append(serialize_loan(loan))

    return loans


@router.patch("/{loan_id}/request-return")
async def request_return(loan_id: int, data: dict):
    loan = await find_loan(loan_id)

    if not loan:
        raise HTTPException(
            status_code=404,
            detail="Préstamo no encontrado."
        )

    if loan["status"] not in [
        "activo",
        "vencido",
        "devolucion_pendiente"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Solo se puede solicitar devolución de préstamos activos o vencidos."
        )

    await database.loans.update_one(
        {
            "_id": loan["_id"]
        },
        {
            "$set": {
                "status": "devolucion_pendiente",
                "returnRequestDate": data.get("returnRequestDate")
            }
        }
    )

    updated_loan = await database.loans.find_one({
        "_id": loan["_id"]
    })

    return {
        "message": "Solicitud de devolución registrada",
        "loan": serialize_loan(updated_loan)
    }


@router.patch("/{loan_id}/renew")
async def renew_loan(loan_id: int, data: dict):
    loan = await find_loan(loan_id)

    if not loan:
        raise HTTPException(
            status_code=404,
            detail="Préstamo no encontrado."
        )

    if loan["status"] != "activo":
        raise HTTPException(
            status_code=400,
            detail="Sólo se pueden renovar préstamos activos no vencidos."
        )

    if loan.get("renewed", False):
        raise HTTPException(
            status_code=400,
            detail="Este préstamo ya fue renovado una vez."
        )

    await database.loans.update_one(
        {
            "_id": loan["_id"]
        },
        {
            "$set": {
                "dueDate": data.get("dueDate"),
                "daysLeft": data.get("daysLeft"),
                "renewed": True
            }
        }
    )

    updated_loan = await database.loans.find_one({
        "_id": loan["_id"]
    })

    return {
        "message": "Préstamo renovado correctamente",
        "loan": serialize_loan(updated_loan)
    }


@router.patch("/{loan_id}/confirm-return")
async def confirm_return(loan_id: int, data: dict):
    loan = await find_loan(loan_id)

    if not loan:
        raise HTTPException(
            status_code=404,
            detail="Préstamo no encontrado."
        )

    if loan["status"] not in [
        "activo",
        "vencido",
        "devolucion_pendiente"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden confirmar devoluciones de préstamos activos, vencidos o pendientes de devolución."
        )

    book = await find_book(loan["bookId"])

    if not book:
        raise HTTPException(
            status_code=404,
            detail="Libro relacionado con el préstamo no encontrado."
        )

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

    await database.loans.update_one(
        {
            "_id": loan["_id"]
        },
        {
            "$set": {
                "status": "devuelto",
                "returnFolio": data.get("returnFolio"),
                "returnDate": data.get("returnDate")
            }
        }
    )

    updated_loan = await database.loans.find_one({
        "_id": loan["_id"]
    })

    return {
        "message": "Devolución confirmada correctamente",
        "loan": serialize_loan(updated_loan)
    }


@router.patch("/{loan_id}/overdue")
async def mark_overdue(loan_id: int, data: dict):
    loan = await find_loan(loan_id)

    if not loan:
        raise HTTPException(
            status_code=404,
            detail="Préstamo no encontrado."
        )

    if loan["status"] != "activo":
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden marcar como vencidos los préstamos activos."
        )

    await database.loans.update_one(
        {
            "_id": loan["_id"]
        },
        {
            "$set": {
                "status": "vencido",
                "daysOverdue": data.get("daysOverdue"),
                "fineAmount": data.get("fineAmount"),
                "daysLeft": 0
            }
        }
    )

    updated_loan = await database.loans.find_one({
        "_id": loan["_id"]
    })

    return {
        "message": "Préstamo marcado como vencido",
        "loan": serialize_loan(updated_loan)
    }
