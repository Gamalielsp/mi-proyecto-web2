from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "unistk_biblioteca")
SECRET_KEY = os.getenv("SECRET_KEY", "CAMBIA_ESTA_CLAVE_SUPER_SECRETA")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120")
)

if not MONGO_URI:
    raise RuntimeError(
        "No se encontró MONGO_URI. Verifica que el archivo .env esté en backend/biblioteca-api/.env"
    )