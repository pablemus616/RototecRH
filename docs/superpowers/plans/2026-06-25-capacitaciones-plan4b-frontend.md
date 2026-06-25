# Plan 4b — Frontend Capacitaciones: Asignar / Asignados / Recapacitar / Diploma (RototecRH)

**For agentic workers.** This plan is written so an agent can execute it task-by-task with no further design decisions. Every task is bite-sized, ends in one commit, and has a concrete verification gate (`npm run typecheck`, plus `npm run build` where noted). UI is specified by behavior + the patterns to imitate (as in Plan 3); ship complete code only for the data/api/lib pieces and the diploma helper. This plan **EXTENDS** Plan 3 (already merged to `main`). Read the Interfaces block of each task before writing code.

---

## Goal

Turn the Capacitaciones module's employee area into two purpose-built sub-views and add recapacitación + diploma generation. Concretely:

1. Tabs become **Pensums · Asignar · Asignados**. The old placeholder **Reasignación** tab is **removed**.
2. **Asignar**: a table of *eligible* employees (active + their puesto has a pensum + no primary assignment). Multi-select → "Asignar" (primary, batch) + optional secondary assignment.
3. **Asignados (seguimiento)**: a table of employees *with* an assignment, showing progress/license. Row → detail `Sheet` with read-only grades/attempts/license and the actions:
   - **Repetir capacitación entera** (reabrir all modules of the header)
   - **Repetir módulos individuales** (select detalles → reabrir subset)
   - **Asignar secundaria** (already exists in Plan 3)
   - **Generar examen** (already exists in Plan 3)
   - **Generar diploma** (DOCX, client-side, enabled only when ALL modules of the employee are `Aprobado`)
4. **Diploma**: copy the legacy template into `public/templates/diploma_operario.docx`, add `docxtemplater`/`pizzip`/`file-saver` deps, generate the DOCX in the browser with the legacy placeholders.

**Out of scope:** backend changes (Plan 4a); touching the legacy Intranet repo (its module shutdown is a documented checklist at the end of this plan).

## Architecture

- React 18 + Vite 5 + TypeScript **strict** (`noUnusedLocals`, `noUnusedParameters`).
- Tailwind v3 + shadcn/ui hand-written in `src/components/ui/` (no CLI).
- TanStack Query v5 + TanStack Table v8, React Hook Form + Zod, React Router v6 (`createBrowserRouter`).
- **API layer (mock↔real parity):** each `src/api/<recurso>.ts` exports `<recurso>Api = USE_MOCK ? mockApi : realApi`; `realApi: typeof mockApi` so the compiler enforces identical method names/signatures. `realApi` hits `rrhhApi` (axios, baseURL `${BASE_URL}/rrhh`, Bearer interceptor, `{ok,message,data}` unwrap). Mock persists to `localStorage` under `rototec.cap.*`. Canonical reference: `src/api/turnos.ts` + `src/hooks/useTurnos.ts`.
- Backend (Plan 4a, branch off `main` of Microservicios) exposes `/rrhh/capacitaciones/...`; since `rrhhApi` prepends `/rrhh`, frontend paths start at `/capacitaciones/...`.
- **No test runner in this repo.** Gate = `npm run typecheck` after every task; `npm run build` after the diploma task (asset + deps).

## Tech Stack

React 18 · Vite 5 · TS strict · Tailwind v3 · shadcn/ui · TanStack Query v5 / Table v8 · RHF + Zod · axios · sonner · lucide-react · date-fns · **NEW:** docxtemplater, pizzip, file-saver, @types/file-saver.

## Global Constraints

- `realApi` MUST mirror `mockApi` method-for-method (typed `realApi: typeof mockApi`). New methods go in BOTH.
- Mutations invalidate the matching `QK`; mirror Plan 3 / `useTurnos` (`setQueryData` where a single entity is returned, else `invalidateQueries`).
- shadcn components only from `src/components/ui/`; add a new one only by copying the official registry (no CLI). The required primitives (`Table`, `Sheet`, `Dialog`, `Checkbox`, `Badge`, `Button`, `Tabs`, `Input`, `Select`) already exist from earlier phases — verify before adding.
- Money/date helpers: `formatDate(iso)` → `dd/mm/yyyy`. Spanish month names for the diploma come from a local `meses[]` array (or `date-fns` `format(d,'LLLL',{locale: es})`).
- Each task = one commit. Gate: `npm run typecheck` green (and `npm run build` for TASK 5) before commit.

## File Structure (frontend, relevant subtree)

```
RototecRH/
├── public/templates/diploma_operario.docx        (TASK 5 — copied asset)
├── package.json                                   (TASK 5 — +3 deps)
└── src/
    ├── api/capacitaciones.ts                      (TASK 1 — +listarElegibles, +reabrir, richer mock)
    ├── hooks/useCapacitaciones.ts                 (TASK 1 — +QK.elegibles, +useElegibles, +useReabrir)
    ├── types/index.ts                             (TASK 1 — +EmpleadoElegible, +ReabrirInput)
    ├── lib/
    │   ├── validators.ts                          (TASK 3/4 — +schemas if needed)
    │   └── diploma.ts                             (TASK 5 — NEW client-side DOCX generator)
    ├── router.tsx                                 (TASK 2 — no /reasignacion route change needed; tabs are in-page)
    └── pages/capacitaciones/
        ├── CapacitacionesPage.tsx                 (TASK 2 — tabs Pensums·Asignar·Asignados)
        ├── PensumsTab.tsx                         (unchanged)
        ├── EmpleadosTab.tsx                       (TASK 4 — repurpose → AsignadosTab, or rename)
        ├── AsignarTab.tsx                         (TASK 3 — NEW)
        ├── AsignadosTab.tsx                       (TASK 4 — NEW, or EmpleadosTab repurposed)
        ├── EmpleadoCapDetailSheet.tsx             (TASK 4/5 — +recapacitar +diploma actions)
        └── ReasignacionTab.tsx                    (TASK 2 — DELETED)
```

---

## Backend contract added by Plan 4a (consume these)

All under `rrhhApi` (prefix `/capacitaciones`):
- `GET /capacitaciones/empleados/elegibles?puesto=&departamento=` → `[{ empleadoId, nombre, idPuesto, idPensum }]`
- `POST /capacitaciones/asignaciones/:id/reabrir` body `{ idModulos?: number[] }` → `{ asignacionId, reseteados, licenciaActiva, venceLicencia }`
- (already in Plan 3) `GET /capacitaciones/empleados` (Asignados list — Plan 4a restricts it to employees WITH an assignment), `GET /capacitaciones/empleados/:id` (detalle), `POST /capacitaciones/asignaciones` (primaria batch `{empleadoIds}`), `POST /capacitaciones/asignaciones/secundaria` `{empleadoId,idPensum}`, `POST /capacitaciones/examenes`.

---

## TASK 1 — Types + API (mock↔real parity) + hooks for elegibles & reabrir; enrich mock

### Interfaces

```ts
// src/types/index.ts — NEW
export interface EmpleadoElegible {
  empleadoId: number;
  nombre: string;
  idPuesto: number;
  idPensum: number;
}
export interface ReabrirInput { idModulos?: number[]; }            // omitted = all
export interface ReabrirResult {
  asignacionId: number; reseteados: number;
  licenciaActiva: boolean; venceLicencia: string | null;
}

// src/api/capacitaciones.ts — NEW methods (added to BOTH mockApi and realApi)
listElegibles(filtros?: { puesto?: number; departamento?: number }): Promise<EmpleadoElegible[]>
reabrir(idAsignacion: number, input?: ReabrirInput): Promise<ReabrirResult>

// realApi mapping
// listElegibles → api.get('/capacitaciones/empleados/elegibles', { params: filtros }).then(unwrap)
// reabrir       → api.post(`/capacitaciones/asignaciones/${idAsignacion}/reabrir`, input ?? {}).then(unwrap)

// src/hooks/useCapacitaciones.ts — NEW
QK.elegibles = (f?) => ['cap','elegibles', f ?? {}]
useElegibles(filtros?) // useQuery
useReabrir(empleadoId: number) // mutation → on success invalidate QK.empleado(empleadoId) + QK.empleados() + QK.elegibles()
```

### Mock enrichment (so assign/grades/reabrir/diploma work end-to-end)

The current mock `getEmpleado` returns empty `asignaciones`. Make the mock a real little engine over `localStorage` so the whole flow is exercisable with `VITE_USE_MOCK=true`:

- **Seed** (extend `seedIfEmpty`): a few employees in `rototec.cap.empleados.v1` carrying `{ empleadoId, nombre, idPuesto, idDepartamento, estaActivo }`; at least one whose `idPuesto` matches the seeded pensum's `idPuesto` and who is **unassigned** (appears in `listElegibles`), and one **assigned** with module detalles in mixed states (`Aprobado`/`Pendiente`) so progress and the license badge render; optionally one fully-`Aprobado` to exercise the diploma button.
- **`listElegibles`**: compute from the seed exactly like the backend (active + puesto∈pensums + no primary assignment).
- **`asignarPrimaria(empleadoIds)`** / **`asignarSecundaria(empleadoId,idPensum)`**: create header(s) + detalles (one per módulo of the resolved/explicit pensum, `estado:'Pendiente', puntuacion:null, intentos:0`) in a `rototec.cap.asignaciones.v1` store; after primaria the employee leaves `listElegibles` and enters `listEmpleados`.
- **`listEmpleados(filtros)`**: return only employees with ≥1 assignment, with `modulosTotal/modulosAprobados/licenciaActiva` derived from their detalles (license active ⟺ all detalles `Aprobado`).
- **`getEmpleado(empleadoId)`**: return real `asignaciones` with `detalles`.
- **`reabrir(idAsignacion, input)`**: set the chosen (or all) detalles of that header to `estado:'Pendiente', puntuacion:null, intentos:0`; recompute the header license (off unless all `Aprobado`); return `ReabrirResult`. Keep any intentos-history store untouched (mock need not persist intento history, but must not regress estado of other detalles).

Keep all stores under the existing `rototec.cap.*` key convention; add `rototec.cap.asignaciones.v1` if not already present.

### Gate
`npm run typecheck` green (note: `realApi: typeof mockApi` will fail to compile if a method is missing on either side — that is the parity guard) · commit.

---

## TASK 2 — Tabs become Pensums · Asignar · Asignados; remove Reasignación

### Interfaces
`CapacitacionesPage.tsx`: shadcn `Tabs` with values `pensums` (default) → `<PensumsTab/>`, `asignar` → `<AsignarTab/>`, `asignados` → `<AsignadosTab/>`.

### Implementation
- Replace the `empleados` + `reasignacion` tab triggers/contents with `asignar` + `asignados`.
- **Delete** `src/pages/capacitaciones/ReasignacionTab.tsx` and remove its import.
- The tabs are in-page (Plan 3 keeps a single `/capacitaciones` route); no `router.tsx` change is required. Verify there is no separate `/capacitaciones/reasignacion` route to remove — if one exists, delete it.
- `AsignarTab`/`AsignadosTab` may be created as thin stubs in this commit (filled in TASK 3/4) so the page compiles, OR sequence TASK 3/4 first; either way keep `typecheck` green per commit.

### Gate
`npm run typecheck` green · commit.

---

## TASK 3 — AsignarTab (eligible employees, batch primary + optional secondary)

### Behavior (imitate `EmpleadosTab` filter row + TanStack Table from Plan 3)
- Filter row: puesto (number input) + departamento (number input) — feed `useElegibles({puesto,departamento})`. Loading → `Skeleton` rows; empty → centered "No hay empleados elegibles".
- Table columns: a header+row **Checkbox** (multi-select; track selected `empleadoId`s in component state), `nombre`, `idPuesto`, the resolved pensum (`idPensum`). Use the shadcn `Checkbox` already in `ui/`.
- **Asignar (primaria, batch)** button: enabled when ≥1 selected → `useAsignarPrimaria().mutate(selectedIds)` → on success toast "Asignación creada", clear selection (the mutation invalidates `QK.elegibles()` + `QK.empleados()`, so the rows disappear and appear under Asignados).
- **Asignar secundaria (opcional)**: a small dialog (reuse `asignacionSecundariaSchema` + `useAsignarSecundaria`) where a single employee + an explicit pensum (`usePensums` for options) are chosen. This mirrors the existing `SecundariaSection` of the detail sheet; lifting it here is acceptable but keep the detail-sheet secondary action too (Asignados detail). Prefer: in AsignarTab the primary batch is the main action; secondary stays a per-row/secondary affordance.

Reuse `useAsignarPrimaria` (Plan 3 hook over `asignarPrimaria`). No new validators needed beyond the existing `asignacionSecundariaSchema`.

### Gate
`npm run typecheck` green · commit.

---

## TASK 4 — AsignadosTab + detail Sheet with recapacitar actions

### AsignadosTab (repurpose Plan 3 `EmpleadosTab`)
- Source: `useEmpleadosCap(filtros)` → `listEmpleados` (Plan 4a: only assigned employees). Same filter row + columns as today (nombre, estado badge, progreso `modulosAprobados/modulosTotal`, licencia badge). Row click opens `EmpleadoCapDetailSheet`.
- Rename `EmpleadosTab` → `AsignadosTab` (file + default export) OR create `AsignadosTab.tsx` that renders the same content and delete `EmpleadosTab.tsx`. Keep imports consistent in `CapacitacionesPage`.

### EmpleadoCapDetailSheet — add recapacitar actions
The sheet already shows `AsignacionCard` → `DetalleRow` (read-only puntuación/estado/intentos) plus "Generar examen" per detalle and the secondary-assignment section. Add, per `AsignacionCard` (i.e. per header):
- **Repetir capacitación entera**: button → confirm → `useReabrir(empleadoId).mutate({})` (no `idModulos` = all). Toast "Capacitación reabierta". Invalidation refreshes the sheet (all detalles back to `Pendiente`, license off).
- **Repetir módulos individuales**: a checkbox per `DetalleRow` to select detalle `id`s, plus a "Repetir seleccionados" button → `useReabrir(empleadoId).mutate({ idModulos: selectedDetalleIds })`. Disable the button when nothing selected.

Keep "Asignar secundaria" (`SecundariaSection`) and "Generar examen" (`DetalleRow` action) as-is.

The `useReabrir(empleadoId)` mutation invalidates `QK.empleado(empleadoId)`, `QK.empleados()`, `QK.elegibles()`.

### Validators
Optionally add a tiny `reabrirSchema` (z.object with optional `idModulos: z.array(z.number()).optional()`), but since selection is plain component state a schema is not required — skip unless a form is introduced.

### Gate
`npm run typecheck` green · commit.

---

## TASK 5 — Diploma (template asset + deps + client-side DOCX generation)

### Asset + deps
1. Copy `/home/plemus/WebstormProjects/Intranet/public/templates/diploma_operario.docx` → `/home/plemus/WebstormProjects/RototecRH/public/templates/diploma_operario.docx` (create the `public/templates/` dir). This is a binary copy (use `cp`); do not regenerate.
2. Add to `package.json` dependencies: `docxtemplater ^3.67.4`, `pizzip ^3.2.0`, `file-saver ^2.0.5`, and devDependency `@types/file-saver ^2.0.7`. Run `npm install` (this is a step; it must succeed offline against the existing lockfile/registry — if the registry is unreachable, document and stop at the deps edit).

### `src/lib/diploma.ts` — complete code

```ts
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export interface DiplomaDatos {
  nombreCorto: string;     // "Primer Apellido, Primer Nombre" o "Primer Nombre Primer Apellido"
  nombreCompleto: string;  // nombre completo del empleado
  codigoEmpleado: string;  // ID_FH / código
  puesto: string;          // nombre del puesto
  fecha?: Date;            // por defecto: hoy
}

export async function generarDiplomaDocx(d: DiplomaDatos): Promise<void> {
  const fecha = d.fecha ?? new Date();
  const dia = String(fecha.getDate());
  const mes = MESES[fecha.getMonth()];
  const anio = String(fecha.getFullYear());

  const response = await fetch('/templates/diploma_operario.docx');
  if (!response.ok) throw new Error('No se pudo cargar la plantilla del diploma');
  const arrayBuffer = await response.arrayBuffer();

  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render({
    NOMBRE_EMPLEADO: d.nombreCorto,
    NOMBRE_COMPLETO: d.nombreCompleto,
    CODIGO_EMPLEADO: d.codigoEmpleado,
    PUESTO: d.puesto,
    DIA: dia,
    MES: mes,
    ANIO: anio,
    FECHA_COMPLETA: `${dia} de ${mes} de ${anio}`,
  });

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  saveAs(
    blob,
    `Diploma_${d.nombreCorto.replace(/\s+/g, '_')}_${d.codigoEmpleado || 'SC'}.docx`,
  );
}
```

(Placeholders match the legacy `diploma_operario.docx`: `NOMBRE_EMPLEADO, NOMBRE_COMPLETO, CODIGO_EMPLEADO, PUESTO, DIA, MES, ANIO, FECHA_COMPLETA`.)

### Wire the button in `EmpleadoCapDetailSheet`
- Add a **"Generar diploma"** button (one per employee, in the sheet header area) that is **enabled only when every detalle across all of the employee's asignaciones has `estado === 'Aprobado'`** (and at least one detalle exists). Otherwise disabled with a tooltip/hint "Todos los módulos deben estar aprobados".
- On click call `generarDiplomaDocx(...)`. Source the data from the employee record. **Note:** `EmpleadoCapResumen`/`EmpleadoCapDetalle` carry `empleadoId`, `nombre`, `idPuesto` but NOT the código (`ID_FH`) nor the puesto *name*. Resolve those:
  - `nombreCompleto`/`nombreCorto`: from `nombre` (split for the short form, e.g. first token + last token) — acceptable given current data; if the empleados module exposes name parts via `useEmpleado(empleadoId)`, prefer pulling parts from there.
  - `puesto` (name) and `codigoEmpleado`: fetch from the empleados module (`useEmpleado(empleadoId)` / `empleadosApi`) by `empleadoId`; if código is unavailable, pass `String(empleadoId)` as fallback (no TODO comment). Keep the diploma callable with whatever fields exist — the helper tolerates empty `codigoEmpleado`.
- Wrap the click in try/catch → `toast.error` on failure, `toast.success('Diploma generado')` on success.

### Gate
`npm run typecheck` green **and** `npm run build` green (validates the new deps resolve and the asset is served) · commit.

---

## Self-Review (run before declaring Plan 4b done)

- [ ] Tabs are exactly **Pensums · Asignar · Asignados**; `ReasignacionTab.tsx` deleted; no dangling import/route.
- [ ] `api/capacitaciones.ts` `realApi: typeof mockApi` still compiles (parity) with `listElegibles` + `reabrir` on both sides; mock is a working engine (assign → moves between Asignar/Asignados; reabrir resets + license off).
- [ ] Hooks: `useElegibles`, `useReabrir(empleadoId)` added; reabrir invalidates empleado + empleados + elegibles.
- [ ] AsignarTab: eligible list, multi-select, batch primaria, optional secundaria.
- [ ] AsignadosTab + detail: read-only grades/intentos/license; actions repetir-entera, repetir-módulos (subset reabrir), asignar-secundaria, generar-examen, generar-diploma.
- [ ] Diploma button enabled ONLY when all modules `Aprobado`; `lib/diploma.ts` uses the legacy placeholders and `docx`/`pizzip`/`file-saver`; template at `public/templates/diploma_operario.docx`.
- [ ] `package.json` has the 3 deps (+ `@types/file-saver`); `npm install` ran; `npm run build` green.
- [ ] Each task committed separately with `npm run typecheck` green.

---

## Legacy Intranet shutdown — DOCUMENTED CHECKLIST ONLY (do NOT touch the Intranet repo here)

Once Plan 4a + 4b are live, the equivalent legacy screens in the **Intranet** repo should be retired in a separate, manual change. This plan does **not** modify that repo. Screens/entries to remove there:

- `src/components/View/GestionDePensums.js`
- `src/components/View/AsignacionCapacitaciones.js`
- `src/components/View/ReasignacionDeCapacitaciones.js`
- `src/components/View/GestionCalificaciones.js` (its diploma generation is now in RototecRH `lib/diploma.ts`)
- `src/components/View/RegistroCapacitadores.js`
- Their entries in the **Sidebar** and the home **componentMap**.
- The public exam page `src/pages/evaluacion/[id].js` (replaced by RototecRH `/examen/:token`).

Verify no other Intranet screen imports these before removal; remove dead routes/menu items in the same change. (Tracking item only — out of scope for automated execution.)
