# CHANGES — Áureo Backend Audit & Reestructuración

## Resumen ejecutivo

Revisión integral del stack completo: backend (Express/Supabase), middleware de autenticación, sistema de planes, frontend dashboard y landing page.

---

## Backend

### `src/middleware/planGate.js` (nuevo)

- **`isPremiumPlan(plan)`** — normaliza planes históricos (`pro`, `elite`, `family`) a `premium`.
- **`loadUserProfile(req, res, next)`** — carga perfil desde Supabase, adjunta `req.userProfile` con `{ plan, role, isAdmin, isPremium, aiUsed, aiResetAt }`. Reset semanal automático para free.
- **`checkAILimit(req, res, next)`** — límites: free 5/semana, premium 100/mes, admin ilimitado. Responde 429 con info de reset.
- **`requirePremium(req, res, next)`** — 403 si no es premium/admin.
- **`incrementAIUsage(userId, currentUsed)`** — incrementa contador en DB.

### `src/middleware/auth.js` (reescrito)

- **Bug fix**: tenía import duplicado de `planGate` que causaba TypeError silencioso. Reescrito limpio.
- `checkAILimit` ahora delega a `planGate.checkAILimit` evitando doble carga de perfil.

### `src/routes/user.js` (reescrito)

- `GET /api/user/me` — devuelve campos de plan/role/quota.
- `GET /api/user/usage` (nuevo) — devuelve `{ plan, role, is_admin, used, limit, remaining, period, features }` para que el frontend gate funcione sin hardcodear lógica de permisos.

### `src/routes/ai.js`

- Reemplazado `req.user.aiCallsUsed + 1` manual por `incrementAIUsage()` del middleware.

### `src/routes/earlyAccess.js` (nuevo)

- `GET /api/early-access/status` — retorna estado de campaña (cupos, activo, fecha fin).
- `POST /api/early-access` — registro con validación de email, deduplicación, límite de slots, y auto-grant de Premium si el usuario ya existe en Supabase.
- `MAX_SLOTS = 100`, `CAMPAIGN_END_DATE` configurable via env var.

### `src/server.js`

- Registra `/api/early-access` router.
- **Nuevo cron `0 6 * * *`** — revierte a `free` los usuarios con `premium_expires_at` vencido.

---

## Base de datos

### `migrations/002_plans_roles_early_access.sql` (nuevo)

```sql
-- Añade columna role (user | admin)
-- Normaliza plan names: starter → free, pro/elite/family → premium
-- Añade ai_queries_used, ai_queries_reset_at, premium_expires_at
-- Crea tabla early_access
-- Setea role='admin' para vice.valder.m@gmail.com
```

**Pendiente**: ejecutar en Supabase SQL Editor.

---

## Frontend — dashboard.html

### Sistema de planes (TAREA 5)

- `S.userPlan`, `S.userRole`, `S.features`, `S.aiLimit`, `S.aiUsed` en estado global.
- `loadUser()` consume `GET /api/user/usage` y llama `initStressGate()`.
- Gates premium sin emojis: clase `.premium-gate` con texto plano.
- AI usage display actualizado para mostrar límite correcto según plan.

### Proyecciones — Subtabs (TAREA 2)

- 3 pestañas: **Proyección** / **Escenarios de Estrés** / **Análisis de Riesgo**.
- `switchProyTab(tab)` maneja activación de paneles con animación fade.
- Charts en tabs inactivos se inicializan al activar la pestaña (evita canvas 0×0).
- Cero emojis; select options en español sin emojis.

### Stress Testing Constructor (TAREA 2 / previo)

- 6 tipos de shock: crash_mercado, recesion, inflacion_alta, subida_tasas, recuperacion_bull, crisis_regional.
- 500 paths GBM con shocks aplicados a la trayectoria.
- Overlay dashed sobre `simChart` principal.
- Guardado local hasta 3 escenarios (shift del más antiguo).
- Premium-gated con `features.stress_constructor`.

### Rediseño de fases (TAREA 4)

- **Eliminado**: slider de horizonte del centro (junto con `#horiz-val` span).
- **Nuevo**: input numérico `#horizYrs` (1–40) con label "= X meses totales".
- Toggle **Aporte Constante** / **Fases Personalizadas**.
  - Constante: un solo input `#const-monthly`, crea una fase automática.
  - Fases: panel existente con counter "Meses asignados: X / Y".
- `S.investMode` en estado; `loadPortfolio` detecta modo al restaurar (1 fase = constante, 2+ = fases).

### Tipografía y contraste (TAREA 3)

- `--font-sans: 'Helvetica Neue', Helvetica, Arial, sans-serif` (removido DM Sans).
- `--text-2: rgba(240,237,230,0.72)` — contraste WCAG AA sobre `#060709`.
- `--text-3: rgba(240,237,230,0.52)` — para labels secundarios.
- JetBrains Mono conservado para valores numéricos.

---

## Frontend — index.html

### Acceso anticipado (TAREA 6)

- Sección `#early-access` con contador live `X / 100 cupos restantes`.
- Barra de progreso animada.
- Formulario email + nombre (nombre opcional).
- Estados: éxito, ya registrado (409), cupos agotados (410), error.
- `loadEarlyAccessStatus()` se ejecuta al cargar la página.

### Limpieza

- Reemplazados emojis (📉 ❓ 🧩) en problem cards por SVG inline (Lucide-style, 1.5px stroke).
- Font: DM Sans → `'Helvetica Neue', Helvetica, Arial, sans-serif`.
- Nav link "Acceso anticipado" añadido en color gold.

---

## Acciones pendientes (usuario)

1. **Supabase**: ejecutar `migrations/002_plans_roles_early_access.sql` en SQL Editor.
2. **Railway**: configurar env var `CAMPAIGN_END_DATE=2026-09-10` (o la fecha deseada).
3. Verificar que el deploy de Railway completó exitosamente.
