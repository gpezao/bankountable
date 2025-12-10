## 🧠 **Contexto General del Proyecto**

Estoy construyendo una herramienta personal de gestión financiera para analizar mis gastos, leer mis cartolas bancarias y dar visibilidad clara sobre mis finanzas. El objetivo es que el sistema funcione con **cero configuración manual**, pueda parsear archivos PDF y Excel reales (incluyendo algunos protegidos con contraseña) provenientes de bancos chilenos, y maneje correctamente formatos numéricos en CLP (con punto como separador de miles).

El stack de desarrollo será:

* **Backend:** Python (FastAPI o Flask), ejecutado SIEMPRE dentro de:

  * un **virtual environment local**, o
  * **Docker**
    (Cursor debe implementar con esta restricción en mente: *no instalar nada global, ni modificar versiones del sistema*.)

* **Frontend:** React + Vite, manejado con **yarn**, fácil de recompilar.

El proyecto debe incluir soporte funcional desde el primer momento para leer y parsear archivos reales ubicados en el directorio `data-samples/`, incluidos archivos PDF con contraseña.

---

# 🎯 **Objetivo del Prompt**

Quiero que generes **la estructura completa del proyecto + archivos iniciales + setup + código base** siguiendo **estrictamente** las instrucciones del plan detallado abajo.

Cursor debe generar:

1. **Estructura de carpetas**
2. **Código base del backend**
3. **Código base del frontend**
4. **Configuración de entorno (.env, .env.example, settings.py)**
5. **Scripts de arranque**
6. **Dockerfile + docker-compose.yml**
7. **Tests iniciales**
8. **Lectura de archivos PDF/Excel desde data-samples**
9. **Parsing correcto de CLP**
10. **Primera versión de endpoints funcionales**

---

# 📦 **PLAN DE IMPLEMENTACIÓN (detallado para Cursor)**

### 1. Estructura del repositorio

Crear un monorepo llamado `bankountable/` con esta estructura:

```
bankountable/
  backend/
    app/
      controllers/
      services/
      models/
      utils/
      config/
    tests/
    data-samples/   ← usar archivos reales aquí
    requirements.txt
    Dockerfile
    .env.example
  frontend/
    src/
    public/
    package.json
    yarn.lock
  docker-compose.yml
  README.md
```

---

# 🐍 **2. Backend (Python)**

### Requisitos generales:

* Usar **FastAPI** (preferido) o Flask si es más sencillo.
* El backend **NO debe depender de instalaciones globales**.
* Crear un entorno Python local mediante:

```
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

O usar Docker:

* El backend debe funcionar completamente dentro del contenedor.
* Debe mapear `data-samples/` hacia `/app/data-samples`.

---

## 2.1. requirements.txt (Cursor debe generarlo)

Incluir mínimo:

```
fastapi
uvicorn
python-dotenv
pydantic
pandas
openpyxl
pdfplumber
PyMuPDF
python-dateutil
```

---

## 2.2. Configuración global (obligatorio)

Crear archivo:

**backend/app/config/settings.py**

Debe contener:

* Rutas de data-samples
* Contraseñas para PDF
* Configuración regional de CLP
* Función load_dotenv

Ejemplo a implementar:

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATA_SAMPLES_PATH = os.getenv("DATA_SAMPLES_PATH", "data-samples")
    PDF_PASSWORD_1 = os.getenv("PDF_PASSWORD_1", "0647")
    PDF_PASSWORD_2 = os.getenv("PDF_PASSWORD_2", "198306479")

    THOUSANDS_SEPARATOR = "."
    DECIMAL_SEPARATOR = ","

settings = Settings()
```

Crear `.env.example`:

```
DATA_SAMPLES_PATH=data-samples
PDF_PASSWORD_1=0647
PDF_PASSWORD_2=198306479
```

---

## 2.3. Lectura de archivos (funcional desde el día 1)

Crear servicio:

**backend/app/services/file_loader.py**

Debe:

* Abrir PDFs desde `data-samples/`
* Probar ambas contraseñas automáticamente
* Levantar excepción clara si falla

Ejemplo:

```python
import pdfplumber
from app.config.settings import settings

def load_pdf(filename):
    path = f"{settings.DATA_SAMPLES_PATH}/{filename}"
    for pwd in [settings.PDF_PASSWORD_1, settings.PDF_PASSWORD_2, None]:
        try:
            return pdfplumber.open(path, password=pwd)
        except:
            continue
    raise Exception(f"No se pudo abrir el PDF: {filename}")
```

---

## 2.4. Parsing de CLP (crítico)

Crear archivo:

**backend/app/utils/parsing.py**

Implementar:

```python
from app.config.settings import settings

def parse_clp(value: str) -> int:
    cleaned = value.replace(settings.THOUSANDS_SEPARATOR, "").replace("$", "").strip()
    return int(cleaned)
```

Debe funcionar con:

* `$1.234.567`
* `1.234`
* `123.456.789`
* `    $    234.000`

---

## 2.5. Endpoints iniciales

Crear controladores:

* `/api/parse/pdf`
* `/api/parse/excel`
* `/api/upload`

Todos deben usar las utilidades anteriores.

---

## 2.6. Tests

En:

```
backend/tests/
```

Crear:

* `test_parsing.py`
* `test_pdf_loader.py`
* `test_api_routes.py`

Los tests deben usar **archivos reales** de `data-samples/`.

---

# ⚛️ **3. Frontend (React + Vite)**

### Requisitos:

* Usar yarn, NO npm global.
* Comandos:

```
cd frontend
yarn install
yarn dev
```

* Crear pantalla demo que:

  * muestre tabla de transacciones (dummy data)
  * permita subir archivo PDF/Excel al backend

Crear archivo `.env`:

```
VITE_API_URL=http://localhost:8000
```

---

# 🐳 **4. Docker**

Crear:

## backend/Dockerfile

Debe:

* Copiar backend
* Instalar requirements
* Exponer puerto
* Ejecutar uvicorn

## docker-compose.yml

Debe levantar:

* backend en `http://localhost:8000`
* frontend en `http://localhost:3000`
* volumen para `data-samples`

---

# 🧪 **5. Acceptance Criteria (obligatorio)**

Cursor debe validar:

1. Ejecutar backend con `uvicorn` funciona sin errores.
2. Endpoint `/api/parse/pdf` retorna contenido desde un PDF real.
3. Lectura funciona incluso cuando el PDF tiene contraseña.
4. parse_clp convierte correctamente valores CLP con puntos.
5. El frontend se levanta con `yarn dev` sin errores.
6. docker-compose levanta ambos servicios correctamente.

---

# 🧱 **6. Entregables concretos**

Cursor debe generar:

* La estructura completa
* Todos los archivos mencionados
* Código listo para ejecutar
* Tests funcionando
* Backend + frontend integrados
* Dockerfiles funcionando
* Documentación inicial en README.md

---

# 🚀 **INSTRUCCIÓN FINAL PARA CURSOR**

**Genera TODO el proyecto completo siguiendo este plan punto por punto.
Crea todos los archivos, carpetas, código, tests, Docker config, y documentación necesarios para que el proyecto se ejecute sin cambios adicionales.**