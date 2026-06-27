from typing import Literal
from pydantic import BaseModel


class ReservationCreate(BaseModel):
    id: int
    folio: str

    bookId: int
    bookTitle: str
    author: str

    studentName: str
    matricula: str
    userRole: str

    requestDate: str
    requestTime: str
    expiresAt: str

    status: Literal["pendiente", "entregado", "expirada", "cancelada"] = "pendiente"