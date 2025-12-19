from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import test_db_connection
import os
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Bankountable API", version="0.2.0")

# Intentar importar routers con manejo de errores
try:
    from routers import transactions, stats, categories, tags, imports
    app.include_router(transactions.router)
    app.include_router(stats.router)
    app.include_router(categories.router)
    app.include_router(tags.router)
    app.include_router(imports.router)
    logger.info("Todos los routers cargados correctamente")
except Exception as e:
    logger.error(f"Error al cargar routers: {e}", exc_info=True)
    # Continuar sin los routers para que al menos /health funcione

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(transactions.router)
app.include_router(stats.router)
app.include_router(categories.router)
app.include_router(tags.router)
app.include_router(imports.router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_status = test_db_connection()
    return {
        "status": "ok",
        "message": "Bankountable API is running",
        "database": "connected" if db_status else "disconnected"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Bankountable API", "version": "0.2.0"}

