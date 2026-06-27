from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import database

from app.routes.user_routes import router as user_router
from app.routes.auth_routes import router as auth_router
from app.routes.book_routes import router as book_router
from app.routes.reservation_routes import router as reservation_router
from app.routes.loan_routes import router as loan_router
from app.routes.waitlist_routes import router as waitlist_router

app = FastAPI(
    title="UNIST-K API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(auth_router)
app.include_router(book_router)
app.include_router(reservation_router)
app.include_router(loan_router)
app.include_router(waitlist_router)

@app.get("/")
def root():
    return {
        "message": "Backend funcionando correctamente"
    }


@app.get("/ping-db")
async def ping_db():
    await database.command("ping")

    return {
        "message": "Conexión exitosa con MongoDB Atlas"
    }