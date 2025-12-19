# 🏦 Bankountable — Gestor Financiero Personal

Aplicación personal para mejorar la gestión de finanzas, visibilizar gastos y detectar patrones de malos hábitos financieros.

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose instalados
- (Opcional) Yarn para desarrollo local del frontend

### Levantar el sistema completo

```bash
docker-compose up
```

Esto levantará:
- **MySQL 8** en el puerto `3306`
- **Backend FastAPI** en `http://localhost:8000`
- **Frontend React + Vite** en `http://localhost:5173`

### Verificar que todo funciona

1. Abre `http://localhost:5173` en tu navegador
2. Deberías ver el dashboard con el estado del sistema
3. Verifica el endpoint de health: `http://localhost:8000/health`

## 📁 Estructura del Proyecto

```
bankountable/
├── backend/          # FastAPI + Python
├── frontend/         # React + Vite + Yarn
├── data-samples/     # Cartolas PDF de ejemplo
├── docs/            # Documentación y plan de implementación
└── docker-compose.yml
```

## 🛠️ Desarrollo Local (sin Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
yarn install
yarn dev
```

## 📊 Estado del Proyecto

**FASE 0: Setup Técnico Base** ✅ Completada

- Backend FastAPI con endpoint `/health`
- Frontend React + Vite configurado
- MySQL 8 configurado en Docker
- Docker Compose funcionando

**Próxima Fase:** FASE 1 — Frontend primero (UX + maqueta + datos dummy)

## 📝 Variables de Entorno

El backend usa variables de entorno para configuración. Ver `backend/env.example` para referencia.

Las variables se configuran automáticamente en Docker Compose, pero para desarrollo local puedes crear un archivo `.env` en `backend/` basado en `env.example`.

## 🔍 Endpoints API

- `GET /health` - Estado del sistema y conexión a base de datos
- `GET /` - Información básica de la API

## 📚 Documentación

Ver `docs/plan-implementacion.md` para el plan completo de desarrollo por fases.
