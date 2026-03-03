# Microfinance Backend API

Backend del sistema integral de gestión de microcréditos.

## Contenido
- [Resumen](#resumen)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos](#requisitos)
- [Inicio rápido](#inicio-rápido)
- [Scripts](#scripts)
- [Arquitectura](#arquitectura)
- [Seguridad](#seguridad)
- [Redis Cache (Clientes)](#redis-cache-clientes)
- [Integración n8n (WhatsApp)](#integración-n8n-whatsapp)
- [API Routes](#api-routes)
- [Licencia](#licencia)

## Resumen
- API REST con Express y Prisma para gestión de clientes, préstamos, pagos, reportes y cierres.
- Enfoque en seguridad operativa: JWT, RBAC por rutas, rate limiting y bootstrap de admin protegido.
- Diseñado para operar sobre PostgreSQL con soporte opcional de Redis y automatizaciones con n8n.

## Stack tecnológico
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 13+
- **ORM**: Prisma
- **Cache**: Redis
- **Scheduler**: node-cron
- **Integración externa**: n8n (notificaciones WhatsApp)

## Requisitos
- Node.js `>=18`
- npm `>=9`
- PostgreSQL disponible

## Inicio rápido
```bash
# 1) Instalar dependencias
npm install

# 2) Configurar variables de entorno (.env)
# Ajusta credenciales de DB/JWT y variables operativas

# 3) Generar Prisma Client
npm run prisma:generate

# 4) Ejecutar migraciones
npm run prisma:migrate

# 5) Seed inicial
npm run prisma:seed

# 6) Iniciar en desarrollo
npm run dev
```

## Scripts
```bash
npm run dev                    # Desarrollo con nodemon
npm start                      # Ejecución normal
npm run lint                   # Lint
npm run lint:fix               # Lint + auto-fix
npm test                       # Tests (coverage)
npm run test:watch             # Tests en modo watch
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run prisma:generate        # Genera Prisma Client
npm run prisma:migrate         # Migraciones de desarrollo
npm run prisma:migrate:deploy  # Migraciones para deploy
npm run prisma:migrate:status  # Estado de migraciones
npm run prisma:reset           # Reset DB de desarrollo
npm run prisma:studio          # Prisma Studio
npm run prisma:seed            # Seed manual
```

> Nota: actualmente los scripts de testing incluyen `--passWithNoTests`, por lo que pueden finalizar en éxito si no hay suites definidas.

## Arquitectura
```text
Layered Architecture (DDD Lite)
├── Routes (HTTP)
├── Controllers (Request/Response)
├── Services / Use Cases (Business Logic)
├── Repositories (Data Access)
└── Prisma + PostgreSQL (Persistence)
```

## Seguridad

### Variables recomendadas
```env
# JWT
JWT_SECRET=secreto_largo_y_unico
JWT_REFRESH_SECRET=otro_secreto_largo_y_unico
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Bootstrap admin inicial (desactivado por defecto)
ENABLE_BOOTSTRAP_ADMIN=false
BOOTSTRAP_ADMIN_SECRET=secreto_unico_bootstrap
```

### Requisito en producción
- Con `NODE_ENV=production`, el backend **no inicia** si faltan:
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`

### Bootstrap inicial de `SUPER_ADMIN` (una sola vez)
1. Habilitar temporalmente `ENABLE_BOOTSTRAP_ADMIN=true`.
2. Ejecutar `POST /api/auth/register-admin` con header `x-bootstrap-secret`.
3. Verificar creación de usuario `SUPER_ADMIN`.
4. Desactivar `ENABLE_BOOTSTRAP_ADMIN=false`.
5. Reiniciar servicio.

> La ruta está protegida adicionalmente por rate limiter dedicado.

## Redis Cache (Clientes)

Implementación actual de caché con Redis para endpoints `GET` de clientes.

### Activación

```env
REDIS_URL=redis://localhost:6379
```

Levantar Redis local:

```bash
docker compose up -d redis
```

### Comportamiento
- Solo cachea respuestas exitosas (`success: true`) de endpoints `GET` de clientes.
- TTL por defecto en clientes: `120` segundos.
- Se expone header `X-Cache` con valores `HIT` o `MISS`.
- Si Redis no está disponible, el flujo continúa sin caché (no rompe la API).

### Endpoints cacheados
- `GET /api/clients`
- `GET /api/clients/options`
- `GET /api/clients/stats`
- `GET /api/clients/:id`
- `GET /api/clients/:id/scoring/history`

### Invalidación

Se invalida el namespace `clients` después de mutaciones exitosas en:
- `POST /api/clients`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id`
- `POST /api/clients/:id/scoring/recalculate`

## Integración n8n (WhatsApp)

Para envíos automáticos en cierres (`POST /api/admin/test-closing` y `POST /api/admin/run-closing`):

```env
N8N_WEBHOOK_URL=http://host.docker.internal:5678/webhook/whatsapp/send
N8N_WEBHOOK_TOKEN=token_compartido_opcional
N8N_TIMEOUT_MS=10000
```

### Payload enviado
```json
{
  "channel": "whatsapp",
  "phone": "50588881234",
  "message": "Hola ...",
  "sentAt": "2026-02-19T00:00:00.000Z",
  "source": "daily-closing",
  "metadata": {
    "clientId": "uuid",
    "clientName": "Cliente",
    "installmentsCount": 2,
    "totalPenalty": "50.00",
    "moraEnabled": true,
    "notificationMode": "AUTO"
  }
}
```

### Respuesta esperada desde n8n
- Éxito: `200-299` con `{ "success": true }` (o sin campo `success`).
- Error: cualquier otro status o `{ "success": false }`.

Si falla el webhook, el sistema mantiene fallback manual usando `whatsappLink` en `actionItems`.

## API Routes

### Health
| Método | Ruta | Acceso |
|---|---|---|
| GET | `/health` | Público |

<details>
<summary><strong>Auth</strong> (<code>/api/auth</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/login` | Público |
| POST | `/api/auth/refresh-token` | Público |
| POST | `/api/auth/validate-token` | Público |
| POST | `/api/auth/register-admin` | Público controlado (env + secret + rate limit) |
| POST | `/api/auth/register` | `SUPER_ADMIN` |
| PUT | `/api/auth/change-password` | Operativo autenticado |
| GET | `/api/auth/me` | Operativo autenticado |
| POST | `/api/auth/logout` | Operativo autenticado |

</details>

<details>
<summary><strong>Config</strong> (<code>/api/config</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/config` | Operativo autenticado |
| GET | `/api/config/:id` | Operativo autenticado |
| POST | `/api/config` | `ADMIN` / `SUPER_ADMIN` |
| PATCH | `/api/config/:id` | `ADMIN` / `SUPER_ADMIN` |

</details>

<details>
<summary><strong>Admin</strong> (<code>/api/admin</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/admin/run-closing` | `ADMIN` / `SUPER_ADMIN` |
| POST | `/api/admin/test-closing` | `ADMIN` / `SUPER_ADMIN` |
| POST | `/api/admin/monthly-closing` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/admin/closing-history` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/admin/closing/stats` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/admin/closing/compare` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/admin/closing/current` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/admin/closing/trends` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/admin/closing/:month/:year` | `ADMIN` / `SUPER_ADMIN` |

</details>

<details>
<summary><strong>Dashboard</strong> (<code>/api/dashboard</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/dashboard/overview` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/dashboard/summary` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/dashboard/cashflow` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/dashboard/portfolio-distribution` | `ADMIN` / `SUPER_ADMIN` |
| GET | `/api/dashboard/clients-by-category` | `ADMIN` / `SUPER_ADMIN` |

</details>

<details>
<summary><strong>Categories</strong> (<code>/api/categories</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/categories` | Operativo autenticado |
| GET | `/api/categories/stats` | Operativo autenticado |
| POST | `/api/categories` | Operativo autenticado |
| GET | `/api/categories/:id` | Operativo autenticado |
| PATCH | `/api/categories/:id` | Operativo autenticado |
| DELETE | `/api/categories/:id` | Operativo autenticado |

</details>

<details>
<summary><strong>Clients</strong> (<code>/api/clients</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/clients` | Operativo autenticado |
| GET | `/api/clients/options` | Operativo autenticado |
| GET | `/api/clients/stats` | Operativo autenticado |
| POST | `/api/clients` | Operativo autenticado |
| GET | `/api/clients/:id` | Operativo autenticado |
| PATCH | `/api/clients/:id` | Operativo autenticado |
| DELETE | `/api/clients/:id` | Operativo autenticado |
| POST | `/api/clients/:id/scoring/recalculate` | Operativo autenticado |
| GET | `/api/clients/:id/scoring/history` | Operativo autenticado |

</details>

<details>
<summary><strong>Loans</strong> (<code>/api/loans</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/loans` | Operativo autenticado |
| GET | `/api/loans` | Operativo autenticado |
| GET | `/api/loans/options` | Operativo autenticado |
| GET | `/api/loans/stats` | Operativo autenticado |
| GET | `/api/loans/schedules/summary` | Operativo autenticado |
| GET | `/api/loans/pending/stats` | Operativo autenticado |
| GET | `/api/loans/:id` | Operativo autenticado |
| GET | `/api/loans/:id/schedule` | Operativo autenticado |
| PATCH | `/api/loans/:id/approve` | Operativo autenticado |
| PATCH | `/api/loans/:id/reject` | Operativo autenticado |
| PATCH | `/api/loans/:id/disburse` | Operativo autenticado |
| PATCH | `/api/loans/:id/reschedule` | Operativo autenticado |

</details>

<details>
<summary><strong>Pending</strong> (<code>/api/pending</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/pending/stats` | Operativo autenticado |

</details>

<details>
<summary><strong>Payments</strong> (<code>/api/payments</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/payments` | Operativo autenticado |
| GET | `/api/payments/stats` | Operativo autenticado |
| GET | `/api/payments/pending-by-client` | Operativo autenticado |
| POST | `/api/payments` | Operativo autenticado |
| PATCH | `/api/payments/:id/confirm` | Operativo autenticado |
| GET | `/api/payments/loan/:loanId` | Operativo autenticado |
| GET | `/api/payments/:id` | Operativo autenticado |

</details>

<details>
<summary><strong>Reports</strong> (<code>/api/reports</code>)</summary>

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/reports` | Operativo autenticado |
| GET | `/api/reports/cartera/overview` | Operativo autenticado |
| GET | `/api/reports/cartera/loans` | Operativo autenticado |
| GET | `/api/reports/cartera/loan/:loanId/installments` | Operativo autenticado |
| GET | `/api/reports/cartera/loan/:loanId/payments` | Operativo autenticado |
| GET | `/api/reports/cartera` | Operativo autenticado |
| GET | `/api/reports/mora` | Operativo autenticado |
| GET | `/api/reports/mora/overview` | Operativo autenticado |
| GET | `/api/reports/mora/loans` | Operativo autenticado |
| GET | `/api/reports/mora/loan/:loanId/installments` | Operativo autenticado |
| GET | `/api/reports/balance/:month/:year` | Operativo autenticado |
| GET | `/api/reports/cliente/:id` | Operativo autenticado |
| GET | `/api/reports/recibo/:paymentId` | Operativo autenticado |

</details>

## Licencia
MIT