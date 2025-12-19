"""Endpoints para categorías"""
from fastapi import APIRouter, HTTPException, Body
from typing import Optional
from models import CategoryResponse
from services import CategoryService

router = APIRouter(prefix="/api/categories", tags=["categories"])

@router.get("", response_model=list[CategoryResponse])
async def get_categories():
    """Obtiene todas las categorías"""
    try:
        categories = CategoryService.get_all()
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_category(data: dict = Body(...)):
    """Crea una nueva categoría"""
    try:
        name = data.get("name")
        description = data.get("description")
        if not name:
            raise HTTPException(status_code=400, detail="El nombre es requerido")
        category_id = CategoryService.create(name, description)
        return {"id": category_id, "name": name, "description": description}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{category_id}")
async def update_category(category_id: int, data: dict = Body(...)):
    """Actualiza una categoría"""
    try:
        name = data.get("name")
        description = data.get("description")
        success = CategoryService.update(category_id, name, description)
        if not success:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{category_id}")
async def delete_category(category_id: int):
    """Elimina una categoría"""
    try:
        success = CategoryService.delete(category_id)
        if not success:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

