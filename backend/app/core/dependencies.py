from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.base import AsyncSessionLocal
from app.db.models import CreditLog, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if subject is None:
            raise credentials_exception
        user_id = int(subject)
    except (ValueError, JWTError, TypeError):
        raise credentials_exception

    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_from_ws_token(token: str, db: AsyncSession) -> User:
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid websocket token")

    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def check_credits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    await db.refresh(current_user, attribute_names=["credits_remaining"])
    if current_user.credits_remaining <= 0:
        raise HTTPException(status_code=402, detail="No credits remaining")
    return current_user


async def adjust_credits(db: AsyncSession, user: User, delta: int, reason: str) -> User:
    user.credits_remaining += delta
    db.add(CreditLog(user_id=user.id, delta=delta, reason=reason))
    await db.flush()
    return user
