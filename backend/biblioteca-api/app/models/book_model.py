from pydantic import BaseModel, Field


class BookCreate(BaseModel):
    title: str = Field(..., min_length=1)
    author: str = Field(..., min_length=1)
    career: str = Field(..., min_length=1)
    isbn: str = Field(..., min_length=1)
    cover: str = Field(..., min_length=1)

    stock: int
    libraryStock: int
    totalCopies: int
    availableCopies: int

    isActive: bool = True