# Contexto del problema

El usuario es un software engineer que lleva años con problemas de control de gastos y una rueda de uso/pago de tarjetas de crédito. Quiere una herramienta que, con **mínimo input manual**, automatice la extracción de movimientos (cartolas PDF, emails o notificaciones), clasifique gastos, muestre el estado y proyecciones de deuda, y entregue recomendaciones accionables para salir del ciclo de deuda y aumentar ahorro.

---

# Objetivo del proyecto

Entregar un sistema incremental que centralice movimientos financieros personales, los clasifique en categorías, calcule indicadores de deuda y ahorro, muestre visualizaciones claras y proponga acciones/recomendaciones. El plan está pensado para que un *agente de IA (Cursor)* pueda implementar cada fase de forma autónoma, con entregables bien definidos y criterios de aceptación claros.

---

# Requisitos previos que debe proporcionar el propietario (inputs para Cursor)

1. Repositorio Git (privado) o credenciales para crear uno. Estructura inicial: `backend/`, `frontend/`, `infra/`, `data-samples/`, `docs/`.
2. Muestras de cartolas PDF (3–10 de distintos emisores) en `data-samples/cartolas/` y ejemplos de emails de notificación (exportados .eml) en `data-samples/emails/`.
3. Decisión sobre almacenamiento y hosting (opciones sugeridas en el apartado Infra). Si no hay preferencia, usar Postgres + Vercel/Render/AWS Elastic Beanstalk.
4. Claves/API si se desean agregadores (Plaid/Belvo) o servicios de OCR/IA (OpenAI, AWS Textract). Estas pueden ser añadidas después para fases posteriores.
5. Criterios personales de categorización (ej.: categorías obligatorias: Vivienda, Alimentación, Transporte, Suscripciones, Ocio, Deudas).

---

# Arquitectura propuesta (visión general)

* Ingesta: *PDF parser* + *Email parser* + (opcional) *scraper* o integrador Plaid/Belvo.
* Procesamiento: normalización -> extracción de transacciones -> deduplicación -> categorización (reglas + ML fallback) -> enriquecimiento (merchant matching, tags).
* Almacenamiento: PostgreSQL para esquema relacional; opcional Vector DB (Chroma/Pinecone) para búsqueda semántica de descripciones/merchants.
* Backend: API REST/GraphQL (Node.js/TypeScript - NestJS o Python - FastAPI).
* Frontend: SPA (React/Next.js). Diseño limpio y moderno, gráficos (Recharts o Chart.js), tablas, timeline de deuda.
* Observabilidad: logs + pruebas end-to-end.

---

# Entregables por fase (detallado para Cursor)

## Fase 1 — MVP: Ingesta manual + Dashboard básico

**Objetivo**: Permitir al usuario subir cartolas PDF y obtener transacciones categorizadas y visualizaciones básicas.

**Tareas**:

1. Repo base y esqueleto (backend, frontend, infra). Crear README con pasos de ejecución.
2. Backend: endpoint `/upload/pdf` que reciba PDFs y los guarde en `uploads/`.
3. Parser PDF: implementar pipeline que use `pdfplumber` (o `pypdf`) para extraer tablas y texto. Output: array de transacciones `{date, amount, description, account, raw_line}`.
4. DB schema mínimo: `users`, `accounts`, `transactions`, `categories`, `rules`.
5. Clasificación inicial por reglas: conjunto de reglas regex/keywords que mapeen `description` -> `category`.
6. Frontend: página de upload, lista de transacciones procesadas, panel resumen (total gastos, gastos por categoría, saldo).
7. Tests unitarios básicos para parser y reglas.

**Criterios de aceptación (Fase 1)**:

* El endpoint acepta archivos PDF y responde con JSON de transacciones extraídas.
* Al subir 3 cartolas de muestra, >85% de transacciones deben extraerse (fecha, monto, descripción) y al menos 70% auto-categorizadas correctamente según reglas básicas (usar test samples con etiquetas esperadas).
* Frontend muestra lista de transacciones y un gráfico de torta de gasto por categoría.
* Documentación en README con cómo ejecutar localmente.

**Entregables**:

* Repositorio con código, tests, `data-samples` y README.
* Demo local (instrucciones para correr server + frontend).

---

## Fase 2 — Automatización de ingesta: Email parser y deduplicación

**Objetivo**: Reducir intervención humana permitiendo ingestión por email y aplicar deduplicación.

**Tareas**:

1. Integrar Gmail API o IMAP connector para leer correos de transacciones (configurable por usuario); endpoint `/connect/email` para configurar credenciales OAuth.
2. Implementar email parser con reglas y extracción robusta de monto/fecha/comercio.
3. Mecanismo de deduplicación (hash por `date+amount+normalized_merchant` y fuzzy match para detectar duplicados entre PDF y email).
4. UI: página de conexiones (email), log de importaciones y resoluciones de duplicados con posibilidad de marcar manualmente.
5. Tests e2e simulando correos.

**Criterios de aceptación (Fase 2)**:

* El conector email puede autenticar y extraer correos de ejemplo y convertirlos en transacciones.
* Al procesar inputs mixtos (PDF + emails) la tasa de duplicados detectados y fusionados debe ser >= 95% en dataset de pruebas controladas.
* Usuario puede configurar y desconectar su cuenta de email desde UI.

**Entregables**:

* Código de conector, tests, upgrades en DB y UI.

---

## Fase 3 — Automatización avanzada: Scraper / Integrador bancario opcional

**Objetivo**: Permitir descarga automática de cartolas vía scraping (Playwright) o integración con Plaid/Belvo si se dispone.

**Tareas**:

1. Implementar módulo de scraping (Playwright) con adaptadores por banco (iniciar con 1 banco de prueba). Debe soportar 2FA manual (push/pin) y reintentos.
2. Alternativa: integrar Plaid/Belvo como provider (configurable). Implementar adaptador para normalizar transacciones a nuestro modelo.
3. Scheduler (worker/cron) para ejecutar ingestas y notificar al usuario sobre nuevos movimientos.
4. Tests de integración y validación de seguridad en manejo de credenciales (encriptación en DB).

**Criterios de aceptación (Fase 3)**:

* Scraper o integrador puede autenticarse y descargar cartolas de la cuenta de prueba (reproducible en ambiente controlado).
* Los secretos/credenciales quedan cifrados en DB (usando KMS o encriptación a nivel de app).
* Logs claros de actividad y fallos.

**Entregables**:

* Adaptador por banco (o integración con agregador), scheduler y documentación de configuración.

---

## Fase 4 — Clasificación inteligente y motor de recomendaciones

**Objetivo**: Subir la precisión de categorización y añadir proyecciones y recomendaciones para gestión de deuda.

**Tareas**:

1. Implementar modelo de clasificación híbrido: reglas → fallback ML. Opciones:

   * Fine-tuned classifier (small) sobre descriptions.
   * Embeddings + nearest-neighbor + metadata.
2. Crear pipeline de entrenamiento offline usando `data-samples/labeled/`.
3. Implementar motor de proyecciones de deuda que calcule: saldo total, pagos mínimos, intereses anticipados, y fechas estimadas de salida usando estrategias `snowball` y `avalanche`.
4. UI: sección "Finanzas" con timeline de deuda, simulador (ajusta pagos vs tiempo) y recomendaciones accionables (p. ej. pagar tarjeta A primero).
5. A/B testing y validación manual de categorías.

**Criterios de aceptación (Fase 4)**:

* Clasificador ML alcanza precisión >=85% en dataset de validación (si no es posible, documentar limitantes y umbrales alcanzados).
* Motor de proyección muestra escenarios comparables (mínimo 2 estrategias) y calcula impacto en intereses y plazo.
* UI permite ejecutar simulaciones y ver diferencias entre estrategias.

**Entregables**:

* Modelos entrenados, endpoints de inferencia, frontend con simulador.

---

## Fase 5 — UX refinado, notificaciones y mobile-friendly

**Objetivo**: Mejorar usabilidad, añadir notificaciones y optimizar experiencia móvil.

**Tareas**:

1. Diseño UI/UX final: paleta (sugerencia abajo), tipografía, microinteracciones, accesibilidad.
2. Implementar notificaciones (email + push Web / móvil) para alertas críticas: sobre-gasto, pago mínimo próximo, nueva deuda.
3. Mobile responsiveness y pruebas cross-browser.
4. Documentar flows de onboarding y privacidad.

**Criterios de aceptación (Fase 5)**:

* Tests de usabilidad con 3 usuarios muestran que pueden entender dashboard en < 2 minutos (documentar resultados).
* Notificaciones llegan y se pueden configurar por el usuario.
* UI cumple WCAG básico (contraste, tamaño de botones, navegabilidad con teclado).

**Entregables**:

* Sistema de notificaciones, diseño final, guía de estilo, pruebas de usabilidad.

---

# Especificaciones técnicas concretas (APIs, DB, formatos)

## Esquema de la tabla `transactions` (Postgres)

```
id: UUID PK
user_id: UUID FK -> users
account_id: UUID FK -> accounts
date: DATE
amount_cents: INT
currency: VARCHAR
description: TEXT
normalized_merchant: TEXT
category_id: UUID FK -> categories
tags: JSONB
source: ENUM('pdf','email','scraper','api')
raw: JSONB
created_at, updated_at
```

## Endpoint mínimo (REST)

* `POST /api/upload/pdf` -> recibe multipart/form-data -> devuelve lista de transacciones extraídas
* `POST /api/connect/email` -> inicia oauth o guarda credenciales
* `GET /api/transactions?from=&to=&category=` -> paginación
* `POST /api/categorize/retrain` -> dispara reentrenamiento con dataset etiquetado
* `GET /api/forecast/debt?strategy=snowball|avalanche` -> devuelve proyección

## Formato de salida de extracción

```json
[
  {"date":"2025-11-01","amount_cents":-45000,"currency":"CLP","description":"Pago supermercado XYZ","account":"Tarjeta Banco A","raw_line":"..."}
]
```

---

# Reglas básicas de categorización (ejemplos que Cursor debe codificar)

* `/sodimac|homecenter|ferreteria/i` -> `Hogar y mejoras`
* `/walmart|tottus|lider|supermercado/i` -> `Alimentación`
* `/spotify|netflix|disney|apple.com/i` -> `Suscripciones`
* `/falabella|ripley|paris/i` -> `Compras`

Se debe proveer una UI para editar/crear reglas por usuario.

---

# Motor de proyección de deuda: lógica simplificada que debe implementarse

1. Tomar el snapshot de deuda por tarjeta: `balance`, `interest_rate_monthly`, `minimum_payment`.
2. Para cada estrategia:

   * Simular mes a mes aplicando `payment` hasta que saldo = 0.
   * Calcular `interest_paid_total`, `months_to_payoff`.
3. Entregar tablas y gráfico comparativo.

Parámetros ajustables: `extra_payment_per_month`, `priority_order`.

---

# Diseño visual — directrices para el UI/UX (para que Cursor implemente)

* Estilo: minimal, tarjetas con sombras suaves, tipografía sans-serif legible (Inter). Bordes 12px, spacing generoso.
* Paleta sugerida: fondo #F7FAFC (very light), primario #0F6FFF (azul), secundario #00B37E (verde), acento #FFB020 (amarillo), neutrales en grises.
* Dashboard principal: hero con saldo neto, tarjeta de deuda total, gráfico de barras: gasto por categoría (últimos 3 meses), gráfico de línea: flujo de caja mensual, lista de transacciones con filtros.
* Importante: estados vacíos amigables (onboarding con pasos: conectar email/subir cartola).
* Microcopy directo y empático: "Te quedan $X para tu objetivo", "Recomendación: paga tarjeta X para reducir intereses"

---

# Seguridad y privacidad (requerido)

* Encriptar credenciales sensibles en DB. Usar KMS/secret manager.
* TLS para todo el tráfico.
* Logs no deben incluir PII completo (mascarar últimos 4 dígitos de tarjetas).
* Políticas de retención: por defecto 3 años, configurable.
* Consentimiento claro en onboarding para almacenar y procesar datos financieros.

---

# Testing & QA

* Unit tests para parser, reglas y calculadora de deuda.
* Integration tests para endpoints de ingest.
* E2E tests UI flows (upload, connect email, simulate payoff).
* Dataset de pruebas en `data-samples/` con etiquetas esperadas.

---

# Infra & Deployment (opciones y recomendaciones)

* Infra mínima: Postgres gestionado, storage para uploads (S3), backend con container (Docker) detrás de balancer y CDN para frontend.
* CI: GitHub Actions para tests + deploy a staging.
* Secrets: Vault / AWS Secrets Manager / GitHub Encrypted Secrets.

---

# Telemetría y observabilidad

* Integrar logging estructurado (console + file + external si disponible).
* Metrics: número de transacciones procesadas / hora, tasa de error de parsing, latencia de endpoints.

---

# Checklist final para que Cursor ejecute cada fase sin intervención humana adicional

1. Crear repo con estructura y sample data.
2. Implementar endpoints y parsers según Fase 1 y pruebas asociadas.
3. Subir artefactos en `data-samples/expected/` para validar criterios de aceptación.
4. Documentar cómo inyectar credenciales para email/scraper y cómo configurar provider de OCR/IA.
5. Entregar UI funcional y un script `seed-demo-data.sh` que permita al revisor ver la app con datos reales de ejemplo.

---

# Notas finales para Cursor (instrucciones operativas)

* Priorizar privacidad y facilidad de uso. Evitar pedir acciones manuales frecuentes al usuario.
* Garantizar trazabilidad: cada transacción importada debe poder rastrearse a su fuente original (PDF line / email id).
* Mantener modularidad: diseñar adaptadores para fuentes nuevas (banco X, proveedor Y) sin tocar core.
* Entregar documentación técnica clara y demo funcional en cada fase.

---

*Fin del documento.*
