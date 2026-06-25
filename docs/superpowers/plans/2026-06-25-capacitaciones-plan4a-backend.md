# Plan 4a — Backend Capacitaciones: Elegibles + Reabrir + Migración (Microservicios)

**For agentic workers.** This plan is written so an agent can execute it task-by-task with no further design decisions. Every task is bite-sized, ends in one commit, ships complete code for data/SQL/lib, and has a concrete verification gate. Mirror the existing `capacitaciones` and `organizacion` module patterns cited inline; do not invent new conventions. This plan **EXTENDS** the work already merged to `main` (Plans 1–2). Read the Interfaces block of each task before writing code.

---

## Goal

Add the backend pieces required by Plan 4 of Capacitaciones, on top of the transactional model already in `main`:

1. **Elegibles** — a query that lists employees who *can* receive a primary assignment (active, their `idPuesto` has a pensum, and they have no primary assignment yet), so the frontend "Asignar" sub-view has a source of truth. Confirm/adjust `EmpleadosCapService.listar` so the "Asignados" sub-view lists only employees **with** an assignment.
2. **Reabrir** — `AsignacionesService.reabrir(idAsignacion, idModulos?)` resets the chosen detalles (or all of them) to `estado='Pendiente'`, `puntuacion=null`, `intentos=0`, **preserving the `tCapIntento` history**, and recomputes the header license (which switches off, because the license is active only when every detalle is `Aprobado`). This powers "repetir capacitación entera" and "repetir módulos individuales".
3. **Migración (artifact only)** — a numbered, idempotent SQL file `003-migracion-vigentes.sql` that (a) resolves `tPensum.id_puesto` from the legacy `Puesto` name string against `tPuestos`, and (b) migrates still-valid records from legacy `tCapacitados`/`tCapacitadosDetalle` into `tCapAsignacion`/`tCapAsignacionDetalle`. **This file is created and documented in a RUNBOOK; it is NOT executed by this plan.**

**Out of scope:** any frontend change (Plan 4b); running the migration against a real DB; touching the legacy Intranet repo.

## Architecture

- NestJS + TypeORM, SQL Server. Domain microservice **recursos-humanos** under the global gateway.
- **Global route prefix `/rrhh`** (`main.ts` → `app.setGlobalPrefix("/rrhh")`). Every `@Controller('capacitaciones/...')` path is served at `/rrhh/capacitaciones/...`.
- **`synchronize: false`** — the ORM never alters the schema. New columns/tables are created exclusively by numbered, idempotent SQL files in `src/capacitaciones/sql/`, applied manually by a DBA. Entities only *map* existing columns.
- Module pattern (`capacitaciones.module.ts`, mirror of `organizacion/organizacion.module.ts`): `@Module({ imports:[TypeOrmModule.forFeature([...entities])], controllers:[...], providers:[...services] })`.
- **Tests: plain Jest, no Nest `TestingModule`.** Instantiate services directly with positional constructor args, passing repo mocks `{ find: jest.fn(), findOne: jest.fn(), save: jest.fn(), ... }`. For `DataSource.transaction`, stub `dataSource.transaction = jest.fn(cb => cb(managerMock))` where `managerMock.getRepository(Entity)` / `managerMock.save(Entity, obj)` delegate to repos keyed by `Entity.name`. See `examen.service.spec.ts` (canonical).
- DTOs use `class-validator`. Endpoints validated by the global `ValidationPipe`.

## Tech Stack

NestJS 10 · TypeORM (SQL Server / `mssql`) · class-validator · Jest (plain, `new Service(mockRepo)`) · `tsc` build.

## Global Constraints

- Never set `synchronize: true`; never use `@nestjs/typeorm` schema sync. Schema changes go in `src/capacitaciones/sql/NNN-*.sql`, idempotent, batch-separated with `GO`.
- Keep `/rrhh` prefix awareness: controllers declare paths **without** `/rrhh`.
- Preserve history: `reabrir` must NOT delete `tCapIntento` / `tCapIntentoDetalle` rows.
- Reuse the existing license math (`lib/calificacion.ts::calcularLicencia` + `ExamenService.recalcularLicenciaConManager`); do not re-derive license rules.
- Each task = one commit. Gate after every task: `npx jest <new-or-touched-spec>` (or full `jest`) **and** `npm run build` (tsc) — both green before commit.

## File Structure (backend, relevant subtree)

```
apps/domains/global/recursos-humanos/src/
├── capacitaciones/
│   ├── empleados-cap.service.ts        (TASK 1 — add listarElegibles, adjust listar)
│   ├── empleados-cap.service.spec.ts   (TASK 1 — new/extended specs)
│   ├── empleados-cap.controller.ts     (TASK 1 — add GET /elegibles)
│   ├── asignaciones.service.ts         (TASK 2 — add reabrir)
│   ├── asignaciones.service.spec.ts    (TASK 2 — new specs)
│   ├── asignaciones.controller.ts      (TASK 2 — add POST /:id/reabrir)
│   ├── dto/
│   │   └── reabrir-asignacion.dto.ts   (TASK 2 — new DTO)
│   ├── examen.service.ts               (TASK 2 — extract recalc to lib OR call shared util)
│   ├── lib/
│   │   └── calificacion.ts             (TASK 2 — possibly add recalcularLicencia helper)
│   └── sql/
│       ├── 001-alter-tPensum-add-id_puesto.sql   (exists)
│       ├── 002-tablas-transaccionales.sql        (exists)
│       └── 003-migracion-vigentes.sql            (TASK 3 — new artifact)
└── models/entities/
    ├── cap-asignacion.entity.ts
    ├── cap-asignacion-detalle.entity.ts
    ├── cap-intento.entity.ts
    ├── pensum.entity.ts
    ├── pensum-modulo.entity.ts
    ├── empleado.entity.ts
    └── puesto.entity.ts
```

---

## Entity column reference (already in `main`, do not change)

- **CapAsignacion** `dbo.tCapAsignacion`: `Id`→`id`, `EmpleadoId`→`empleadoId:int`, `IdPensum`→`idPensum:int`, `Tipo`→`tipo:string('primaria'|'secundaria')`, `FechaInicio`→`fechaInicio:Date|null`, `LicenciaActiva`→`licenciaActiva:boolean`, `VenceLicencia`→`venceLicencia:Date|null`, `FechaFinaliza`→`fechaFinaliza:Date|null`, `CreadoEn`→`creadoEn:Date`.
- **CapAsignacionDetalle** `dbo.tCapAsignacionDetalle`: `Id`→`id`, `IdAsignacion`→`idAsignacion:int`, `IdModulo`→`idModulo:int` (→ `tPensumDetalle.ID`), `Puntuacion`→`puntuacion:int|null`, `Estado`→`estado:string` (`'Pendiente'|'Aprobado'|'No aprobado'`), `Intentos`→`intentos:int`, `CreadoEn`→`creadoEn:Date`.
- **CapIntento** `dbo.tCapIntento`: `Id`,`IdAsignacionDetalle`,`IdEvaluacion`,`Puntaje:int`,`Aprobado:bit`,`TomadoEn:datetime`. **Never touched by reabrir.**
- **Pensum** `dbo.tPensum`: `ID`→`id`, `Nombre`→`nombre`, `Puesto`→`puesto:string|null` (legacy free text), `id_puesto`→`idPuesto:int|null` (FK added by 001).
- **PensumModulo** `dbo.tPensumDetalle`: `ID`→`id`, `ID_Pensum`→`idPensum`, `Vigencia`→`vigencia:int|null` (license months), `PorcentajeAprobacion`→`porcentajeAprobacion:int|null`, etc.
- **Empleado** `dbo.tEmpleados`: `id`, `nombre`, `apellido`, `id_departamento`→`idDepartamento`, `id_puesto`→`idPuesto`, `esta_activo`→`estaActivo:boolean`, plus split name parts.
- **Puesto** `dbo.tPuestos`: `id`, `nombre:string|null`, `id_subdepartamento`, `codigo_biotime`.

### License math reference (`lib/calificacion.ts`)

```ts
calcularLicencia(
  detalles: { estado: EstadoModulo; vigenciaMeses: number | null }[],
  ahora: Date
): { activa: boolean; venceLicencia: Date | null; fechaFinaliza: Date | null }
// activa = (detalles.length > 0 && every detalle.estado === 'Aprobado')
// venceLicencia = ahora + min(vigenciaMeses) months  (null if no vigencias)
// fechaFinaliza = ahora  (when activa) — see existing impl
```

`ExamenService.recalcularLicenciaConManager(manager, idAsignacion, ahora, detalleActualizado?)` loads the header + all detalles, builds `vigenciaPorModulo` from `PensumModulo.vigencia`, calls `calcularLicencia`, and writes `header.licenciaActiva/venceLicencia/fechaFinaliza`. Because resetting a detalle to `'Pendiente'` makes `every(...Aprobado)` false, the recalc yields `activa:false` → license switches off, exactly as required.

---

## TASK 1 — Elegibles query + confirm `listar` returns only assigned employees

### Interfaces

```ts
// empleados-cap.service.ts — NEW method
listarElegibles(filtros: { puesto?: number; departamento?: number }): Promise<Array<{
  empleadoId: number;
  nombre: string;        // `${nombre} ${apellido}`
  idPuesto: number;
  idPensum: number;      // the pensum resolved from idPuesto
}>>

// empleados-cap.controller.ts — NEW endpoint
// GET /rrhh/capacitaciones/empleados/elegibles?puesto=&departamento=
```

### Current behavior to verify/adjust

`listar(filtros: { puesto?, departamento?, estado? })` today returns **all** employees matching the filters (joined to assignments for `modulosTotal/modulosAprobados/licenciaActiva`), regardless of whether they have an assignment. The "Asignados" sub-view must list **only employees with at least one `tCapAsignacion` row**.

**Decision:** keep `listar`'s shape unchanged (frontend Plan 3 already consumes it), but make it return only employees that have ≥1 assignment. Implement by querying the set of `empleadoId` present in `tCapAsignacion` and filtering the result to that set (or by switching the base query to start from `CapAsignacion` and join `Empleado`). Either approach is acceptable; choose the one that keeps the existing return shape `{ empleadoId, nombre, idPuesto, idDepartamento, estaActivo, modulosTotal, modulosAprobados, licenciaActiva }`.

> If, on reading, `listar` *already* restricts to assigned employees (e.g. via an inner join on `CapAsignacion`), make NO change to `listar` and only add a spec asserting it. Document which case held in the commit message.

### Implementation

`listarElegibles`:
1. Load the set of `idPuesto` values present in `tPensum` where `id_puesto IS NOT NULL`, mapped to their `idPensum` — `pensumPorPuesto: Map<idPuesto, idPensum>` (if a puesto has multiple pensums, pick the lowest `id` deterministically and note it; primary assignment resolves a single pensum per puesto, matching `crearPrimaria`).
2. Load the set of `empleadoId` that already have a **primary** assignment: `tCapAsignacion WHERE Tipo='primaria'`.
3. Query `Empleado` where `estaActivo = true`, `idPuesto IN keys(pensumPorPuesto)`, optionally filtered by `filtros.puesto` / `filtros.departamento`, and `id NOT IN` the assigned-primary set.
4. Map to `{ empleadoId, nombre: `${nombre} ${apellido}`, idPuesto, idPensum: pensumPorPuesto.get(idPuesto) }`.

Use the repos already injected into `EmpleadosCapService` (`Empleado`, `CapAsignacion`, `CapAsignacionDetalle`); inject the `Pensum` repo if not already present (add it to the constructor and to `TypeOrmModule.forFeature` only if missing).

Controller: add `@Get('elegibles')` **before** `@Get(':empleadoId')` so the literal route is matched first; parse `puesto`/`departamento` query params to numbers (reuse the same parsing `listar`'s endpoint uses).

### Tests (plain Jest, extend `empleados-cap.service.spec.ts`)

- `listarElegibles` returns an active employee whose puesto has a pensum and who has no primary assignment, with the correct `idPensum`.
- Excludes: inactive employee; employee whose puesto has no pensum (`idPuesto` not in the pensum set); employee who already has a primary assignment.
- Respects `filtros.puesto` / `filtros.departamento`.
- `listar` spec: asserts that an employee with **no** assignment is **absent** from the result (the post-condition required by the "Asignados" view).

### Gate
`npx jest empleados-cap.service.spec` green · `npm run build` green · commit.

---

## TASK 2 — `reabrir` (reset módulos + recompute license)

### Interfaces

```ts
// dto/reabrir-asignacion.dto.ts — NEW
export class ReabrirAsignacionDto {
  @IsOptional() @IsArray() @ArrayMinSize(1) @IsInt({ each: true })
  idModulos?: number[];   // tCapAsignacionDetalle.Id values to reset; omitted = all of the header
}

// asignaciones.service.ts — NEW method
reabrir(idAsignacion: number, idModulos?: number[]): Promise<{
  asignacionId: number;
  reseteados: number;         // count of detalles reset
  licenciaActiva: boolean;    // expected false after reset
  venceLicencia: Date | null;
}>

// asignaciones.controller.ts — NEW endpoint
// POST /rrhh/capacitaciones/asignaciones/:id/reabrir   body: ReabrirAsignacionDto
```

### Where the license recalc lives — DECISION

Reuse the existing license math. The pure function `calcularLicencia` already lives in `lib/calificacion.ts` and is the single source of truth for the rule "active only if every detalle is Aprobado". To avoid duplicating the *orchestration* (load header + detalles → build `vigenciaPorModulo` → call `calcularLicencia` → write header), **extract a manager-bound helper into `lib/calificacion.ts`**:

```ts
// lib/calificacion.ts — NEW exported helper (pure orchestration, manager injected)
export async function recalcularLicencia(
  manager: EntityManager,
  idAsignacion: number,
  ahora: Date,
  detalleActualizado?: { id: number; estado: EstadoModulo },
): Promise<{ activa: boolean; venceLicencia: Date | null; fechaFinaliza: Date | null }>
```

Move the body of `ExamenService.recalcularLicenciaConManager` into this helper **verbatim** (it already takes `manager`, `idAsignacion`, `ahora`, optional updated detalle). Then:
- `ExamenService.recalcularLicenciaConManager` becomes a thin delegate to `recalcularLicencia(...)` (keep the private method so `examen.service.spec.ts` keeps passing, or update the call sites + spec — prefer the thin-delegate to minimize churn).
- `AsignacionesService.reabrir` calls the same `recalcularLicencia`.

> If extraction proves to entangle entity imports awkwardly inside `lib/` (which should stay framework-light), the fallback is to keep `recalcularLicenciaConManager` on `ExamenService` and have `AsignacionesService` depend on it via a small shared provider. Prefer the lib extraction; document the chosen location in the commit message. **Reported location to the caller: `lib/calificacion.ts::recalcularLicencia`.**

### Implementation (`reabrir`)

Inject `DataSource` into `AsignacionesService` (add `@InjectDataSource() private readonly dataSource: DataSource` to the constructor; `examen.service.ts` shows the pattern). Then:

```ts
async reabrir(idAsignacion: number, idModulos?: number[]) {
  return this.dataSource.transaction(async (manager) => {
    const detalleRepo = manager.getRepository(CapAsignacionDetalle);
    const header = await manager.getRepository(CapAsignacion).findOne({ where: { id: idAsignacion } });
    if (!header) throw new NotFoundException(`Asignación ${idAsignacion} no existe`);

    const detalles = await detalleRepo.find({ where: { idAsignacion } });
    if (detalles.length === 0) throw new BadRequestException('La asignación no tiene módulos');

    let objetivo = detalles;
    if (idModulos && idModulos.length > 0) {
      const set = new Set(idModulos);
      objetivo = detalles.filter((d) => set.has(d.id));
      const faltantes = idModulos.filter((id) => !objetivo.some((d) => d.id === id));
      if (faltantes.length > 0)
        throw new BadRequestException(`Módulos no pertenecen a la asignación: ${faltantes.join(', ')}`);
    }

    for (const d of objetivo) {
      d.estado = 'Pendiente';
      d.puntuacion = null;
      d.intentos = 0;
    }
    await detalleRepo.save(objetivo);            // tCapIntento history untouched

    const lic = await recalcularLicencia(manager, idAsignacion, new Date());
    return {
      asignacionId: idAsignacion,
      reseteados: objetivo.length,
      licenciaActiva: lic.activa,
      venceLicencia: lic.venceLicencia,
    };
  });
}
```

Controller:
```ts
@Post(':id/reabrir')
reabrir(@Param('id', ParseIntPipe) id: number, @Body() dto: ReabrirAsignacionDto) {
  return this.service.reabrir(id, dto.idModulos);
}
```

### Tests (plain Jest, NEW `asignaciones.service.spec.ts` or extend existing)

Use the `managerMock`/`dataSource.transaction` stub pattern from `examen.service.spec.ts`.
- **reset-all**: a header with 2 detalles both `Aprobado` (license active) → `reabrir(id)` saves both detalles with `estado:'Pendiente', puntuacion:null, intentos:0`; header recalc writes `licenciaActiva:false`. Assert `reseteados === 2`.
- **reset-subset**: `reabrir(id, [detalleId1])` resets only that detalle; the other keeps `Aprobado`; license still `false` (not all approved). Assert `reseteados === 1`.
- **history preserved**: assert no `intentoRepo`/`tCapIntento` delete is called (no such repo method invoked).
- **errors**: unknown `idAsignacion` → `NotFoundException`; `idModulos` referencing a detalle of another header → `BadRequestException`.

If `recalcularLicencia` was extracted to `lib`, add a focused unit test for it (manager mock returning header + detalles → asserts `calcularLicencia` outcome is written to the header).

### Gate
`npx jest asignaciones.service.spec examen.service.spec` green · `npm run build` green · commit.

---

## TASK 3 — Migration artifact `003-migracion-vigentes.sql` + RUNBOOK (NOT executed)

This task **creates a file and documents it**. It does not run anything against a database.

### Interfaces / inputs

Legacy source tables (read-only here): `dbo.tCapacitados`, `dbo.tCapacitadosDetalle` (the pre-rebuild transactional model). The new targets are `dbo.tCapAsignacion` / `dbo.tCapAsignacionDetalle` (created by `002`). The link from legacy to the new employee PK is `EmpleadoId = CAST(ID_FH AS INT)` and assignments are migrated as `Tipo='primaria'`.

> The dev microservice does not contain the legacy tables (they live only in production). Therefore the SQL must be written **defensively**: guard every legacy-table reference with existence checks so the file is a no-op where those tables are absent. Confirm the exact legacy column names against the production schema during the manual apply — the column names below are the expected mapping and MUST be verified in the RUNBOOK step before execution.

### File: `src/capacitaciones/sql/003-migracion-vigentes.sql`

Write a numbered, idempotent, `GO`-batched script with TWO sections, each fully self-guarded.

**Section A — resolve `tPensum.id_puesto` from the legacy `Puesto` name string.**
```sql
-- 003-migracion-vigentes.sql
-- Idempotente. Aplicar manualmente tras 001 y 002. NO se ejecuta automáticamente.
-- Sección A: poblar tPensum.id_puesto resolviendo el texto Puesto contra tPuestos.nombre.

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tPensum') AND name = 'id_puesto')
BEGIN
  UPDATE p
     SET p.id_puesto = pu.id
    FROM dbo.tPensum p
    JOIN dbo.tPuestos pu
      ON LTRIM(RTRIM(LOWER(pu.nombre))) = LTRIM(RTRIM(LOWER(p.Puesto)))
   WHERE p.id_puesto IS NULL
     AND p.Puesto IS NOT NULL;

  -- Reporte de NO-match: pensums cuyo Puesto no resolvió contra tPuestos.
  SELECT p.ID, p.Nombre, p.Puesto AS PuestoSinResolver
    FROM dbo.tPensum p
   WHERE p.id_puesto IS NULL
     AND p.Puesto IS NOT NULL;
END
GO
```

**Section B — migrate still-valid legacy records into the new tables**, guarded by `IF OBJECT_ID('dbo.tCapacitados','U') IS NOT NULL AND OBJECT_ID('dbo.tCapacitadosDetalle','U') IS NOT NULL`. Inside the guard:
- Insert into `dbo.tCapAsignacion` one header per legacy "vigente" record that is **not already migrated** (dedupe on `(EmpleadoId, IdPensum, Tipo='primaria')` via `NOT EXISTS`). Map `EmpleadoId = CAST(c.ID_FH AS INT)`, `IdPensum = c.<id pensum>`, `Tipo='primaria'`, and carry over `LicenciaActiva`, `VenceLicencia`/`FechaVencimiento`, `FechaInicio`/`FechaFinaliza`, `CreadoEn = ISNULL(c.<fecha>, GETDATE())`. Only migrate rows considered **vigentes** (e.g. license still valid / not expired per the legacy flag/date — the exact predicate is confirmed in the RUNBOOK).
- Insert into `dbo.tCapAsignacionDetalle` one row per legacy detalle of the migrated headers (join legacy detalle to the freshly-inserted header by `EmpleadoId + IdPensum`), carrying `IdModulo`, `Estado`, `Puntuacion`, `Intentos` (default 0 if legacy lacks it), `CreadoEn`. Dedupe with `NOT EXISTS` on `(IdAsignacion, IdModulo)`.
- Wrap inserts so re-running the file inserts nothing the second time (idempotent via `NOT EXISTS`).

Because the legacy column names are not present in the dev schema, leave clearly-marked `-- VERIFY:` comments at each legacy column reference, and keep the whole section a no-op when the legacy tables are absent.

### RUNBOOK (append to the END of THIS plan file — see below)

Add a short runbook covering: prerequisites, apply order, verification counts, and rollback note. It is reproduced in the "RUNBOOK" section at the bottom of this plan.

### Gate
`npm run build` green (TypeScript unaffected; ensures the SQL file did not break anything and the repo still compiles). The SQL file is **not** executed. Commit `003-migracion-vigentes.sql` + runbook.

---

## Self-Review (run before declaring Plan 4a done)

- [ ] `GET /rrhh/capacitaciones/empleados/elegibles` returns only active, pensum-having, unassigned employees with a resolved `idPensum`; route declared before `:empleadoId`.
- [ ] `listar` (Asignados) returns only employees with ≥1 assignment; shape unchanged; documented whether a change was needed.
- [ ] `POST /rrhh/capacitaciones/asignaciones/:id/reabrir` resets the chosen (or all) detalles to `Pendiente/null/0`, preserves `tCapIntento`, and switches the header license off; DTO validates `idModulos` as optional int array.
- [ ] License recalc lives in **one** place (`lib/calificacion.ts::recalcularLicencia`) and both `ExamenService` and `AsignacionesService` use it; `examen.service.spec.ts` still green.
- [ ] `003-migracion-vigentes.sql` is idempotent, self-guarded for absent legacy tables, reports `Puesto` no-matches, and dedupes inserts; it is NOT executed by this plan.
- [ ] Every task committed separately; for each, `jest` (touched specs) and `npm run build` were green.
- [ ] `synchronize:false` untouched; no entity altered except (if needed) constructor repo injection; controllers keep paths without `/rrhh`.

---

## RUNBOOK — applying `003-migracion-vigentes.sql` (manual, production DBA)

**Prerequisites**
1. `001-alter-tPensum-add-id_puesto.sql` and `002-tablas-transaccionales.sql` already applied (verify: `tPensum.id_puesto` column exists; the six `tCap*` tables exist).
2. A full backup / restorable snapshot of the RH database.
3. Confirm legacy table + column names against the real schema and replace every `-- VERIFY:` marker accordingly (legacy `ID_FH`, pensum id, license flag/date, detalle columns).

**Apply order**
1. Run Section A. Capture the "PuestoSinResolver" result set; for each unresolved pensum, fix `tPuestos.nombre` or set `tPensum.id_puesto` manually, then re-run Section A (idempotent).
2. Confirm `SELECT COUNT(*) FROM dbo.tPensum WHERE Puesto IS NOT NULL AND id_puesto IS NULL` = 0 (or an accepted, documented remainder).
3. Run Section B.

**Verification (counts)**
- Headers migrated: `SELECT COUNT(*) FROM dbo.tCapAsignacion WHERE Tipo='primaria'` should equal the number of vigente legacy `tCapacitados` rows considered in-scope.
- Detalles migrated: `SELECT COUNT(*) FROM dbo.tCapAsignacionDetalle` should equal the count of legacy detalles belonging to the migrated headers.
- Spot-check 3–5 employees: license flag, vencimiento, per-módulo estado/nota match the legacy source.
- Re-run the whole file once; confirm zero new rows (idempotency proof).

**Rollback**
- Section B only inserts; rollback = `DELETE` the inserted `tCapAsignacionDetalle`/`tCapAsignacion` rows (by `CreadoEn` window or a staging marker) or restore the snapshot. Section A only sets `id_puesto`; rollback = `UPDATE tPensum SET id_puesto = NULL WHERE ...` or restore.
