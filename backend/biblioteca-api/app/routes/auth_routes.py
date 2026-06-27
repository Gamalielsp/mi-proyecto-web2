import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import database
from app.auth.security import verify_password
from app.auth.jwt import create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


class LoginRequest(BaseModel):
    identifier: str
    password: str


@router.post("/login")
async def login(data: LoginRequest):
    identifier = data.identifier.strip()
    normalized_identifier = identifier.lower()

    user = await database.users.find_one({
        "$or": [
            {
                "matricula": {
                    "$regex": f"^{re.escape(identifier)}$",
                    "$options": "i"
                }
            },
            {
                "email": normalized_identifier
            }
        ],
        "isActive": True
    })

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos."
        )

    if not verify_password(data.password, user["passwordHash"]):
        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos."
        )

    token = create_access_token({
        "sub": str(user["_id"]),
        "role": user["role"],
        "matricula": user["matricula"]
    })

    return {
        "accessToken": token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "matricula": user["matricula"],
            "career": user["career"],
            "role": user["role"],
            "email": user["email"]
        }
    }