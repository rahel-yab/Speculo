from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.db.models import CreditLog, User
from app.schemas.credit import CreditBalance, CreditHistoryItem

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance", response_model=CreditBalance)
async def credit_balance(current_user: User = Depends(get_current_user)) -> CreditBalance:
    return CreditBalance(credits_remaining=current_user.credits_remaining)


@router.get("/history", response_model=list[CreditHistoryItem])
async def credit_history(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[CreditLog]:
    result = await db.scalars(
        select(CreditLog)
        .where(CreditLog.user_id == current_user.id)
        .order_by(CreditLog.created_at.desc())
    )
    return list(result)
