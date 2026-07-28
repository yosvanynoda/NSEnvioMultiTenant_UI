---
name: nsenvio
description: Orient to the NSEnvio multi-tenant shipping/logistics platform (backend + frontend repos) before starting any task on this project.
---

# NSEnvio Project Orientation

Use this skill whenever you're about to work on NSEnvio and need up-to-date bearings on
the codebase, its two repos, and current in-flight work.

## Repos (folder names intentionally differ from GitHub repo names)

| Folder (relative to `D:\source\repos\react`) | GitHub remote | Purpose |
|---|---|---|
| `NSEnvioAPI` | `NSEnvioMultiTenant.git` | Backend — .NET 10 API |
| `NSEnvios` (this repo) | `NSEnvioMultiTenant_UI.git` | Frontend — Vite + React SPA |

Do not rename these folders back to match the remotes — the user set them up this way
on purpose.

## Read these first, in order

1. `.claude/commands/nsenvio.md` (this repo) — the primary, actively-maintained project
   context doc: tech stack, critical gotchas (DataGrid v8, Newtonsoft.Json casing, Axios
   error handling, multi-tenancy, SQL date overflow), full architecture map for both
   frontend and backend, carrier list, and a dated changelog of recent feature work
   (read the bottom entries for the most recent state).
2. `.claude/commands/hosting.md` (this repo) — hosting/infra plan and cost tradeoffs
   (currently: single Vultr server + SQL Server Express + Cloudflare, ~$59/mo for
   4-5 tenants; upgrade triggers documented).
3. `../NSEnvioAPI/.claude/commands/add-entity.md` — the standard recipe for scaffolding a
   new entity end-to-end (DTO → repository → controller → SQL script → DI registration).
   Use this pattern when asked to add a new entity/module to the backend.
4. `../NSEnvioAPI/docs/SSMA_Conversion_Checklist.md` (only exists on the
   `postgradeSQLMigration` branch) — the SQL Server → PostgreSQL migration tracker.

## Current in-flight work (check git state — this changes)

The backend has an active migration branch `postgradeSQLMigration`
(SQL Server → PostgreSQL, Dapper stored-proc calls rewritten as Postgres function calls,
`Microsoft.Data.SqlClient` → `Npgsql`). Per `nsenvio.md`'s changelog (as of 2026-07-24):
all stored procedures and `.frx` report queries were converted, the C# data-access layer
is fully on Npgsql, and a full local-stack smoke test passed against local Postgres.
VPS hosting/remote tenant cutover had not started as of that date.

Before assuming which branch is active or what's done, run `git status` /
`git log -3` in `NSEnvioAPI` rather than trusting this snapshot — this is fast-moving.

## Quick facts worth not re-deriving every time

- Multi-tenancy: DB-per-tenant, resolved via `X-Tenant-Code` header → subdomain fallback;
  master tenant registry lives in a separate `MasterConfigDB`.
- Auth: JWT, roles checked via ASP.NET policies (`AdminOnly`, `UserOnly`, etc.).
- 6 carriers, each with near-duplicate HBL/MasterBL/Contenedor/Pallet modules:
  Transcargo, TranscargoAereo, Palco, Aereo, CubaPack, CubaPost.
- UI-facing term "Franquicia" = code identifier `sucursal` — never rename the code
  identifier, only display strings.
