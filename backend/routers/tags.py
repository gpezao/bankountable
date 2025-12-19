"""Endpoints para etiquetas"""
from fastapi import APIRouter, HTTPException, Body
from models import TagResponse
from services import TagService

router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.get("", response_model=list[TagResponse])
async def get_tags():
    """Obtiene todas las etiquetas"""
    try:
        tags = TagService.get_all()
        return tags
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_tag(data: dict = Body(...)):
    """Crea una nueva etiqueta"""
    try:
        name = data.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="El nombre es requerido")
        tag_id = TagService.create(name)
        if not tag_id:
            raise HTTPException(status_code=400, detail="La etiqueta ya existe")
        return {"id": tag_id, "name": name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{tag_id}")
async def delete_tag(tag_id: int):
    """Elimina una etiqueta"""
    try:
        success = TagService.delete(tag_id)
        if not success:
            raise HTTPException(status_code=404, detail="Etiqueta no encontrada")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

