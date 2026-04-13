# Áureo — Backend

Plataforma de simulación de inversiones con Monte Carlo, datos de mercado en tiempo real, y análisis con IA.

## Stack

- **Runtime**: Node.js + Express
- **Base de datos / Auth**: Supabase
- **IA**: Anthropic Claude
- **Datos de mercado**: Finnhub
- **Noticias**: NewsAPI
- **Pagos**: Stripe
- **Deploy**: Railway

---

## Setup local

### 1. Clonar y instalar dependencias

```bash
git clone <repo-url>
cd aureo-backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores reales (ver sección de variables más abajo).

### 3. Correr en desarrollo

```bash
npm run dev   # nodemon — recarga automática al guardar
# o
npm start     # node directo
```

El servidor arranca en `http://localhost:3000`.  
El dashboard está en `http://localhost:3000` (o `http://localhost:5500` si usas Live Server en VS Code).

---

## Variables de entorno

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `NODE_ENV` | `development` o `production` | — |
| `PORT` | Puerto del servidor (Railway lo inyecta solo) | — |
| `SUPABASE_URL` | URL del proyecto Supabase | app.supabase.com → Project Settings → API |
| `SUPABASE_ANON_KEY` | Clave pública de Supabase | misma pantalla |
| `SUPABASE_SERVICE_KEY` | Clave de servicio (admin) de Supabase | misma pantalla |
| `ANTHROPIC_API_KEY` | Clave de la API de Claude | console.anthropic.com |
| `FINNHUB_API_KEY` | Clave de Finnhub para datos de mercado | finnhub.io/dashboard |
| `NEWS_API_KEY` | Clave de NewsAPI | newsapi.org |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe | dashboard.stripe.com/apikeys |

---

## Branches y flujo de trabajo

```
dev   →  trabajo diario, pruebas en localhost
main  →  producción, Railway despliega automáticamente
```

**Flujo estándar:**

```bash
# Trabajar en dev
git checkout dev
# ... hacer cambios ...
git add .
git commit -m "feat: descripción del cambio"

# Cuando está listo para producción
git checkout main
git merge dev
git push origin main   # Railway despliega automáticamente
```

---

## Deploy en Railway

1. Crear proyecto en [railway.app](https://railway.app) conectado al repositorio GitHub.
2. Configurar las variables de entorno en **Settings → Variables** (las mismas del `.env.example`, con valores de producción).
3. Railway detecta `"start": "node src/server.js"` en `package.json` automáticamente.
4. Conectar dominio `aureo.cl` en **Settings → Domains**.

### Variables requeridas en Railway

Agregar todas las del `.env.example` con valores de producción:
- `NODE_ENV=production`
- `PORT` — Railway lo inyecta automáticamente, no hace falta configurarlo
- El resto: Supabase, Anthropic, Finnhub, NewsAPI, Stripe (claves `live`)

---

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servidor |
| POST | `/api/user/login` | Login |
| GET | `/api/market/ticker` | Precios en tiempo real |
| GET | `/api/market/historical/:symbol` | Datos históricos (5 años) |
| GET | `/api/market/historical/batch` | Batch de históricos + correlaciones |
| GET | `/api/news` | Noticias financieras |
| POST | `/api/ai/chat` | Chat con Au·IA |
| GET | `/api/portfolio` | Portafolio del usuario |
| POST | `/api/portfolio` | Guardar portafolio |
