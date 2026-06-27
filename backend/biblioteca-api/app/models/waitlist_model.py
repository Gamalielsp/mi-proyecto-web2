from typing import Literal, Optional
from pydantic import BaseModel


class WaitlistCreate(BaseModel):
    id: int
    bookId: int
    bookTitle: str
    studentName: str
    matricula: str
    requestDate: str
    position: int

    status: Literal[
        "esperando",
        "notificado",
        "reserva_confirmada",
        "vencido",
        "cancelado"
    ] = "esperando"

    reservedUntil: Optional[int] = None