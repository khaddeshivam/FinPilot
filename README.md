# FinPilot

An AI-native personal finance application. Track accounts and transactions, set monthly budgets, and get rule-based insights alongside an optional LLM-powered narrative and RAG question-answering layer — all grounded in your actual ledger data.

---

## Architecture

```
Browser
  ↓ HTTPS
React 19 + Vite 8 (finpilot-frontend/)
  ↓ /api/v1/* (reverse proxy in production; Vite dev proxy locally)
Spring Boot 3.3 / Java 21 REST API (finpilot-backend/)
  ├── identity/    — JWT auth, refresh-token rotation, BCrypt passwords
  ├── finance/     — accounts, transactions, categories, CSV import,
  │                  Naive Bayes ML categoriser
  ├── planning/    — monthly budgets
  ├── dashboard/   — aggregated summary + trend queries
  ├── intelligence/ — rule-based insights, health score,
  │                   OpenAI narrative + RAG (optional)
  └── platform/    — global exception handler
  ↓
PostgreSQL (Flyway migrations V1–V9)
  ↓ (only when OPENAI_API_KEY is set)
OpenAI API (gpt-4o-mini + text-embedding-3-small)
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, TanStack Query, Zustand, Recharts |
| Backend | Java 21, Spring Boot 3.3, Spring Security, JJWT 0.12, OpenCSV |
| Database | PostgreSQL, Flyway migrations |
| AI (optional) | OpenAI gpt-4o-mini, text-embedding-3-small |

---

## Prerequisites

- Java 21+
- Maven 3.9+
- Node.js 20+ and npm
- PostgreSQL 15+

---

## Quick start (local development)

### 1 — Database

```sql
-- run once in psql or pgAdmin
CREATE DATABASE finpilot;
```

### 2 — Backend

```bash
cd finpilot-backend

# Required environment variables (see .env.example for the full list)
export APP_JWT_SECRET="replace-with-a-random-string-of-at-least-32-chars"
export SPRING_DATASOURCE_PASSWORD="your-postgres-password"

# Optional: AI features (narrative + Ask FinPilot)
# export OPENAI_API_KEY="sk-..."

mvn spring-boot:run
# API is available at http://localhost:8080
```

Flyway applies the schema automatically on first startup.

### 3 — Frontend

```bash
cd finpilot-frontend
npm install
npm run dev
# App is available at http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend, so no CORS configuration is needed locally.

---

## Docker Compose (all-in-one)

```bash
cp .env.example .env          # fill in the required values
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

---

## Environment variables

See `.env.example` for the full annotated list.

| Variable | Required | Secret | Description |
|---|---|---|---|
| `APP_JWT_SECRET` | Yes | Yes | JWT signing key — minimum 32 characters |
| `SPRING_DATASOURCE_PASSWORD` | Yes | Yes | PostgreSQL password |
| `SPRING_DATASOURCE_URL` | No | No | Defaults to `jdbc:postgresql://localhost:5432/finpilot` |
| `SPRING_DATASOURCE_USERNAME` | No | No | Defaults to `postgres` |
| `APP_CORS_ALLOWED_ORIGINS` | Production only | No | Comma-separated frontend origins, e.g. `https://yourapp.com` |
| `OPENAI_API_KEY` | No | Yes | Enables AI narrative and Ask FinPilot. App starts and runs without it; those endpoints return 503. |

---

## Available scripts

### Backend
```bash
mvn test          # run unit tests
mvn package       # build a production JAR (target/finpilot-backend-*.jar)
```

### Frontend
```bash
npm run dev       # development server
npm run build     # production build (dist/)
npm run lint      # oxlint
```

---

## CSV import format

The import feature accepts two layouts:

**Layout A — signed amount (3 columns)**
```
Date,Description,Amount
2026-08-15,Swiggy order,-350.00
2026-08-14,Salary credit,85000.00
```

**Layout B — debit/credit columns (4 columns, common in Indian bank exports)**
```
Date,Description,Debit,Credit
15/08/2026,Swiggy order,350.00,
14/08/2026,Salary credit,,85000.00
```

Supported date formats: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`. Re-uploading the same file is safe — duplicate rows are skipped automatically.

---

## Known limitations

- **No rate limiting** on auth endpoints in the application layer — add upstream rate limiting (nginx, Cloudflare) before a public deployment.
- **No PDF import** — CSV only.
- **No recurring transaction detection** — planned.
- **Session storage** — the session survives a page refresh within the same tab but is cleared when the tab is closed. httpOnly cookies are the planned next step.
- **AI cost controls** — no per-user request cap on OpenAI endpoints. Add upstream rate limiting before enabling for many users.

---

## Project structure

```
finpilot-backend/
  src/main/java/com/finpilot/finpilotbackend/
    identity/      auth, users, JWT, refresh tokens
    finance/       accounts, transactions, categories, CSV import, ML classifier
    planning/      budgets
    dashboard/     aggregated dashboard + trend data
    intelligence/  insights, health score, narrative, RAG
    platform/      global exception handler
  src/main/resources/db/migration/   Flyway SQL migrations

finpilot-frontend/
  src/
    components/    shared UI components
    features/      auth, accounts, transactions, budgets, insights, AI, reports, settings
    lib/           API client, formatters
    store/         Zustand auth + UI state
```
