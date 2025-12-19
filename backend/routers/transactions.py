"""Endpoints para transacciones"""
from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional
from datetime import date
from models import TransactionResponse
from services import TransactionService

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.get("")
async def get_transactions(
    category_id: Optional[int] = Query(None),
    payment_method: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(1000, le=10000),
    offset: int = Query(0, ge=0)
):
    """Obtiene transacciones con filtros opcionales"""
    try:
        transactions = TransactionService.get_transactions(
            category_id=category_id,
            payment_method=payment_method,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )
        return transactions
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{transaction_id}")
async def update_transaction(transaction_id: int, updates: dict = Body(...)):
    """Actualiza una transacción"""
    try:
        success = TransactionService.update_transaction(transaction_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Transacción no encontrada")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int):
    """Elimina una transacción"""
    try:
        success = TransactionService.delete_transaction(transaction_id)
        if not success:
            raise HTTPException(status_code=404, detail="Transacción no encontrada")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

