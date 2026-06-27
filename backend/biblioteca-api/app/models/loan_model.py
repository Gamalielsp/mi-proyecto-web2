from typing import Literal, Optional
from pydantic import BaseModel


class LoanCreate(BaseModel):
    id: int
    folio: str

    studentName: str
    matricula: str
    userRole: str

    bookId: int
    bookTitle: str
    author: str

    borrowDate: str
    dueDate: str
    daysLeft: int

    renewed: bool = False

    status: Literal[
        "activo",
        "devolucion_pendiente",
        "devuelto",
        "vencido",
        "expirado"
    ]

    daysOverdue: Optional[int] = None
    fineAmount: Optional[int] = None

    returnFolio: Optional[str] = None
    returnRequestDate: Optional[str] = None
    returnDate: Optional[str] = None