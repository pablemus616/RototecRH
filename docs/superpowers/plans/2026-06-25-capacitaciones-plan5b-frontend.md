# Plan 5b — Frontend Capacitaciones: usabilidad por nombre, gating de examen, link directo (RototecRH)

**For agentic workers.** This plan is written so an agent can execute it task-by-task with no further design decisions. Every task is bite-sized, ends in one commit, and has a concrete verification gate (`npm run typecheck`, plus `npm run build` where noted). UI is specified by behavior + the patterns to imitate; ship complete code only for the data/api/lib pieces and the reusable combobox. This plan **EXTENDS** Plans 3–4 (already merged to `main`) and consumes the optional name fields added by **Plan 5a**. Read the Interfaces block of each task before writing code. Implementers parse task headers of the form `## TASK N — title`.

---

## Goal

Make the Capacitaciones module never ask the user for ids — everything is by name — and tighten two exam flows:

1. **Selectors by name.** A reusable name-combobox for **Puesto** (options from the org tree, `value = idPuesto`) and for **Pensum** (options from `listPensums`, `value = idPensum`). Replace the free-text / numeric puesto inputs in `PensumFormDialog` (PensumsTab), `AsignarTab` and `AsignadosTab` filters. The secondary-pensum selectors already use a name `Select` — keep/standardize them.
2. **Search by name.** A text search box that filters by name in **PensumsTab** (pensum name), **AsignarTab** and **AsignadosTab** (employee name). Department/puesto filters become name dropdowns (org tree), not id inputs. All filtering is client-side over already-fetched data.
3. **Rows show names, not ids.** AsignarTab / AsignadosTab show the puesto name and the capacitación (pensum) name — consuming the new `puestoNombre` / `pensumNombre` / `capacitacionNombre` fields from Plan 5a, with an org-tree / pensum-list fallback when a field is absent (so the page also works pre-5a-deploy and in mock).
4. **Exam gating.** In the employee detail sheet, a module's **"Generar examen"** button is **disabled** with a clear hint/tooltip ("Este módulo no tiene evaluación generada") when the module has no evaluation. Detect via the existing `GET /capacitaciones/modulos/:id/evaluacion` (returns `null`), batched once per visible pensum's modules.
5. **Direct exam link.** On token generation (`POST /capacitaciones/examenes` → `{ token, ... }`), show `${window.location.origin}/examen/${token}` — copyable **and** clickeable (navigates to the SPA exam route). Never show the raw token or a backend URL.
6. **General polish.** Clear labels, loading/empty/error states, no ids surfaced to the user.

**Out of scope:** backend changes (Plan 5a); the exam-taking page logic itself (`ExamenPublicoPage`, unchanged); diploma generation (Plan 4b, unchanged).

## Architecture

- React 18 + Vite 5 + TypeScript **strict** (`noUnusedLocals`, `noUnusedParameters`).
- Tailwind v3 + shadcn/ui hand-written in `src/components/ui/` (no CLI).
- TanStack Query v5, React Hook Form + Zod, React Router v6 (`createBrowserRouter`).
- **API layer (mock↔real parity):** each `src/api/<recurso>.ts` exports `<recurso>Api = USE_MOCK ? mockApi : realApi`; `realApi: typeof mockApi` so the compiler enforces identical method names/signatures. `realApi` hits `rrhhApi` (axios, baseURL `${BASE_URL}/rrhh`). Mock persists to `localStorage` under `rototec.cap.*`. Plan 5a serves names at `/rrhh/capacitaciones/...`; since `rrhhApi` prepends `/rrhh`, frontend paths start at `/capacitaciones/...`.
- **Existing combobox-with-search:** `src/components/ui/employee-combobox.tsx` exports `EmpleadoCombobox` — a hand-rolled button + search input + filtered list with keyboard nav and `norm()` accent-insensitive matching, `value: number | null` / `onChange`. **This is the pattern to generalize** into a generic `NameCombobox` (TASK 1). There is NO shadcn `Command`/combobox primitive in the repo; do not add one — reuse this pattern.
- Org tree source: **`useArbol()` (no args)** in `src/hooks/useArbol.ts` → `ArbolOrganizacional = EmpresaArbol[]`, shape `{ Id, Nombre, departamentos: { id, nombre, subdepartamentos: { id, nombre, puestos: { id, nombre }[] }[] }[] }[]` (note the casing: empresa uses `Id/Nombre`, the rest `id/nombre`). It returns the COMPLETE tree (empresa→depto→subdepto→puesto) WITHOUT needing an `empresaId`. Flatten across empresas→deptos→subdeptos→puestos to get all puesto options `{ id, nombre }[]`; flatten across empresas→deptos for department options `{ id, nombre }[]`. **Do NOT use `useArbolEmpresa(empresaId)` and do NOT assume/resolve an `empresaId` anywhere.**
- Pensum options: `usePensums()` → `Pensum[] { id, nombre }`.
- **No test runner in this repo.** Gate = `npm run typecheck` after every task; `npm run build` before the final commit.

## Tech Stack

React 18 · Vite 5 · TS strict · Tailwind v3 · shadcn/ui · TanStack Query v5 · RHF + Zod · axios · sonner · lucide-react.

## Global Constraints

- `realApi` MUST mirror `mockApi` method-for-method (typed `realApi: typeof mockApi`). Any new method/field goes in BOTH; update the mock so every flow in this plan exercises end-to-end with `USE_MOCK=true`.
- The frontend **never** renders a raw `idPuesto`/`idPensum`/`idModulo`/token to the user. Internally `value` stays numeric; the label is always a name.
- Name fields from Plan 5a are **optional on the type** (`puestoNombre?`, `pensumNombre?`, `capacitacionNombre?`) so types compile against both pre- and post-5a backends and the mock; always provide a client-side fallback (org tree / pensum list) when absent.
- shadcn components only from `src/components/ui/`; reuse existing primitives. The new `NameCombobox` is added by generalizing the existing `EmpleadoCombobox` pattern (no CLI, no new radix dep).
- Mutations invalidate the matching `QK`; mirror `useCapacitaciones`.
- Each task = one commit. Gate: `npm run typecheck` green (and `npm run build` on the final task) before commit.

## File Structure (frontend, relevant subtree)

```
RototecRH/src/
├── components/ui/
│   ├── employee-combobox.tsx                 (existing — pattern source)
│   └── name-combobox.tsx                     (TASK 1 — NEW generic { id:number; nombre:string }[] combobox)
├── hooks/
│   ├── useArbol.ts                           (existing — useArbol(), full org tree, no empresaId)
│   ├── usePuestoOptions.ts (or inline)       (TASK 1 — flatten useArbol() tree → {id,nombre}[]; may live in a small hook/util)
│   └── useCapacitaciones.ts                  (TASK 4 — +useEvaluacionesDeModulos batch hook)
├── api/capacitaciones.ts                     (TASK 5 — generarExamen already returns {token,url}; ensure url uses window.location.origin in BOTH mock & a comment for real)
├── types/index.ts                            (TASK 3 — +optional puestoNombre/pensumNombre/capacitacionNombre on EmpleadoCapElegible & EmpleadoCapResumen)
└── pages/capacitaciones/
    ├── PensumsTab.tsx                         (TASK 2 — search by pensum name; PensumFormDialog puesto → NameCombobox)
    ├── AsignarTab.tsx                         (TASK 3 — name search + puesto/depto name dropdowns + name columns)
    ├── AsignadosTab.tsx                       (TASK 3 — name search + puesto/depto name dropdowns + name columns)
    └── EmpleadoCapDetailSheet.tsx            (TASK 4 — exam gating; TASK 5 — direct link; show pensum/module names)
```

---

## TASK 1 — `NameCombobox` reutilizable + opciones de puesto desde el árbol org

**Why:** every "by name" selector/filter needs one searchable dropdown whose `value` is a numeric id but whose label is a name. Generalize the proven `EmpleadoCombobox`.

**Interfaces:**

```ts
// src/components/ui/name-combobox.tsx
export interface NameOption { id: number; nombre: string }
interface NameComboboxProps {
  options: NameOption[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  searchPlaceholder?: string
  allowAll?: boolean          // when true, a "Todos" option with id=null is prepended (for filters)
  allLabel?: string           // default 'Todos'
  emptyLabel?: string         // default 'Sin resultados'
  disabled?: boolean
  className?: string
}
export function NameCombobox(props: NameComboboxProps): JSX.Element

// Puesto options from the FULL org tree (no empresaId), built on useArbol():
// flatten empresas → departamentos → subdepartamentos → puestos into unique { id, nombre }
export function usePuestoOptions(): { options: NameOption[]; isLoading: boolean }
// Department options: flatten empresas → departamentos into { id, nombre }[]
export function useDepartamentoOptions(): { options: NameOption[]; isLoading: boolean }
```

**Behavior / pattern:** copy `EmpleadoCombobox` verbatim, rename to `NameCombobox`, rename the `empleados` prop to `options` and the option label field from `nombre` (employee) to `nombre` (generic) — the existing component already keys on `{ id, nombre }`, so the change is mostly the prop name and types (`EmpleadoOption` → `NameOption`). Keep the accent-insensitive `norm()` match, keyboard nav, click-outside close, and the `allowAll` (`id=null` → "Todos") branch. Build `usePuestoOptions`/`useDepartamentoOptions` on top of **`useArbol()` (no args)**: flatten the full tree with `useMemo` (`empresas.flatMap(e => e.departamentos)` for deptos; `…flatMap(d => d.subdepartamentos).flatMap(s => s.puestos)` for puestos), dedupe by `id`, sort by `nombre` (localeCompare). Return `options: []` + `isLoading` while the tree loads. Do NOT reference `empresaId` or `useArbolEmpresa`.

**Note:** do NOT delete `EmpleadoCombobox` (other pages use it). `NameCombobox` is the generic sibling; optionally `EmpleadoCombobox` could later re-export from it, but that refactor is out of scope.

**Gate:** `npm run typecheck` green. Commit: `feat(ui): NameCombobox + opciones de puesto/depto desde el árbol org`.

---

## TASK 2 — PensumsTab: buscador por nombre + selector de PUESTO por nombre en el form

**Why:** today the pensum list has no search and `PensumFormDialog` sets the puesto via a free-text `Input` (`form.register('puesto')`), so `idPuesto` is never set by name.

**Behavior spec:**
- **Search:** add a controlled `Input` (label "Buscar por nombre", `Search` icon, `sm:w-64`) above the table; filter the `usePensums()` result client-side with the accent-insensitive `norm()` helper on `p.nombre`. Empty result → existing empty-state row.
- **Form puesto selector:** in `PensumFormDialog`, replace the free-text puesto `Input` with `<NameCombobox options={puestoOptions} value={idPuesto} onChange={setIdPuesto} placeholder="Selecciona un puesto" />` fed by `usePuestoOptions()`. On submit build `PensumInput` with `idPuesto` from the combobox value, and set `puesto` to the selected option's `nombre` (so the legacy free-text column stays human-readable and consistent). Validate "puesto requerido" via the existing zod schema (adjust the schema to require `idPuesto: number` instead of the free-text `puesto` string — keep `puesto` optional/derived). When editing, initialize the combobox from `pensum.idPuesto`.
- The table's "Puesto" column keeps showing `p.puesto` (name) — already correct.

**Gate:** `npm run typecheck` green. Commit: `feat(cap): buscador y selector de puesto por nombre en PensumsTab`.

---

## TASK 3 — AsignarTab + AsignadosTab: nombres en filtros, búsqueda y filas

**Why:** both tabs currently take **id** inputs for puesto/departamento and AsignarTab shows `ID Puesto`/`ID Pensum` columns. Users must work by name.

**Types (TASK 3 prerequisite, additive):** in `src/types/index.ts` append optional name fields:
```ts
// EmpleadoCapElegible: + puestoNombre?: string | null; pensumNombre?: string | null
// EmpleadoCapResumen:  + puestoNombre?: string | null; capacitacionNombre?: string | null
```
Update the **mock** `listElegibles`/`listEmpleados` in `src/api/capacitaciones.ts` to populate these from the seed (resolve `idPuesto`→ a seed puesto-name map, and the pensum name from `seedPensums`), so `USE_MOCK=true` exercises the name UI. (Real API gets them from Plan 5a.)

**AsignarTab behavior spec:**
- Replace the two numeric id `Input`s with: a **puesto** `NameCombobox allowAll` (`usePuestoOptions`) and a **departamento** `NameCombobox allowAll` (`useDepartamentoOptions`). Their `value` (numeric id | null) feeds `useElegibles({ puesto, departamento })` exactly as the numeric filters did.
- Add an employee **search** `Input` that filters the fetched `elegibles` client-side by `norm(nombre)`.
- Columns: replace `ID Puesto` / `ID Pensum` headers+cells with **Puesto** (`e.puestoNombre ?? puestoOptions name fallback ?? '—'`) and **Capacitación** (`e.pensumNombre ?? pensums.find(p=>p.id===e.idPensum)?.nombre ?? '—'`). Keep the checkbox/select-all and the "Secundaria" action. The secondary dialog already uses a name `Select` of pensums — leave it (optionally swap to `NameCombobox` for consistency).
- Reset `selected` when filters/search change (as today).

**AsignadosTab behavior spec:**
- Replace the puesto/departamento text `Input`s with `NameCombobox allowAll` (puesto + depto). Note: `useEmpleadosCap` currently takes `{ puesto?: string; departamento?: string; estado? }` (strings). Either (a) pass the numeric id as string, or (b) widen the filter to numbers — pick (a) to avoid touching the hook/mock signature: `puesto: value != null ? String(value) : undefined`. Keep the existing `estado` `Select`.
- Add an employee **search** `Input` filtering the fetched list by `norm(nombre)`.
- Columns: add a **Puesto** column (`e.puestoNombre ?? fallback`) and a **Capacitación** column (`e.capacitacionNombre ?? '—'`) alongside the existing Nombre/Estado/Progreso/Licencia. No ids shown.

**Fallback rule (both tabs):** prefer the server name field; if absent, resolve via `usePuestoOptions` map (puesto) / `usePensums` (pensum); else `'—'`. This keeps the page working pre-5a and in mock.

**Gate:** `npm run typecheck` green. Commit: `feat(cap): filtros/búsqueda/columnas por nombre en Asignar y Asignados`.

---

## TASK 4 — Gating de "Generar examen" por existencia de evaluación

**Why:** generating an exam for a module with no evaluation is a dead end. Disable the button with a clear reason when `GET /capacitaciones/modulos/:id/evaluacion` is `null`.

**Interfaces:**
```ts
// hooks/useCapacitaciones.ts — batch hook: which modules have an evaluation?
// Fetch evaluations for a set of module ids once; expose a Map/Set of ids that HAVE one.
export function useEvaluacionesDeModulos(idModulos: number[]): {
  tieneEvaluacion: (idModulo: number) => boolean | undefined  // undefined while loading
  isLoading: boolean
}
```

**Behavior spec:**
- Implement `useEvaluacionesDeModulos` with `useQueries` (TanStack Query v5) over the distinct `idModulos`, each calling `cap.getEvaluacion(idModulo)` (reuse `QK.evaluacion(idModulo)` keys for cache sharing with the editor). `tieneEvaluacion(id)` returns `true` when that query's data is non-null, `false` when `null`, `undefined` while its query is loading.
- In `EmpleadoCapDetailSheet`, the detail data exposes each asignación's `detalles[].idModulo`. Collect all `idModulo`s of the employee's asignaciones and call `useEvaluacionesDeModulos(allModuloIds)` once at the sheet level (or per `AsignacionCard`). Pass the resolver down to `DetalleRow`.
- In `DetalleRow`, compute `const tiene = tieneEvaluacion(detalle.idModulo)`. Disable "Generar examen" when `tiene === false` (and while `tiene === undefined`, show a subtle loading/disabled state). Add `title="Este módulo no tiene evaluación generada"` on the disabled button and a small muted hint line under it when disabled, mirroring the existing Diploma button's disabled-hint pattern (`title=` + `<p className="text-xs text-muted-foreground">`).
- Also replace the user-facing `Módulo #{detalle.idModulo}` label with the module name when available: the employee detail doesn't carry module names today, but the pensum árbol (`usePensumArbol(idPensum)`) does. Resolve `modulo` name from the pensum árbol modules by `idModulo`; fallback to `Módulo` (no raw id) — minor polish, acceptable to keep `#id` if the árbol fetch is deemed too heavy; prefer the name.

**Gate:** `npm run typecheck` green. Commit: `feat(cap): gating de Generar examen según evaluación del módulo`.

---

## TASK 5 — Link de examen directo (copiable + clickeable) y pulido final

**Why:** the admin must get a working SPA link, not a token or backend URL.

**Behavior spec:**
- `generarExamen` already returns `{ token, url }` and the mock already builds `url = ${window.location.origin}/examen/${token}`. **Confirm** the real API constructs the displayed link the same way: the realApi `generarExamen` returns the backend payload `{ token, ... }`; in `DetalleRow.onGenerar`, build the displayed link as `const link = `${window.location.origin}/examen/${res.token}`` rather than trusting `res.url` (the backend may return a backend-origin url). Use `res.token` as the source of truth for the link.
- Render the link block (after generation) as: a read-only `Input` showing `link`, a **Copiar link** ghost button (`navigator.clipboard.writeText(link)` + sonner success — already present), and a **clickable** element that navigates to the same SPA exam route — use a React Router `<Link to={`/examen/${res.token}`}>Abrir examen</Link>` (or `<a href={link} target="_blank" rel="noreferrer">`). Never display the raw token string on its own.
- Keep horas-vigencia dialog as-is.
- **Casing bug fix (concrete step):** in `EmpleadoCapDetailSheet.tsx`, `AsignacionCard` currently does `<Badge variant={asignacion.tipo === 'PRIMARIA' ? 'default' : 'secondary'}>` — the comparison is against the wrong case. The backend/mock produce lowercase `'primaria'`/`'secundaria'`, so the `'PRIMARIA'` test is never true. Change it to compare against `'primaria'` (lowercase). Audit any other `=== 'PRIMARIA'` / `=== 'SECUNDARIA'` (or uppercase `tipo` comparisons) in the Capacitaciones files and fix them the same way.
- Final polish pass over the four touched files: ensure every label is plain Spanish, loading uses `Skeleton`, empty/error states present, and no `id` is rendered to the user anywhere in Capacitaciones (grep the tab/sheet files for `#{` / `ID ` / `idPuesto`/`idPensum` surfaced in JSX text).

**Mock:** confirm `getExamenPublico(token)` returns a usable mock exam so clicking the link in `USE_MOCK=true` lands on a working `ExamenPublicoPage` (it already does — verify the route `/examen/:token` exists in `router.tsx`).

**Gate:** `npm run typecheck` **and** `npm run build` green. Commit: `feat(cap): link de examen directo copiable/clickeable + pulido`.

---

## Self-Review (run before declaring the plan done)

- [ ] `NameCombobox` generalizes `EmpleadoCombobox` (search, keyboard nav, accent-insensitive, `allowAll`); `EmpleadoCombobox` left intact.
- [ ] No id input remains in PensumsTab/AsignarTab/AsignadosTab — puesto/depto are name dropdowns from the org tree; search filters by name client-side.
- [ ] Rows show `puestoNombre`/`pensumNombre`/`capacitacionNombre` with org-tree / pensum-list fallback; types are optional so it compiles pre- and post-5a; mock populates them.
- [ ] "Generar examen" disabled + hint when the module has no evaluation (`getEvaluacion === null`), batched via `useQueries`, loading state handled.
- [ ] Exam link = `${window.location.origin}/examen/${token}` from `res.token`, copyable AND clickeable (SPA route), token never shown raw.
- [ ] `realApi` still mirrors `mockApi`; mock updated so all flows work with `USE_MOCK=true`.
- [ ] Org tree options come from `useArbol()` (full tree, no `empresaId`); no reference to `useArbolEmpresa`/`empresaId` anywhere.
- [ ] `AsignacionCard` (and any sibling) `tipo` comparison fixed to lowercase `'primaria'`.
- [ ] Each task: one commit, `typecheck` green (+`build` on TASK 5).
