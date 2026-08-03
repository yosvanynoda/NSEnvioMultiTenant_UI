# NSEnvio Project Context

You are working on **NSEnvio**, a multi-tenant shipping/logistics SPA. Use this context to understand the project before starting any task.

## Repositories

| Repo | Path | Purpose |
|------|------|---------|
| React SPA | `D:\source\repos\react\NSEnvio` | Frontend |
| .NET 10 API | `D:\source\repos\react\NSEnvioAPI` | Backend |
| SQL scripts | `D:\source\repos\react\Tenant_Scripts\` | Per-tenant DB migrations |

## Tech Stack

- **Frontend**: React 19, MUI v7, DataGrid v8 (`@mui/x-data-grid`), React Query v5, React Hook Form + Yup, Vite
- **Backend**: .NET 10, Dapper + stored procedures, Newtonsoft.Json (camelCase), multi-tenant via `X-Tenant-Code` header
- **Auth**: JWT in sessionStorage; claims: `AgenciaID`, `SucursalID`, `username`, `roles`

## Critical Gotchas

### DataGrid v8 rowSelectionModel
**Must** be `{ type: 'include', ids: new Set([...]) }` — passing an array causes a blank page crash with no error.

### DataGrid columns must be memoized
Always wrap the `columns` array in `useMemo`. If defined inline in the component body, DataGrid re-processes all rows on every state change causing severe performance degradation.

### Newtonsoft.Json serialization rules
- `HBLID` → `hblid` (all-caps word → all lowercase)
- `TipoEnvioID` → `tipoEnvioID` (mixed → camelCase)
- `PalletID` → `palletID`, `IsActive` → `isActive`
- When reading JSON fields from the API, use lowercase versions of all-caps prefixes.

### Axios error handling — CRITICAL
`apiClient.js` response interceptor transforms ALL errors to `{ status, message }`. Rules:
- **Always** use `err.message` in `onError` and `catch` blocks — never `err.response?.data?.message` (always `undefined`)
- `err.status` gives the HTTP status code (e.g. `err.status === 404`)
- Interceptor also handles ASP.NET Identity array errors: `[{ code, description }]` → joins descriptions with ` | `
- This fix was applied globally across 30+ files (2026-06-03)

### SQL dates
Never spread a full DTO into a Dapper call — `SqlDateTime` overflow will occur on audit fields. Set `CreatedDate`/`LastUpdatedDate` server-side.

### Multi-tenancy
Every Axios request automatically attaches `X-Tenant-Code` (set in `apiClient.js`). SQL migrations must be run on **each tenant DB separately**.

### UI terminology
All user-visible text uses **Franquicia/Franquicias** for what the code calls `sucursal`. Code identifiers (variable names, component names, route paths, API endpoints, DTO fields) still use `sucursal`. Never change code identifiers — only display strings.

## Project Architecture

### Frontend (`src/`)

```
api/
  apiClient.js        # Axios instance — attaches JWT + X-Tenant-Code; 401 → logout; transforms errors to { status, message }
  endpoints.js        # All API URL constants (ENDPOINTS.*)

contexts/
  AuthContext.jsx     # JWT decode → { username, roles, agenciaId, sucursalId, token }; roles filtered for empty strings
  TenantContext.jsx   # Subdomain → tenant config, MUI theme colors

components/
  common/
    PageTitle.jsx     # Title + breadcrumbs + optional `action` prop (for buttons)
    PrivateRoute.jsx  # Auth guard
    AdminRoute.jsx    # Role guard
    dataGridStyles.js # Shared sx for all DataGrids
  hbl/
    BultoModal.jsx    # Add/edit bulto in HBL create — props: editingBultoIndex, existingBultos, sucursalId
  reports/            # @react-pdf/renderer label components

pages/
  hbl/
    HblCreate.jsx     # Generic HBL create — passes editingBultoIndex + existingBultos + sucursalId to BultoModal
  pallet/
    PalletIndex.jsx   # Generic pallet list — prop: hblType
    PalletEditDialog.jsx # Create/edit pallet + assign HBLs — prop: hblType, pallet
  sucursal/
    PrecioEnvio/
      PrecioEnvioIndex.jsx  # List + inline create dialog (TipoEnvio filtered)
      PrecioEnvioForm.jsx   # Edit form
  despachar/
    ContenedorCreate.jsx  # Create + edit container — Fecha/Bultos/Peso/Volumen are readOnly with action.hover bg

App.jsx               # 100+ routes — lazy loaded; ProtectedLayout wraps all pages
```

### Backend (`NSEnvioAPI/`)

```
Controllers/v1/
  HBL/{Type}/          # Transcargo, TranscargoAereo, Palco, CubaPack, CubaPost
  Warehouse/{Type}/    # AereoPallet, TranscargoPallet, PalcoPallet, etc.
  Administration/      # Agencias, Sucursals, TipoEnvio, PrecioEnvio, Producto, ProductoSucursal, etc.
  Transportation/      # Carrier-specific transport endpoints

Data/Repositories/
  Transportation/      # HBL repositories per carrier
  Warehouse/           # Pallet repositories per carrier
  Administration/      # PrecioEnvio, TipoEnvio, Agencia, Producto, ProductoSucursal, etc.

Extensions/
  ServiceExtensions.cs  # All repository DI registrations — add new repos here

Models/DTOs/
  HBL/                 # {Type}HBLListDto, {Type}HBLDetailDto, {Type}HBLCreateDto
  Warehouse/           # PalletDto, PalletHblDto, StorageDto
  Administration/      # ProductoDto, ProductoSucursalDto, SetProductoSucursalRequest, etc.
```

## Carriers (6 total)

| Key | Label | HBL Table | Pallet SP prefix |
|-----|-------|-----------|-----------------|
| `aereo` | Aéreo | `AereoHBLs` | `sp_AereoHBL_` |
| `transcargo` | Transcargo | `TranscargoHBLs` | `sp_TranscargoHBL_` |
| `palco` | Palco | `PalcoHBLs` | `sp_PalcoHBL_` |
| `transcargoaereo` | Transcargo Aéreo | `TranscargoAereoHBLs` | `sp_TranscargoAereoHBL_` |
| `cubapack` | Cubapack | `CubaPackHBLs` | `sp_CubaPackHBL_` |
| `cubapost` | Cubapost | `CubaPostHBLs` | `sp_CubaPostHBL_` |

## Endpoint Maps Pattern

Many pages use a map object keyed by `hblType` to select the right API endpoint:

```js
export const HBL_ENDPOINT_MAP = { aereo: 'api/v1/AereoHBL', transcargo: 'api/v1/TranscargoHBL', ... };
export const HBL_PALLET_MAP   = { aereo: 'api/v1/AereoPallet', ... };
export const HBL_BULK_PALLET_MAP = { aereo: (id) => `api/v1/AereoHBL/bulk-pallet`, ... };
export const HBL_PALLET_HBLS_MAP = { aereo: (id) => `api/v1/AereoPallet/${id}/hbls`, ... };
```

Also: `CONTENEDOR_ENDPOINT_MAP`, `CONTENEDOR_SCAN_MAP`, `CONTENEDOR_HBLS_MAP`, `CONTENEDOR_ASSIGN_MAP`.

## React Query Conventions

- queryKey: `['resourceName', hblType?, id?]`
- staleTime: 2 min (global default)
- Single retry, refetch-on-focus disabled (global default)
- `invalidateQueries({ queryKey: ['resourceName'] })` after mutations

## State Management

- **Server state**: React Query only
- **UI state**: `useState` in component
- **Auth/Tenant**: Context API (`useAuth()`, `useTenant()`)
- No Redux, no Zustand

## Full-Stack Feature Pattern

When adding a new feature across the stack:

1. **SQL**: Write stored procedure in `Tenant_Scripts/` — must run on each tenant DB
2. **DTO**: Add/update in `Models/DTOs/` — match existing naming pattern
3. **Repository**: Add interface + implementation (Dapper + SP); register in `ServiceExtensions.cs`
4. **Controller**: Add endpoint, inject repository
5. **endpoints.js**: Add URL constant or map entry
6. **React page/component**: useQuery + useMutation, follow existing page pattern

## HBL List DTO Fields (all 6 carriers)

All `{Type}HBLListDto` share: `HBLID`, `Numero`, `Envio`, `HblStatus`, `IsActive`, `Observation`, `CreatedDate`, `CreatedBy`, `Fecha`, `PaymentStatus`, `AgenciaID`, `AgenciaColor`, `AgenciaName`, `RemitenteName`, `DestinatarioName`, `TotalPrecio`, `ContenedorID`, `RemitenteLastName`, `RemitenteTelefono`, `DestinatarioLastName`, `DestinatarioSecondName`, `DestinatarioSecondLastName`, `DestinatarioMovil`, `DestinatarioTelefono`, `HBLType`, `IsReadyToCancel`, `TotalValorAduanal`, `BultoDescriptions`, `CategoriasAduanales`, `HasLimiteAlert`, `LimiteAlertDetail`, `PalletID`

## BultoModal — Límite Comercial Logic

- Always show Alert when `selectedProducto.limiteComercial > 0` (info by default)
- Warning when exceeded
- Cross-bulto check: sum all bultos in same envío for same Duradero product (not DuraderoGenerico — limit unknown there)
- Props needed from parent: `editingBultoIndex` (null if adding), `existingBultos` (all bultos in current HBL), `sucursalId` (for product filtering)
- `esPrecioFijo` derived from `resolvedPrecio?.esPrecioFijo ?? selectedProducto?.esPrecioFijo ?? false`

## Pallet System

- `StorageDto`: `storageID`, `warehouseName`, `storageRow`, `storageSection`, `storageBin`, `isActive`
- `PalletDto`: `palletID`, `palletDescription`, `storageID`, `almacen`, `fila`, `seccion`, `bin`, `isActive`, `agenciaID`, `createdBy`, `createdDate`
- `PalletHblDto`: `hblid`, `numero`, `envio`, `remitenteName`, `destinatarioName`
- Bulk assign endpoint: `POST /api/v1/{Type}HBL/bulk-pallet` body: `{ ids: [hblid], palletId: int|null, updatedBy }`
- Passing `palletId: null` clears pallet assignment
- Delete pallet: repository first runs `UPDATE {Type}HBLs SET PalletID = NULL WHERE PalletID = @PalletID` then calls delete SP

## PrecioEnvio

- `GET /api/v1/PrecioEnvio` — filtered by agencia from JWT (non-admin users see own agencia only)
- `POST /api/v1/PrecioEnvio` body: `{ tipoEnvioID, valor, isActive, agenciaID, createdBy, createdDate, lastUpdatedBy, lastUpdatedDate }`
- Create dialog filters TipoEnvio dropdown: all TipoEnvios minus those already in the precio list

## Menu Service Keys

`carrier_transcargo`, `carrier_transcargo_aereo`, `carrier_palco`, `carrier_aereo`, `carrier_cubapack`, `carrier_cubapost`, `factura_inventario`, `factura_servicio`

## ProductoInventory Pricing (updated 2026-05-27)

- `CostPrice` field on `ProductoInventories` table — global cost, not per tipoEnvio
- `ProductoInventoryPrecioEnvios` table — sale price per `(ProductoInventoryID, TipoEnvioID)`, unique constraint
- Endpoint: `PRODUCTO_INVENTORY_PRECIO_ENVIO: 'api/v1/ProductoInventoryPrecioEnvio'`
- `ProductoInventoryForm.jsx` — two-column layout (form 7 / prices 5, `maxWidth: 1100`); prices panel always visible; create mode shows "Guarde primero" placeholder; after POST redirects to `/edit/${newId}` so prices are configurable immediately
- `BultoModal` — `resolveInventoryPrice(inventoryId)` fetches sale price by `tipoEnvioId`; `isbyQuantity=true` forced for all inventory products
- SQL: `Tenant_Scripts/ProductoInventoryPrecioEnvio.sql` — run on each tenant DB

## ProductoInventarioPrecio page (added 2026-05-27)

- Route: `/sucursal/productoinventarioprecio` — `ProtectedLayout` only (no AdminRoute)
- File: `src/pages/sucursal/ProductoInventarioPrecio/ProductoInventarioPrecioIndex.jsx`
- For agencia/sucursal owners: lists all ProductoInventory items, "Configurar" opens dialog with full add/edit/delete price management per TipoEnvio
- Menu: "Precios Inventario" in Franquicia nav group

## Agencia list — SucursalName (added 2026-05-27)

- `AgenciaDto` has `SucursalName?`; `AgenciaIndex.jsx` shows Franquicia column
- Requires `sp_Agencia_GetAll` to LEFT JOIN Sucursals (user runs SQL)

## Sucursal delete — active-only check (added 2026-05-27)

- `SucursalTreeNodeDto` now has `IsActive`
- `SucursalController` delete blocks only on `descendants.Any(d => d.IsActive)` — soft-deleted children do NOT block parent
- `SucursalIndex.jsx` pre-checks in UI using loaded `rawData` before showing confirm dialog

## Menu (updated 2026-05-27)

- Franquicia nav: removed "Cajas Productos" and "Productos Precios Fijos"; added "Precios Inventario"
- TipoEnvio admin: added "Nuevo" button → `/administration/tipoenvio/create`

## Product per-franquicia visibility (added 2026-06-03)

Products are visible to all franquicias by default. Admins can restrict via `ProductoSucursales` join table.

- SQL migration: `Tenant_Scripts/ProductoSucursal.sql` (run on each tenant DB)
- Table: `ProductoSucursales (ProductoID, SucursalID)` — unique pair; empty = unrestricted
- `sp_Producto_GetAll @SucursalID = NULL` — NULL = all (admin), non-null = unrestricted + allowed for that sucursal
- API: `GET /api/v1/ProductoSucursal/byProducto/{id}`, `POST /api/v1/ProductoSucursal/setForProducto`
- `ENDPOINTS.PRODUCTO_SUCURSAL = 'api/v1/ProductoSucursal'`
- `ProductoController.GetAll` accepts `?sucursalId=` query param
- `ProductoForm.jsx`: right column = Franquicias panel (Autocomplete multi-select) + Precios panel stacked in one `md:5` Grid with `flexDirection: column, gap: 3`
- `HblCreate.jsx`: queryKey `['producto-all', user.sucursalId]`; passes `?sucursalId=` when fetching
- `BultoModal.jsx`: `sucursalId` prop; passes it in `loadCajas` product fetch

## Despachar — read-only header fields (added 2026-06-03)

`ContenedorCreate.jsx` (create + edit): Fecha, Bultos Total, Peso Total, Volumen Total are all read-only.
- Visual: `sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'default' } }}`
- Fecha: no `onChange`; auto-set to today on create, loaded from `dispatchDate` on edit

## Login hardening (updated 2026-06-03)

- `AuthContext.jsx`: roles array filtered `.filter(r => r && String(r).trim())` — empty strings removed
- `Login.jsx`: local attempt counter (max 5); warns at 3–4 remaining; 30s cooldown + disabled form after lockout or 429; `err.status === 429` detects rate limit; button shows `Espere Xs` countdown

## Date format — US everywhere (2026-06-04)

All displayed dates use `MM/DD/YYYY`. `toLocaleDateString()` → `toLocaleDateString('en-US')`. `HblIndex` hardcoded to `'MM/DD/YYYY'` (removed locale toggle). Applied across 19 files.

## ServiceInvoice (updated 2026-06-04)

- Delete fixed: body `{ lastUpdatedBy, lastUpdatedDate }` required by `[FromBody] DeleteRequest`
- Print from list: navigates to `/serviceinvoice/${id}/print` (was calling wrong `/print` URL)
- After save (create + edit): navigates to print page; `queryClient.invalidateQueries` called
- List sorted by `invoiceDate` desc

## ProductoInventory — merged form (2026-06-04)

`ProductoInventoryForm.jsx` now has two-column layout: product fields left (md:7), prices panel right (md:5). Create mode shows "Guarde primero". After create redirects to edit. Menu entry "Precios Inventario" removed from nav.

## ProductoInventory — HBL dialog fix (2026-06-04)

- `sp_ProductoInventory_GetForHbl`: changed INNER JOIN to LEFT JOIN on Productos — products without a linked ProductoID now appear in the HBL "Agregar Item" dialog; `p.IsActive` filter moved to JOIN condition
- `HblCreate.jsx`: removed `enabled: Boolean(tipoEnvioId)` guard — products always load regardless of whether a matching TipoEnvio is found; filters by `agenciaId` (unchanged)
- ProductoInventory is scoped by **AgenciaID** on the `ProductoInventories` table (not by sucursal)

## Inventory product search UX — type + Enter pattern (2026-06-04)

**`ProductoInventoryForm.jsx`** (Producto Aduanal Vinculado field):
- Text field → Enter → client-side filter on `productos` array (already loaded, regular Productos)
- Results list → click to select → shows Chip with ✕; `productoSearch` + `productoResults` local state

**`VentaItemModal` in `HblCreate.jsx`** (Agregar Item de Inventario):
- Text field → Enter → calls `GET /api/v1/ProductoInventory/searchProductoInventory/{text}` directly
- Reason: `inventarioProductos` (from `forHbl`) may be empty if products have no linked ProductoID
- `searching` spinner shown during API call; results list → click → fills all form fields via `setValue`
- Price lookup: after selecting, calls `GET /api/v1/ProductoInventoryPrecioEnvio/byInventory/{id}` and matches `tipoEnvioID`; falls back to 0
- `selectedProducto` state `{ id, name, requiereBultoSeparado, incluyeEnvio }` drives Chip + conditional weight field
- `clearProducto()` resets all related form fields + `selectedProducto`
- `productoInventarioId` registered via `<Controller ... render={() => null} />` (hidden)
- **CRITICAL**: `setValue('productoID', full?.productoID ?? p.productoID ?? null)` — must fall back to `p.productoID` from search result, not just `null`; otherwise auto-bulto condition fails

## VentaItemModal — auto-bulto with weight (2026-06-04)

`ventaItemSchema` fields: `bultoWeight` (number, default 0), `incluyeEnvio` (boolean, default false)

When `requiereBultoSeparado = true`:
- Modal shows **"Peso del Bulto (lbs)"** field with live shipping cost preview
- `incluyeEnvio = true` → helper: "envío incluido, sin cargo adicional"
- `incluyeEnvio = false` → helper shows `peso × envioActual` live calculation

`handleSaveVentaItem` auto-bulto logic:
- Condition: `itemData.requiereBultoSeparado && itemData.productoID`
- `bultoWeight = Number(itemData.bultoWeight) || 0`
- `incluyeEnvio = true` → `precioUnitario = 0`, `isbyQuantity = false`
- `incluyeEnvio = false` → `precioUnitario = Number(envioActual)`, `isbyQuantity = false`
- `cantidad = 1`, `peso = bultoWeight`; linked via `_tempId` + `_fromInventario: true`
- `envioActual` passed as prop from parent (`matchedTipoEnvio?.envioActual`)

## Order & Purchase — ProductoInventoryID only in details (2026-06-04)

`ProductoID`/`ProductoName` removed from both `OrderDetailDto` and `PurchaseDetailDto`. Only `ProductoInventoryID`/`ProductoInventoryName` (both `int?`/`string?`).

**Order (`OrderDto.cs`, `OrderRepository.cs`, `HblCreate.jsx`):**
- `OrderDetailDto`: `ProductoInventoryID int?`, `ProductoInventoryName string?` only
- Repository: passes only `@ProductoInventoryID` to `sp_OrderDetail_Upsert`
- `HblCreate.jsx` payload: `{ orderDetailID, quantity, salePrice, productoInventoryID }` — no `productoID`
- `sp_OrderDetail_Upsert`: `@ProductoInventoryID INT = NULL` only (user handles SQL)
- `sp_Order_GetById`: details SELECT via LEFT JOIN on `ProductoInventories` only (user handles SQL)

**Purchase (`PurchaseDto.cs`, `PurchaseRepository.cs`, `PurchaseCreate.jsx`):**
- `PurchaseDetailDto`: `ProductoInventoryID int?`, `ProductoInventoryName string?` only
- Repository: passes only `@ProductoInventoryID` to `sp_PurchaseDetail_Upsert`
- Edit load: reads `it.productoInventoryID` / `it.productoInventoryName` from API
- Save payload: `{ purchaseDetailID, quantity, purchasePrice, productoInventoryID }` — no `productoID`

## Print pages — consistent pattern (2026-06-04)

- `PurchasePrintPage` → `/inventory/purchase/:id/print`
- `OrderPrintPage` → `/inventory/order/:id/print`
- `MasterBLPrintPage` → `/masterbl/:hblType/:id/print` — one component for all 6 carriers via `PDF_ENDPOINT_MAP`
- Purchase/Order create+edit navigate to print page after save
- All 6 MasterBL index files use `navigate()` instead of `openPdfInTab()`
- All print page iframes use `minHeight: '80vh'`

## Bulto shortcut category fix (2026-06-04)

`BultoModal.jsx`: `inferCategoria(producto)` maps product name → correct categoria (`Miscelaneas`, `Medicamentos`, `EquiposMedicos`, `MedicinasAlimentosAseo`, `Duraderos`). Used in `applyShortcut`. Same logic in `HblCreate.handleAddShortcut`. Prevents Misceláneas products being saved as Duraderos.

## Lists — default sort desc (2026-06-04)

All date-bearing lists sort newest first: HBL all 6 (`fecha`), MasterBL all 6 (`fecha`), ContenedorIndex (`dispatchDate`), PurchaseIndex (`purchaseDate`), OrderIndex (`orderDate`), ServiceInvoiceIndex (`invoiceDate`), PalletIndex (`palletNumber`).

## Reports — embedded viewer (2026-06-04)

`ReporteVenta` and `ResumenTranscargo`: two-column layout — filters left (md:4), PDF iframe right (md:8, minHeight 80vh). No modal, no new tab. Filters always visible; change filters and regenerate without leaving the page.

## Pallet label (2026-06-04)

- Report path: `"Storage/PalletLabel.frx"` (capital S) — all 6 carriers confirmed
- FastReport params: `PalletID` (int), `Carrier` (string: aereo/transcargo/palco/cubapack/cubapost/transcargoaereo)
- `BulkPalletDialog`: print button added — Tab 0 shows "Imprimir Etiqueta" when pallet selected; Tab 1 opens print modal after create+assign. Uses `PdfViewerModal` + `PALLET_LABEL_MAP[hblType]`

## Compra fecha read-only (2026-06-04)

`PurchaseCreate.jsx` Fecha: `inputProps={{ readOnly: true }}` + `action.hover` background. Auto-set to today on create, loaded from `purchaseDate` on edit.

## FastReport concurrency fix (2026-07-08)

`NSEnvioAPI\Services\Pdf\FastReportService.cs` is a **Singleton** (`ServiceExtensions.cs:82`) — its `Generate()` is the single code path for every print/PDF endpoint across all 6 carriers (labels, facturas, boletas, resumen, iniciales, numerocajas), MasterBL, pallet labels, inventory/service invoices, general reports (24 files reference `IFastReportService`).
- Fixed: `Generate()` previously called `report.Report.Load(reportPath)` straight off disk — concurrent requests could race on the same `.frx` template (same root cause as a fix applied in a sibling ASP.NET project).
- Now: reads `File.ReadAllBytes(reportPath)` into a `MemoryStream` first, then `report.Report.Load(templateStream)` — each request gets its own independent copy of the template.
- Not needed here: response-cache headers — the React app fetches PDFs via authenticated Axios `blob` requests (`pdfUtils.js`) into client-local `URL.createObjectURL()`, never a proxy-cacheable URL.
- If intermittent wrong-report issues persist under load, next suspect is `Prepare()`/`Export()` needing a lock/`SemaphoreSlim` since the service instance is shared.

## Tomorrow's agenda (2026-06-05)

- Despachar manifiestos
- Security (role-based access control)
- Finish inventory module

## SQL Server → PostgreSQL migration (NSEnvioAPI) — status as of 2026-07-24

Full detail in the `project_postgres_vps_migration` memory. Summary: all 581 stored procedures converted to PL/pgSQL, all `.frx` report embedded SQL converted, C# layer (`DbConnectionFactory`, `TenantResolutionMiddleware`, `AppIdentityDbContext`, plus `TenantAdminController`/`DeliveryWebhookController`/`WebhookApiKeyController`/`AppIdValidationMiddleware`) all on Npgsql. First full local-stack test run happened 2026-07-24 against local Postgres 18 (`NSMasterConfig` + `NSEnvios` databases, `localhost:5432`) — login, HBL creation, label PDFs, service invoice, and inventory purchase all verified working end-to-end. VPS hosting phase not started; remote tenant cutover not started.

**Gotchas found only by actually running the converted app** (SQL compiled fine but broke at runtime):
- PL/pgSQL functions: an unqualified column reference inside the function body that shares a name with a `RETURNS TABLE(...)` column is ambiguous — always alias tables in subqueries (`SELECT ag2.agenciaid FROM agencias ag2 WHERE ...`, not bare `agenciaid`).
- `SUM(integer)` returns `bigint` in Postgres (T-SQL returns `int`) — cast explicitly (`::NUMERIC`) if the function's `RETURNS TABLE` declares a different numeric type.
- Named-parameter function calls (`fn(p_x => @X)`) require an *implicit* cast between the declared param type and the bound value's type — `timestamp→date` is only an assignment cast, so a `DATE`-typed param called with a `DateTime`/`TIMESTAMPTZ` value fails "function does not exist", not a cast error.
- **FastReport `.frx` `CommandParameter DataType` numeric codes are `NpgsqlTypes.NpgsqlDbType` values, not `System.Data.DbType`** — `9`=Integer, `19`=Text, `21`=Timestamp (verified by printing the actual enum). Nearly every report template had these miscoded (using values that happened to be `System.Data.DbType`-shaped), causing `InvalidCastException`s with bizarre target types like `LSeg`/`Money`. This was the single biggest open risk flagged since the earliest migration research and turned out to be a parameter-code bug, not an architecture problem.
- A report's header can render fully blank (while its line-items table renders fine) if the header query's `JOIN` uses a nullable path to get required data — e.g. `ServiceInvoice.frx`/`InventoryInvoice.frx` joined `agencias` via `remitente.agenciaid` (nullable) instead of the invoice's own `agenciaid` (`NOT NULL` with its own FK). Symptom: `INNER JOIN` silently drops the header row whenever that nullable path is null.
- `PurchaseCreate.jsx` was missing a product-picker entirely — pre-existing app bug, not migration-related — see the "Order & Purchase — ProductoInventoryID only in details" section above; it now matches `OrderCreate.jsx`'s pattern with a required `productoInventoryId` select field.

## Public tracking page + Home dedup fixes (2026-07-31)

`Home.jsx` had two overlapping HBL search entry points — an inline `HblTrackingCard` (compact) and a "Buscar HBL" quick-link card to `/hbl/search`. Removed the inline card + its import; kept the quick-link tile (fuller `HblGlobalSearch` with a "Ver Detalle" action).

`PublicTracking.jsx` (`/rastreo`, unauthenticated customer tracking page): fixed two responsive bugs found via the live demo site.
- Desktop: the outer `Box` used `alignItems: 'center'` on a `minHeight: 100vh` flex container — once search results made the card taller than the viewport, centering pushed equal blank space above/below, forcing a scroll through empty space. Changed to `alignItems: 'flex-start'` + responsive `py`.
- The card was capped at `maxWidth: 720` — too narrow for the 8-column results table on desktop, forcing an internal horizontal scrollbar with unused space on either side. Now responsive: `{ xs: 480, sm: 640, md: 1100 }`.
- `HblTrackingCard.jsx` results: added a stacked-card layout for `xs`/`sm` (was an unreadable 8-column table at phone widths); table kept for `md+`.

## ProductoCarrier — per-carrier shortcut restriction (2026-08-01)

Full detail in the `project_producto_carrier` memory. Products with `ShowInShortcut=true` can now be restricted to specific carriers (Transcargo, Aereo, Palco, CubaPack, CubaPost, TranscargoAereo) instead of always showing on every carrier's Add Bulto quick-access list — empty selection (default) still shows on all carriers.

- New Postgres table `productocarriers` (productoid, hbltype), same shape as the existing `productosucursales` per-franquicia pattern.
- `sp_producto_getall` gained a `p_hbltype` param — it does NOT remove the product from results (still fully searchable on every carrier), it only flips the returned `showinshortcut` boolean to `false` when the carrier isn't in the product's allow-list. This meant zero changes were needed to the existing `allProductos.filter(p => p.showInShortcut)` logic in `HblCreate.jsx`/`BultoModal.jsx` — just thread `hblType` into the `Producto` GET query.
- New `ProductoCarrierController` (GET byProducto/{id}, POST setForProducto) mirrors `ProductoSucursalController` exactly.
- `ProductoForm.jsx` got a "Carriers" panel (info-blue header) right after the existing Franquicias panel, same Autocomplete-multiple pattern.
- Built directly against Postgres syntax (the `postgradeSQLMigration` branch's schema) since that's what the live demo site actually runs — not the legacy SQL Server scripts.
- Migration script was handed to the user to run manually against the demo tenant's DB rather than Claude connecting to it directly (see `feedback_user_runs_db_migrations` memory).

## HBL cancel restrictions + Cancelados admin page (2026-08-03)

Full detail in the `project_hbl_cancel_restrictions` memory. `isReadyToCancel` already existed in every carrier's DB/DTO but had zero UI to set it (read-only chip only); `sp_<carrier>hbl_getall` hard-filters `isactive = TRUE` so canceled HBLs were invisible everywhere — both had to be built from scratch, not just gated.

- `HblIndex.jsx` (shared by all 6 carriers): new mark-for-cancel flag-icon toggle in the Acciones column; ready-to-cancel rows show `"ReadyToCancel"` in the Envío column/filter (client-side override in a `displayRows` memo, no backend involved) so admins can filter for them via the existing "Filtrar por Envío" box.
- Container block (`Services/HblCancelPolicy.cs`): once `contenedorid IS NOT NULL`, only Admin/SuperAdmin can cancel or mark ready-to-cancel — enforced both client-side (instant snackbar) and server-side (403 in all 6 controllers), for defense in depth.
- New cross-carrier "Cancelados" admin page (`/hbl/cancelados`, `AdminRoute`, new "Cancelados" nav section) — mirrors the existing `sp_hbl_searchall`/`HblGlobalSearch` cross-carrier pattern (`sp_hbl_getcancelled`, new `HblCancelController`), checkbox multi-select + bulk "Revertir Cancelación" (`sp_hbl_revertcancel`, HBL row's `isactive` only — deliberately doesn't touch the header, since the delete SPs' own header-cascade logic has known pre-existing scoping bugs that make "undo exactly what delete did" unreliable to infer after the fact).
- `GetById` in all 6 HBL controllers: was gated by `ExistsAsync` (isactive-scoped), which 404'd canceled HBLs — would have broken "Ver Detalle" on the new Cancelados page. Loosened to a plain null-check on `GetByIdAsync`; `Update`/`Delete` still correctly reject via their own `ExistsAsync` checks.
- New per-tenant setting `GeneralSettings.RestrictCancelToManager` (Configuración General toggle): when enabled, SuperUser loses direct-cancel and drops to mark-only (same as User) — only Manager/Admin/SuperAdmin can execute a real cancel. `HblIndex.jsx`'s `canCancel` now reads the `generalSetting` query that was already being fetched but previously unused (fixed a pre-existing ESLint `no-unused-vars` error as a side effect).
