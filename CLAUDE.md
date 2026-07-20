# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (HMR)
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test framework is configured in this project.

## Architecture Overview

**NSEnvio** is a multi-tenant shipping/logistics SPA. The companion .NET 10 API lives at `D:\source\repos\react\NSEnvioAPI`. SQL tenant scripts are in `D:\source\repos\react\Tenant_Scripts\`.

### Multi-Tenancy

Tenant resolution flows from subdomain → `sessionStorage` → every API request:
- In production: subdomain extracted from `window.location.hostname` in `TenantContext`
- In development: `VITE_TENANT_CODE` env var overrides subdomain detection
- Every Axios request includes `X-Tenant-Code` header (set in `src/api/apiClient.js`)
- Menu items are gated by service keys from the API: `carrier_transcargo`, `carrier_transcargo_aereo`, `carrier_palco`, `carrier_aereo`, `carrier_cubapack`, `carrier_cubapost`, `factura_inventario`, `factura_servicio`

### Authentication

JWT-based auth in `src/contexts/AuthContext.jsx`:
- Tokens stored in `localStorage`, decoded client-side for role/claim extraction
- Roles parsed from .NET Core JWT format
- `SucursalID` claim gates which HBLs non-admin users can see
- 401 responses trigger auto-logout via Axios response interceptor

### API Layer (`src/api/`)

- `apiClient.js` — single Axios instance; request interceptor attaches JWT + `X-Tenant-Code`; response interceptor handles 401 redirect
- `endpoints.js` — all API endpoint strings as named constants, organized by resource

### State

- **Context API** — `AuthContext` (auth state, JWT claims), `TenantContext` (tenant config, dynamic MUI theme colors)
- **React Query** — server state; default stale time 2 min, single retry, refetch-on-focus disabled
- No Redux or Zustand

### Routing (`src/App.jsx`)

100+ routes defined in one file. Route protection via `<PrivateRoute>` (authenticated) and `<AdminRoute>` (role-checked) wrapper components in `src/components/common/`.

### Forms

React Hook Form + Yup validation throughout. Modal-based forms are common (e.g., `BultoModal`).

### PDF & Barcodes

Shipping labels generated with `@react-pdf/renderer`. Barcode/QR codes use `jsbarcode` and `qrcode` libraries. Label components live in `src/components/reports/`.
