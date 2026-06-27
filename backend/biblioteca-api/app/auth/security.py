import bcrypt


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")[:72]

    hashed = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    )

    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    plain_password_bytes = plain_password.encode("utf-8")[:72]
    hashed_password_bytes = hashed_password.encode("utf-8")

    return bcrypt.checkpw(
        plain_password_bytes,
        hashed_password_bytes
    )