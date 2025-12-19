"""Endpoints para estadísticas"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import date
from models import StatsResponse
from services import StatsService

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("", response_model=StatsResponse)
async def get_stats(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):
    """Obtiene estadísticas de transacciones"""
    try:
        stats = StatsService.get_stats(start_date=start_date, end_date=end_date)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

