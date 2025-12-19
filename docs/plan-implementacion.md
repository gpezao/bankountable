**Proyecto: Gestor Financiero Personal (Frontend-first, automatizado, evolutivo)**

---

## CONTEXTO GENERAL

Estoy construyendo una aplicación personal para mejorar la gestión de mis finanzas.
El problema principal es que **no tengo control real de mis gastos**, uso tarjetas de crédito de forma poco consciente y **no reviso cartolas manualmente**.

El objetivo del sistema es:

* Visibilizar en qué gasto mi dinero
* Detectar patrones de malos hábitos financieros
* Reduccir al mínimo la gestión manual
* Evolucionar desde una app visual → automatizada → inteligente

⚠️ **Este proyecto debe construirse por fases estrictas.**
⚠️ **Al finalizar cada fase o subfase, DEBES detenerte y preguntarme si autorizo continuar.**

---

## PRINCIPIOS OBLIGATORIOS (NO NEGOCIABLES)

### 1. Backend

* Usar **Python + FastAPI**
* Ejecutarse **SIEMPRE** en:

  * virtualenv **o**
  * Docker (preferido)
* ❌ No instalar dependencias globales
* ❌ No modificar versiones del sistema

### 2. Base de Datos

* **MySQL obligatorio**
* Generar:

  * esquema inicial
  * scripts SQL o migraciones
* Credenciales **NO hardcodeadas**

  * Usar `.env` + `.env.example`
* El sistema debe levantar aunque la DB esté vacía

### 3. Frontend

* React + Vite
* Usar **Yarn**
* Fácil de recompilar y probar cambios
* El frontend debe poder funcionar:

  * primero con **datos dummy**
  * luego con backend real

### 4. Filosofía de UX

* El usuario tiene malos hábitos financieros
* No quiere pensar ni categorizar manualmente
* El sistema debe:

  * mostrar patrones
  * hacer visibles los problemas
  * ser empático (no culpabilizante)
* **Automatización > input manual**

---

## ROADMAP DE FASES (ORDEN ESTRICTO)

```
FASE 0 → Infraestructura mínima
FASE 1 → Frontend primero (UX + maqueta + datos dummy)
FASE 2 → Backend real + parsing de cartolas
FASE 3 → Automatización (Gmail / scraping)
FASE 4 → Inteligencia financiera
```

---

# 🧱 FASE 0 — SETUP TÉCNICO BASE

### Objetivo

Tener el sistema levantado técnicamente, sin lógica de negocio.

### Tareas

* Crear monorepo con:

  * `/backend`
  * `/frontend`
* Backend:

  * FastAPI
  * MySQL connection
  * `/health` endpoint
* Frontend:

  * React + Vite
  * pantalla base
* Docker + docker-compose:

  * backend
  * frontend
  * mysql
* README con instrucciones claras

### Criterios de aceptación

* `docker-compose up` levanta todo
* `/health` responde OK
* Frontend visible en navegador

### 🛑 STOP POINT

**Pregunta explícita:**

> “Fase 0 completada. ¿Confirmas que puedo continuar con la Fase 1 (Frontend + UX)?”

---

# 🧱 FASE 1 — FRONTEND PRIMERO (UX + MAQUETA + DATOS DUMMY)

⚠️ **NO DEPENDE DEL BACKEND**
⚠️ **DEBE USAR DATOS DUMMY REALISTAS**

---

## 🎯 Objetivo

Validar **experiencia de usuario y visibilidad financiera** antes de automatizar o parsear datos reales.

El frontend debe permitir que una persona entienda **en menos de 1 minuto**:

* En qué gasta su dinero
* Cuáles son sus gastos recurrentes
* Dónde se le va la plata sin darse cuenta

---

## 📊 DATOS DUMMY (OBLIGATORIOS)

Generar un dataset dummy que represente:

### Estructura mínima

* Fecha
* Descripción / comercio
* Monto en CLP (con puntos como separador de miles)
* Categoría
* Etiquetas
* Medio de pago (crédito / débito)
* Múltiples meses (mínimo 3)

### Patrones que DEBEN existir

* Gastos pequeños recurrentes (cafés, delivery)
* Gastos grandes aislados
* Categorías desbalanceadas
* Uso excesivo de tarjeta de crédito
* Comercios repetidos

---

## 🖥️ Vistas obligatorias

### 1. Dashboard principal

* Total gastado
* Distribución de gastos (gráficos)
* Top categorías
* Top comercios
* Alertas visuales (simuladas)

### 2. Vista de transacciones

* Tabla de gastos
* Filtros
* Categoría editable (UI)

### 3. Etiquetas

* Crear etiquetas
* Asignar etiquetas a gastos

---

## 🎨 Diseño visual

* Minimalista
* Empático
* Fácil de leer
* Colores suaves
* Buen contraste

---

## ✅ Criterios de aceptación — FASE 1

* El frontend corre con `yarn dev`
* Todos los componentes usan datos dummy
* Los datos permiten detectar patrones reales
* No requiere backend activo
* La UX es clara y comprensible rápidamente

---

### 🛑 STOP POINT

**Pregunta obligatoria:**

> “Fase 1 completada con datos dummy.
> ¿Deseas iterar el diseño o avanzo a la Fase 2 (Backend real + parsing)?”

---

# 🧱 FASE 2 — BACKEND REAL + PARSING DE CARTOLAS

---

## 2.1 Base de datos MySQL

Crear tablas:

* transactions
* categories
* tags
* accounts
* imports

---

## 2.2 Parsing REAL (OBLIGATORIO EN EL PRIMER ENTREGABLE)

* Leer archivos desde `data-samples/`
* PDFs protegidos con contraseña:

  * `0647`
  * `198306479`
* CLP con `.` como separador de miles
* Parsing entrenado específicamente con los archivos de ejemplo
* Las contraseñas deben manejarse como variables de entorno

⚠️ **El sistema DEBE parsear correctamente desde el primer entregable de esta fase**

---

## 2.3 API

* `/api/import/pdf`
* `/api/transactions`
* `/api/stats`
* `/api/tags`

Frontend ahora consume backend real.

---

### 🛑 STOP POINT

> “Fase 2 completada. ¿Avanzo a la Fase 3 (Automatización)?”

---

# 🧱 FASE 3 — AUTOMATIZACIÓN

Opciones a implementar progresivamente:

* Gmail API:

  * Lectura automática de correos
  * Descarga de cartolas
* Scraping bancario (opcional):

  * Playwright
* Jobs programados
* Vista de estado en frontend

---

### 🛑 STOP POINT

> “Fase 3 completada. ¿Avanzo a la Fase 4 (Inteligencia financiera)?”

---

# 🧱 FASE 4 — INTELIGENCIA FINANCIERA

* Clasificación automática de gastos
* Proyección de deuda
* Alertas inteligentes
* Recomendaciones accionables

---

## REGLA FINAL

❗ **NO avances de fase sin mi confirmación explícita.**
❗ **Prioriza claridad, UX y automatización por sobre complejidad técnica.**

---

### ✅ Comienza ahora con la **FASE 0**.

---

Si luego quieres, puedo ayudarte a:

* auditar lo que Cursor genere
* iterar UX
* definir métricas de “mejora de hábitos”
* convertir esto en producto serio

Cuando quieras, seguimos.
