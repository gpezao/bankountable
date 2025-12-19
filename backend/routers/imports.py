"""Endpoints para importar archivos"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
from pathlib import Path
from datetime import datetime
from database import get_db_connection
from pdf_parser import PDFParser
from services import TransactionService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/import", tags=["import"])

# Directorio para guardar archivos subidos temporalmente
def get_upload_dir():
    """Obtiene el directorio de uploads, creándolo si no existe"""
    upload_dir = Path("/app/data-samples/uploads")
    try:
        upload_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.warning(f"No se pudo crear directorio de uploads: {e}")
        # Fallback a directorio temporal
        upload_dir = Path("/tmp/bankountable_uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir

@router.post("/pdf")
async def import_pdf(file: UploadFile = File(...)):
    """Importa transacciones desde un archivo PDF"""
    import_id = None
    upload_dir = get_upload_dir()
    
    try:
        # Guardar archivo temporalmente
        file_path = upload_dir / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Registrar import en la base de datos
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="No se pudo conectar a la base de datos")
        
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO imports (filename, file_path, status, import_type)
                    VALUES (%s, %s, %s, %s)
                """, (file.filename, str(file_path), "processing", "pdf"))
                import_id = cursor.lastrowid
                conn.commit()
        finally:
            conn.close()
        
        # Parsear PDF
        parser = PDFParser()
        try:
            transactions_data = parser.parse_pdf(str(file_path))
        except Exception as parse_error:
            logger.error(f"Error al parsear PDF: {parse_error}", exc_info=True)
            raise HTTPException(
                status_code=400, 
                detail=f"Error al parsear el PDF: {str(parse_error)}"
            )
        
        # Guardar transacciones en la base de datos
        saved_count = 0
        for tx_data in transactions_data:
            try:
                tx_data['import_id'] = import_id
                TransactionService.create_transaction(
                    tx_data,
                    tags=tx_data.get('tags', [])
                )
                saved_count += 1
            except Exception as e:
                logger.error(f"Error al guardar transacción: {e}")
        
        # Actualizar estado del import
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        UPDATE imports 
                        SET status = %s, transactions_count = %s
                        WHERE id = %s
                    """, ("completed", saved_count, import_id))
                    conn.commit()
            finally:
                conn.close()
        
        # Eliminar archivo temporal
        if file_path.exists():
            file_path.unlink()
        
        return {
            "success": True,
            "import_id": import_id,
            "transactions_imported": saved_count,
            "message": f"Se importaron {saved_count} transacciones exitosamente"
        }
        
    except Exception as e:
        logger.error(f"Error al importar PDF: {e}")
        
        # Actualizar estado del import como fallido
        if import_id:
            conn = get_db_connection()
            if conn:
                try:
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            UPDATE imports 
                            SET status = %s, error_message = %s
                            WHERE id = %s
                        """, ("failed", str(e), import_id))
                        conn.commit()
                finally:
                    conn.close()
        
        raise HTTPException(status_code=500, detail=f"Error al importar PDF: {str(e)}")

@router.get("/list")
async def list_imports():
    """Lista todos los imports realizados"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, filename, status, transactions_count, 
                       imported_at, error_message
                FROM imports
                ORDER BY imported_at DESC
                LIMIT 50
            """)
            imports = [dict(row) for row in cursor.fetchall()]
            return imports
    finally:
        conn.close()

