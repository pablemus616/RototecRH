# Plan 5a — Backend Capacitaciones: nombres en respuestas + refinar migración (Microservicios)

**For agentic workers.** This plan is written so an agent can execute it task-by-task with no further design decisions. Every task is bite-sized, ends in one commit, ships complete code for data/SQL/lib, and has a concrete verification gate. Mirror the existing `capacitaciones` module patterns cited inline; do not invent new conventions. This plan **EXTENDS** the work already merged to `main` (Plans 1–4). Read the Interfaces block of each task before writing code. Implementers parse task headers of the form `## TASK N — title`.

---

## Goal

Two backend refinements that unblock the Plan 5b usability pass on the frontend:

1. **Enrich list responses with human-readable names.** `EmpleadosCapService.listarElegibles` and `EmpleadosCapService.listar` (asignados) currently return only ids (`idPuesto`, `idPensum`, `idDepartamento`). Add `puestoNombre` (join `tPuestos` by `idPuesto`) and the pensum name (`pensumNombre`) so the frontend renders names without N+1 fetches. **Additive only** — keep every existing field; only append new ones.
2. **Refine the migration artifact `003-migracion-vigentes.sql`.** Collapse legacy duplicates of `tCapacitados` by `(EmpleadoId, IdPensum)` with `ROW_NUMBER()` before the header INSERT (fixes the duplicate-cabecera finding from the Plan 4a review), confirm the NOTES migrate (`Puntuacion`/`Estado` of `tCapacitadosDetalle` → `tCapAsignacionDetalle`) and the license carries over, and document the optional `tEvaluados → tCapIntento` history migration (decision recorded below). Keep idempotency + self-guard, and refresh the RUNBOOK.

**Out of scope:** any frontend change (Plan 5b); running the migration against a real DB; any new endpoint for the exam direct link (the frontend builds the link from `window.location.origin`, the backend does NOT change for that); the legacy Intranet repo.

## Architecture

- NestJS 10 + TypeORM, SQL Server. Domain microservice **recursos-humanos** under the global gateway.
- **Global route prefix `/rrhh`** (`main.ts` → `app.setGlobalPrefix('/rrhh')`). Every `@Controller('capacitaciones/...')` path is served at `/rrhh/capacitaciones/...`. Controllers declare paths **without** `/rrhh`.
- **`synchronize: false`** — the ORM never alters the schema. Schema/data changes live exclusively in numbered, idempotent SQL files in `src/capacitaciones/sql/`, applied **manually by a DBA**. Entities only *map* existing columns.
- Module pattern (`capacitaciones.module.ts`): `@Module({ imports:[TypeOrmModule.forFeature([...entities])], controllers:[...], providers:[...services] })`. `Puesto` and `Pensum` repos are already injectable in `EmpleadosCapService` (Pensum is already injected; **Puesto must be added** — see TASK 1 Interfaces).
- **Tests: plain Jest, no Nest `TestingModule`.** Instantiate services directly with positional constructor args, passing repo mocks `{ find: jest.fn(), findOne: jest.fn(), ... }`. Canonical reference: `empleados-cap.service.spec.ts` and `examen.service.spec.ts`.
- DTOs use `class-validator`; endpoints validated by the global `ValidationPipe`.

## Tech Stack

NestJS 10 · TypeORM (SQL Server / `mssql`) · class-validator · Jest (plain, `new Service(mockRepo)`) · `tsc` build.

## Global Constraints

- Never set `synchronize: true`; never use ORM schema sync. Schema/data changes go in `src/capacitaciones/sql/NNN-*.sql`, idempotent, batch-separated with `GO`.
- Keep `/rrhh` prefix awareness: controllers declare paths **without** `/rrhh`.
- **Additive contract change only.** `listar`/`listarElegibles` must keep returning every field they return today; new fields are appended. No consumer (Plan 4b frontend on `main`) may break.
- Resolve names with a **single batched query** (one `In([...ids])` find for puestos, one for pensums) and in-memory `Map` lookup — never per-row queries (no N+1).
- Each task = one commit. Gate after every task: `npx jest <touched-spec>` (or full `jest`) **and** `npm run build` (tsc) — both green before commit.

## File Structure (backend, relevant subtree)

```
apps/domains/global/recursos-humanos/src/
├── capacitaciones/
│   ├── empleados-cap.service.ts        (TASK 1 — inject Puesto repo; enrich listar + listarElegibles)
│   ├── empleados-cap.service.spec.ts   (TASK 1 — new/extended specs for the joins)
│   ├── capacitaciones.module.ts        (verify Puesto + Pensum in forFeature — already present)
│   └── sql/
│       ├── 001-alter-tPensum-add-id_puesto.sql   (exists, unchanged)
│       ├── 002-tablas-transaccionales.sql        (exists, unchanged)
│       └── 003-migracion-vigentes.sql            (TASK 2 — refined)
├── models/entities/
│   ├── puesto.entity.ts                (dbo.tPuestos: id, nombre, ...)
│   ├── pensum.entity.ts                (dbo.tPensum: id, nombre, puesto, idPuesto)
│   ├── empleado.entity.ts              (dbo.tEmpleados)
│   ├── cap-asignacion.entity.ts
│   └── cap-asignacion-detalle.entity.ts
└── (RUNBOOK lives at the bottom of the plan 2026-06-25-capacitaciones-plan4a-backend.md;
     TASK 2 appends a "Plan 5a refinements" section to it — or inline header comment in the SQL)
```

## Entity column reference (already in `main`, do not change)

- **Empleado** `dbo.tEmpleados`: `id`, `nombre`, `apellido`, `id_departamento`→`idDepartamento:int|null`, `id_puesto`→`idPuesto:int|null`, `esta_activo`→`estaActivo:boolean`.
- **Puesto** `dbo.tPuestos`: `id`, `nombre:string|null`, `id_subdepartamento`, `codigo_biotime`.
- **Pensum** `dbo.tPensum`: `ID`→`id`, `Nombre`→`nombre`, `Puesto`→`puesto:string|null` (legacy free text), `id_puesto`→`idPuesto:int|null`.
- **CapAsignacion** `dbo.tCapAsignacion`: `Id`,`EmpleadoId`,`IdPensum`,`Tipo`,`FechaInicio`,`LicenciaActiva`,`VenceLicencia`,`FechaFinaliza`,`CreadoEn`.
- **CapAsignacionDetalle** `dbo.tCapAsignacionDetalle`: `Id`,`IdAsignacion`,`IdModulo`,`Puntuacion:int|null`,`Estado`,`Intentos`,`CreadoEn`.

---

## TASK 1 — Enriquecer `listar` y `listarElegibles` con `puestoNombre` y `pensumNombre`

**Why:** the frontend (Plan 5b) must show names, not ids, in the Asignar/Asignados tables. Resolving names server-side (one batched join each) avoids the frontend doing N lookups against the org tree.

**Interfaces (the only shapes that change — additive):**

```ts
// EmpleadosCapService.listarElegibles → existing item, with two appended fields:
interface ElegibleItem {
  empleadoId: number
  nombre: string
  idPuesto: number
  idPensum: number
  puestoNombre: string | null   // NEW — join tPuestos by idPuesto
  pensumNombre: string | null   // NEW — name of the pensum at idPensum
}

// EmpleadosCapService.listar (asignados) → existing item, with appended fields:
interface AsignadoItem {
  empleadoId: number
  nombre: string
  idPuesto: number | null
  idDepartamento: number | null
  estaActivo: boolean
  modulosTotal: number
  modulosAprobados: number
  licenciaActiva: boolean
  puestoNombre: string | null   // NEW — join tPuestos by idPuesto
  // capacitacionNombre: the pensum name(s) the employee is assigned to.
  // An employee may have >1 asignacion (primaria + secundaria); expose the
  // PRIMARY pensum name as `capacitacionNombre` (first 'primaria'; fallback first asignacion).
  capacitacionNombre: string | null  // NEW
}
```

**Steps:**
1. Inject the `Puesto` repository into `EmpleadosCapService` (constructor): add
   `@InjectRepository(Puesto) private readonly puestoRepo: Repository<Puesto>` (import `Puesto` from `../models/entities/puesto.entity`). Confirm `Puesto` is in `capacitaciones.module.ts` `TypeOrmModule.forFeature([...])`; if absent, add it.
2. **`listarElegibles`** — after building the mapped result (the existing `.map(...)` at the end):
   - Collect the distinct `idPuesto`s and `idPensum`s present in the result.
   - One batched `this.puestoRepo.find({ where: { id: In(puestoIds) } })` → `Map<number,string|null>` of `id → nombre`. (`pensums` are already loaded at the top of the method as `pensums`; reuse them to build `Map<number,string> idPensum → nombre`.)
   - Append `puestoNombre` and `pensumNombre` from those maps (`?? null`).
3. **`listar`** — the method already loads `empleadosFiltrados`, `asignaciones`, `detalles`. Add name resolution:
   - Build `puestoNombre` from a batched `puestoRepo.find({ where: { id: In(distinctPuestoIds) } })` map keyed by `e.idPuesto`.
   - Build `capacitacionNombre`: load the pensums referenced by the employees' assignments — `const pensumIds = [...new Set(asignaciones.map(a => a.idPensum))]; const pensums = await this.pensumRepo.find({ where: { id: In(pensumIds) } })` → `Map<number,string>`. For each employee pick the `asignacion` with `tipo === 'primaria'` (fallback: first assignment in `asigs`), look up its `idPensum` in the map. `null` if no assignment resolves.
   - Append both fields to the returned object; **leave all existing fields untouched**.
4. Guard empty arrays: `In([])` must not run — skip the find and use empty maps when there are no ids.

**Spec (`empleados-cap.service.spec.ts`, extend):**
- `listarElegibles` test: arrange `puestoRepo.find` to return `[{id:1,nombre:'Operario'}]` and `pensumRepo.find` to return `[{id:5,idPuesto:1,nombre:'Inducción Operario'}]`; assert each item has `puestoNombre==='Operario'` and `pensumNombre==='Inducción Operario'`, AND the original fields (`empleadoId`,`idPuesto`,`idPensum`) are still present/unchanged.
- `listar` test: employee with a `primaria` assignment to pensum 5 and `idPuesto=1`; assert `puestoNombre==='Operario'` and `capacitacionNombre==='Inducción Operario'`. Add a second employee with idPuesto missing from the puesto map → assert `puestoNombre===null` (no throw).
- Regression test: a call where `puestoRepo.find`/`pensumRepo.find` return `[]` → fields are `null`, no crash, `In([])` not invoked (assert `find` called with non-empty `In` or not called).

**Gate:** `npx jest empleados-cap.service.spec` green **and** `npm run build` green. Commit: `feat(cap): puestoNombre + pensumNombre en listar/listarElegibles`.

---

## TASK 2 — Refinar `003-migracion-vigentes.sql` (dedupe + notas + RUNBOOK)

**Why:** Plan 4a review found the header INSERT can create duplicate `tCapAsignacion` rows when legacy `tCapacitados` holds more than one row for the same `(EmpleadoId, IdPensum)`. We collapse those with `ROW_NUMBER()` keeping the most recent, confirm grades/license migrate, and document the optional attempt-history migration.

**This file is an artifact — NOT executed by this plan. It is edited and the RUNBOOK is updated; a DBA runs it manually in prod.**

**Decisions to bake in:**
- **Dedup key:** `(EmpleadoId, IdPensum)`. Keep the row with the **greatest** `FechaFinaliza` (then greatest `FechaCreado`, then greatest legacy `Id`) — i.e. the most-recently-completed record. Use `ROW_NUMBER() OVER (PARTITION BY EmpleadoId, IdPensum ORDER BY FechaFinaliza DESC, FechaCreado DESC, Id DESC)` in a CTE and INSERT only `rn = 1`.
- **Notes:** B2 already maps `Puntuacion`/`Estado` from `tCapacitadosDetalle` → `tCapAsignacionDetalle`. Confirm via the summary `SELECT` that `Puntuacion` is non-null where the legacy had it. Detail join must key on the **deduped** header (join through the CTE / the inserted cabecera by `EmpleadoId + IdPensum + Tipo='primaria'`), so detalles of discarded duplicate headers are not double-inserted (the existing `NOT EXISTS` on `(IdAsignacion, IdModulo)` already guards, but the dedup makes the cabecera deterministic).
- **License:** `LicenciaActiva` + `VenceLicencia` already carry over in B1 (`c.LicenciaActiva`, `c.FechaVencimiento`). Keep them; they come from the surviving (`rn=1`) row.
- **Attempt history (`tEvaluados` → `tCapIntento`):** **NOT included in this migration.** Rationale: `tCapIntento` is an audit trail of exams taken through the new system; backfilling it from legacy `tEvaluados` risks polluting "intentos" counts and has no consumer today (Plan 4a `reabrir` preserves it going forward, but nothing reads historical legacy attempts). Document this explicitly in the SQL header comment and the RUNBOOK as a **deliberate exclusion**, with a one-paragraph sketch of how it *could* be added later (insert `(IdAsignacionDetalle, IdEvaluacion, Puntaje, Aprobado, TomadoEn)` joining `tEvaluados` to the migrated detalle by employee+module) if the client later asks for it.

**Refined SECTION B1 (replace the current B1 INSERT) — full SQL:**

```sql
    -- ------------------------------------------------------------------
    -- B1: Insertar cabeceras en tCapAsignacion (DEDUPLICADO).
    --     Colapsa duplicados legacy por (EmpleadoId, IdPensum) quedandose
    --     con el registro mas reciente (FechaFinaliza, luego FechaCreado, luego Id).
    --     Evita cabeceras duplicadas (finding del review de Plan 4a).
    -- VERIFY: ajustar los nombres de columna legacy marcados.
    -- ------------------------------------------------------------------
    ;WITH legacy_dedup AS (
        SELECT
            CAST(c.ID_FH AS INT)      AS EmpleadoId,   -- VERIFY: id empleado legacy
            c.ID_Pensum               AS IdPensum,     -- VERIFY: FK pensum legacy
            c.FechaInicio             AS FechaInicio,  -- VERIFY
            c.LicenciaActiva          AS LicenciaActiva, -- VERIFY (bit)
            c.FechaVencimiento        AS VenceLicencia,  -- VERIFY
            c.FechaFinaliza           AS FechaFinaliza,  -- VERIFY
            ISNULL(c.FechaCreado, GETDATE()) AS CreadoEn, -- VERIFY
            ROW_NUMBER() OVER (
                PARTITION BY CAST(c.ID_FH AS INT), c.ID_Pensum
                ORDER BY c.FechaFinaliza DESC, c.FechaCreado DESC, c.Id DESC  -- VERIFY: cols
            ) AS rn
          FROM dbo.tCapacitados c
         WHERE (c.LicenciaActiva = 1 OR c.FechaVencimiento >= GETDATE())      -- VERIFY: predicado "vigente"
    )
    INSERT INTO dbo.tCapAsignacion
        (EmpleadoId, IdPensum, Tipo, FechaInicio, LicenciaActiva, VenceLicencia, FechaFinaliza, CreadoEn)
    SELECT
        d.EmpleadoId, d.IdPensum, 'primaria',
        d.FechaInicio, d.LicenciaActiva, d.VenceLicencia, d.FechaFinaliza, d.CreadoEn
      FROM legacy_dedup d
     WHERE d.rn = 1
       AND NOT EXISTS (
               SELECT 1 FROM dbo.tCapAsignacion a
                WHERE a.EmpleadoId = d.EmpleadoId
                  AND a.IdPensum   = d.IdPensum
                  AND a.Tipo       = 'primaria'
           );
```

**SECTION B2** stays structurally as today (detalle INSERT with the `NOT EXISTS (IdAsignacion, IdModulo)` idempotency guard). Add one clarifying comment that the join `a.EmpleadoId = CAST(c.ID_FH AS INT) AND a.IdPensum = c.ID_Pensum AND a.Tipo='primaria'` now resolves to the single deduped cabecera, so detalles of discarded duplicates collapse onto it (the `NOT EXISTS` prevents double rows). Keep the `CASE d.Estado` mapping (`Aprobado`/`No aprobado`/else `Pendiente`) and `d.Puntuacion` passthrough so NOTES migrate.

**Header comment additions (top of file):** note (a) dedup key + tie-break, (b) NOTES (Puntuacion/Estado) and license are migrated, (c) `tEvaluados → tCapIntento` is a **deliberate exclusion** with the future sketch.

**Summary `SELECT` (extend the existing report):** add counts that help the DBA verify —
```sql
    SELECT
        (SELECT COUNT(*) FROM dbo.tCapAsignacion       WHERE Tipo = 'primaria') AS CabecerasMigradas,
        (SELECT COUNT(*) FROM dbo.tCapAsignacionDetalle)                        AS DetallesMigrados,
        (SELECT COUNT(*) FROM dbo.tCapAsignacionDetalle WHERE Puntuacion IS NOT NULL) AS DetallesConNota,
        (SELECT COUNT(*) FROM dbo.tCapAsignacion       WHERE LicenciaActiva = 1) AS LicenciasActivas;
```

**RUNBOOK update (in `2026-06-25-capacitaciones-plan4a-backend.md`'s RUNBOOK section, or a sibling note):**
- Order unchanged: run `001`, then `002`, then `003`. `003` is **manual, prod-only, by the DBA**.
- Pre-flight: replace all `-- VERIFY:` markers with real legacy column names; run Section A first and resolve any `PuestoSinResolver` rows.
- Verification queries: before/after counts of `tCapAsignacion` and `tCapAsignacionDetalle`; confirm `CabecerasMigradas` ≤ count of distinct `(EmpleadoId,IdPensum)` legacy pairs (dedup worked); spot-check `DetallesConNota` against legacy.
- Idempotency: re-running `003` must report the same counts and insert 0 new rows (self-guarded by `NOT EXISTS` + dedup CTE).
- Record the `tEvaluados` exclusion decision.

**Gate (SQL is not executed):** `npm run build` green (no TS touched, but run to confirm nothing broke) **and** a manual self-review that the SQL parses logically (balanced `BEGIN/END`, `GO` batch separators intact, CTE precedes its INSERT). No jest. Commit: `chore(cap): dedup + notas en 003-migracion-vigentes + RUNBOOK`.

---

## Self-Review (run before declaring the plan done)

- [ ] `listar` and `listarElegibles` return **all** previous fields plus the new name fields — diff the returned object keys against `main`.
- [ ] Name resolution uses batched `In([...])` finds + `Map` lookup; no per-row query; `In([])` is never executed.
- [ ] `Puesto` repo injected and present in `capacitaciones.module.ts` `forFeature`.
- [ ] Specs assert both the new fields AND the unchanged originals; empty-map regression covered.
- [ ] `003` dedups by `(EmpleadoId, IdPensum)` keeping the most recent; detalles collapse onto the surviving cabecera; NOTES + license migrate; `tEvaluados` exclusion documented.
- [ ] `003` remains idempotent + self-guarded; `GO` batches intact; RUNBOOK updated (manual prod execution by DBA).
- [ ] Each task: one commit, `jest` (TASK 1) + `tsc build` green.
