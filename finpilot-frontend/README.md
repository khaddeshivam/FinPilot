# FinPilot — Frontend

React 19 + TypeScript 6 + Vite 8 single-page application.

## Prerequisites

- Node.js 20.19+ or 22.12+

## Development

```bash
npm install
npm run dev        # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8080` (the Spring Boot backend). Start the backend first.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

## Lint

```bash
npm run lint       # oxlint, 0 errors expected
```

## Environment

No frontend `.env` variables are required for local development. The API base URL is `/api/v1`, forwarded to the backend by the Vite proxy.

In a containerised or deployed environment the `nginx.conf` reverse proxy handles the `/api/` forwarding — no `VITE_*` variables are needed.

## Structure

```
src/
  components/
    brand/      FlightPathMark SVG
    finance/    domain-specific display components (charts, transaction rows, etc.)
    layout/     AppLayout, Sidebar, Topbar, MobileNav, QuickAdd, CommandPalette
    ui/         generic design-system components (Button, Surface, Skeleton, etc.)
  features/
    auth/       login, register, auth API
    accounts/   accounts page + API
    transactions/ transactions page + API + TransactionForm
    budgets/    budgets page + API + BudgetForm
    insights/   insights + health score page + API
    ai/         Ask FinPilot page
    reports/    reports page
    settings/   settings + logout
    help/       help page
    dashboard/  dashboard page + API
    marketing/  landing page
  lib/
    apiClient.ts   axios instance with JWT attach + silent refresh interceptor
    format.ts      currency, date, and percent formatters
    categoryMeta.ts  account icon/group helpers
  store/
    authStore.ts   Zustand store (sessionStorage-persisted tokens)
    uiStore.ts     command palette, quick-add, transaction drawer state
```
