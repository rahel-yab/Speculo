from fastapi import Request
from slowapi import Limiter

from app.core.config import settings
from app.core.security import decode_access_token


def rate_limit_key_func(request: Request) -> str:
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            return f"user:{decode_access_token(token)['sub']}"
        except (KeyError, ValueError):
            pass
    return request.client.host if request.client else "anonymous"


limiter = Limiter(key_func=rate_limit_key_func, storage_uri=settings.redis_url)
