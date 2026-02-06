import os
from typing import Dict, Any
from fastapi import Request, HTTPException, status
import jwt
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

ACCESS_TOKEN_SECRET = os.getenv("ACCESS_TOKEN_SECRET")

if not ACCESS_TOKEN_SECRET:
    raise RuntimeError("ACCESS_TOKEN_SECRET environment variable is required")


def verifyAuth(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("accessToken")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token cookie",
        )

    try:
        payload = jwt.decode(token, ACCESS_TOKEN_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
