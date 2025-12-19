#!/bin/bash
# Script de inicio para el backend

echo "Esperando a que MySQL esté listo..."
sleep 5

echo "Inicializando base de datos..."
python db_init.py

echo "Iniciando servidor FastAPI..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
