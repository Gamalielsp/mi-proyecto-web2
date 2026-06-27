from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
import re

from app.database import database
from app.auth.security import hash_password

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


class UserCreate(BaseModel):
    name: str = Field(..., min_length=3)
    matricula: str = Field(..., min_length=3)
    career: str = Field(..., min_length=1)
    role: str
    email: EmailStr
    password: str = Field(..., min_length=4)


class UserUpdate(BaseModel):
    name: str = Field(..., min_length=3)
    matricula: str = Field(..., min_length=3)
    career: str = Field(..., min_length=1)
    role: str
    email: EmailStr
    isActive: bool = True


class PasswordReset(BaseModel):
    password: str = Field(..., min_length=4)


async def generate_legacy_id():
    legacy_id = int(datetime.now().timestamp() * 1000)

    existing_user = await database.users.find_one({
        "legacyId": legacy_id
    })

    while existing_user:
        legacy_id += 1
        existing_user = await database.users.find_one({
            "legacyId": legacy_id
        })

    return legacy_id


def serialize_user(user):
    return {
        "id": user["legacyId"],
        "mongoId": str(user["_id"]),
        "name": user.get("name", ""),
        "matricula": user.get("matricula", ""),
        "career": user.get("career", ""),
        "role": user.get("role", "Alumno"),
        "email": user.get("email", ""),
        "password": "",
        "activeLoans": user.get("activeLoans", 0),
        "isActive": user.get("isActive", True)
    }


@router.get("/")
async def get_users():
    users = []

    async for user in database.users.find():
        if "legacyId" not in user:
            legacy_id = await generate_legacy_id()

            await database.users.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {
                        "legacyId": legacy_id,
                        "activeLoans": user.get("activeLoans", 0),
                        "isActive": user.get("isActive", True)
                    }
                }
            )

            user["legacyId"] = legacy_id
            user["activeLoans"] = user.get("activeLoans", 0)
            user["isActive"] = user.get("isActive", True)

        users.append(serialize_user(user))

    return users


@router.post("/")
async def create_user(user: UserCreate):
    normalized_matricula = user.matricula.strip()
    normalized_email = user.email.lower().strip()

    existing_matricula = await database.users.find_one({
        "matricula": {
            "$regex": f"^{re.escape(normalized_matricula)}$",
            "$options": "i"
        }
    })

    if existing_matricula:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un usuario con esa matrícula o número de control."
        )

    existing_email = await database.users.find_one({
        "email": normalized_email
    })

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un usuario con ese correo electrónico."
        )

    if user.role not in ["Alumno", "Profesor", "Bibliotecario"]:
        raise HTTPException(
            status_code=400,
            detail="Rol no válido."
        )

    new_user = {
        "legacyId": await generate_legacy_id(),
        "name": user.name.strip(),
        "matricula": normalized_matricula,
        "career": user.career.strip(),
        "role": user.role,
        "email": normalized_email,
        "passwordHash": hash_password(user.password),
        "activeLoans": 0,
        "isActive": True
    }

    result = await database.users.insert_one(new_user)

    created_user = await database.users.find_one({
        "_id": result.inserted_id
    })

    return {
        "message": "Usuario creado correctamente",
        "user": serialize_user(created_user)
    }


@router.put("/{user_id}")
async def update_user(user_id: int, user: UserUpdate):
    existing_user = await database.users.find_one({
        "legacyId": user_id
    })

    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado."
        )

    normalized_matricula = user.matricula.strip()
    normalized_email = user.email.lower().strip()

    duplicated_matricula = await database.users.find_one({
        "matricula": {
            "$regex": f"^{re.escape(normalized_matricula)}$",
            "$options": "i"
        },
        "legacyId": {
            "$ne": user_id
        }
    })

    if duplicated_matricula:
        raise HTTPException(
            status_code=400,
            detail="Ya existe otro usuario con esa matrícula o número de control."
        )

    duplicated_email = await database.users.find_one({
        "email": normalized_email,
        "legacyId": {
            "$ne": user_id
        }
    })

    if duplicated_email:
        raise HTTPException(
            status_code=400,
            detail="Ya existe otro usuario con ese correo electrónico."
        )

    await database.users.update_one(
        {"legacyId": user_id},
        {
            "$set": {
                "name": user.name.strip(),
                "matricula": normalized_matricula,
                "career": user.career.strip(),
                "role": existing_user["role"],
                "email": normalized_email,
                "isActive": user.isActive
            }
        }
    )

    updated_user = await database.users.find_one({
        "legacyId": user_id
    })

    return {
        "message": "Usuario actualizado correctamente",
        "user": serialize_user(updated_user)
    }


@router.patch("/{user_id}/reset-password")
async def reset_password(user_id: int, data: PasswordReset):
    result = await database.users.update_one(
        {"legacyId": user_id},
        {
            "$set": {
                "passwordHash": hash_password(data.password)
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado."
        )

    return {
        "message": "Contraseña restablecida correctamente"
    }


@router.patch("/{user_id}/deactivate")
async def deactivate_user(user_id: int):
    result = await database.users.update_one(
        {"legacyId": user_id},
        {
            "$set": {
                "isActive": False
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado."
        )

    return {
        "message": "Usuario desactivado correctamente"
    }


@router.patch("/{user_id}/activate")
async def activate_user(user_id: int):
    result = await database.users.update_one(
        {"legacyId": user_id},
        {
            "$set": {
                "isActive": True
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado."
        )

    return {
        "message": "Usuario reactivado correctamente"
    }