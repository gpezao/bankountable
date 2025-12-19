"""Modelos de datos para la aplicación"""
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel

# Models para requests/responses de la API

class TransactionCreate(BaseModel):
    account_id: Optional[int] = None
    transaction_date: date
    description: str
    merchant: Optional[str] = None
    amount: float
    category_id: Optional[int] = None
    payment_method: Optional[str] = None
    tags: List[str] = []

class TransactionResponse(BaseModel):
    id: int
    account_id: Optional[int]
    transaction_date: date
    description: str
    merchant: Optional[str]
    amount: float
    category_id: Optional[int]
    category_name: Optional[str]
    payment_method: Optional[str]
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TagResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True

class StatsResponse(BaseModel):
    total: float
    total_transactions: int
    by_category: dict
    by_merchant: dict
    by_payment_method: dict
    top_categories: List[dict]
    top_merchants: List[dict]
    credit_usage: float

class ImportResponse(BaseModel):
    id: int
    filename: str
    status: str
    transactions_count: int
    imported_at: datetime
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


