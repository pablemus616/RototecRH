# Carga de turnos "General" + toggle horas extra + filtro de puesto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** (A) Nuevo tipo de carga de turnos **General** para empleados con `habilitar_horas_extra=true` sin rol de producción (calculan HE sin meta); (B) toggle `habilitar_horas_extra` en el form de empleado; (C) filtro y columna de **Puesto** en la lista de empleados.

**Architecture:** BFF en MS RH. General se guarda en tabla NUEVA `tTurnosGenerales` (raw SQL vía queryRunner/manager.query, sin entidad TypeORM — mismo patrón que producción/PVC) y el grano la lee como `fuente='GENERAL'` (sin cumplimiento → meta/ejecutado null). Orden: **B → C → A** (B es precondición de A: un empleado solo es elegible-general si tiene el flag, que se enciende desde el toggle de B).

**Tech Stack:** Backend NestJS+TypeORM (MSSQL INTRA_ROTOTEC), jest. Frontend React+Vite+TS strict, RHF+Zod, TanStack Query.

## Global Constraints
- **Decisión usuario 2026-06-27:** la tabla `tTurnosGenerales` se entrega como **`.sql` versionado** (NO se aplica a prod desde aquí; el cliente lo corre). El toggle `habilitar_horas_extra` se muestra en **alta Y edición** (step compartido), default `false`.
- **Elegibles General** = `tEmpleados.esta_activo=1 AND habilitar_horas_extra=1 AND` NOT EXISTS turno en `tTurnosAcabados` ∪ `tTurnosProduccionDetalle` ∪ `RHINOTEC.dbo.tTurnosPlanificacionPVC` (CodigoEmpleado=id, confirmado 1:1).
- **Contrato:** backend serializa camelCase (`habilitarHorasExtra`), DTO acepta snake_case (`habilitar_horas_extra`). `FuenteTurno` (back y front) += `'GENERAL'`. `area` válida `1|2|3` (`@IsIn`). `aplicar()` retorna `{acabados, maquinas, generales, avisos}`.
- **forbidNonWhitelisted=true**: declarar `habilitar_horas_extra` en el DTO o el PUT da 400. Desplegar backend-B antes que front-B.
- **General NO tiene cumplimiento**: `CumplimientoService` no se toca; metaDia/ejecutado/cumplimientoPct null, cumplioMeta=false. HE se calcula por horario+marca.
- TS strict. Columna física `tEmpleados.habilitar_horas_extra` BIT ya existe (confirmado, hoy 0).

## DDL — `Microservicios/.../programacion-turnos/sql/001-tTurnosGenerales.sql`
```sql
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='tTurnosGenerales' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.tTurnosGenerales (
    ID         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tTurnosGenerales PRIMARY KEY,
    IdEmpleado INT  NOT NULL,
    FechaDia   DATE NOT NULL,
    HoraInicio TIME NULL,
    HoraFin    TIME NULL,
    Estado     TINYINT NOT NULL CONSTRAINT DF_tTurnosGenerales_Estado DEFAULT 1
  );
  CREATE INDEX IX_TG_IdEmpleado_FechaDia ON dbo.tTurnosGenerales (IdEmpleado, FechaDia);
END
```

---

## Slice B — Toggle `habilitar_horas_extra` (backend + frontend)

**Backend (`Microservicios/.../recursos-humanos/src`):**
- [ ] `models/entities/empleado.entity.ts`: tras `idPuesto`, `@Column({ name: 'habilitar_horas_extra', type: 'bit', default: false }) habilitarHorasExtra: boolean;` (patrón de `estaActivo`).
- [ ] `empleados/dto/create-employee.dto.ts`: en bloque `// Estado`, `@IsOptional() @IsBoolean() habilitar_horas_extra?: boolean;`.
- [ ] `empleados/empleados.service.ts` `updateEmployee` (objeto raw, junto a `idPuesto`): `habilitarHorasExtra: dto.habilitar_horas_extra,` (el filtro `v!==undefined` persiste `false`, omite `undefined`).
- [ ] `createEmployee` (`repository.create({...})`): `habilitarHorasExtra: createEmployeeDto.habilitar_horas_extra ?? false,`.
- [ ] GET sin cambios (serializa `habilitarHorasExtra` camelCase automáticamente).
- [ ] Verificar: `nest build`. Smoke: PUT `/empleados/:id` con `{habilitar_horas_extra:true}`→200; GET→`habilitarHorasExtra:true`.

**Frontend (`RototecRH/src`):**
- [ ] `types/index.ts`: `CreateEmpleadoInput += habilitar_horas_extra?: boolean`; `EmpleadoBackend += habilitarHorasExtra: boolean | null`.
- [ ] `lib/validators.ts`: `empleadoCreateSchema += habilitar_horas_extra: z.boolean().default(false)`; agregar a `WIZARD_STEP_FIELDS` índice 7 ('Contrato y pago').
- [ ] `pages/empleados/nuevo/fields.tsx`: crear `CheckboxField` (usa `Checkbox` de `@/components/ui/checkbox` + `watch`/`setValue` de `useFormContext`).
- [ ] `pages/empleados/nuevo/wizardSteps.tsx`: en `case 7` (Contrato y pago), `<CheckboxField name="habilitar_horas_extra" label="Habilitar horas extra" hint="Calcula horas extra aunque no tenga rol de producción" />`. (Aparece en alta y edición — decidido.)
- [ ] `pages/empleados/EmpleadoEditPage.tsx`: en `aValoresForm`, `habilitar_horas_extra: e.habilitarHorasExtra ?? false`. (NO tocar `EmpleadoFormSheet.tsx` — código muerto.)
- [ ] Verificar: `typecheck` + `build`; editar empleado → toggle prefill + persiste ON/OFF.

---

## Slice C — Filtro + columna de Puesto en la lista (frontend)

**Frontend (`RototecRH/src/pages/empleados/EmpleadosListPage.tsx`):**
- [ ] Import `usePuestoOptions` from `@/hooks/usePuestoOptions`.
- [ ] Estado: `const { options: puestoOptions } = usePuestoOptions()`; `const [filtroPuesto, setFiltroPuesto] = useState('TODOS')`; helper `puestoNombre(id) = id==null?'—':(puestoOptions.find(p=>p.id===id)?.nombre ?? String(id))`.
- [ ] Filtro en `useMemo filtered`: `if (filtroPuesto!=='TODOS' && String(e.idPuesto ?? '')!==filtroPuesto) return false;` + dep. `onChangePuesto(v){setFiltroPuesto(v);setPage(1)}`.
- [ ] UI: en la Card de filtros, `<Select>` Puesto (`TODOS` + `puestoOptions.map(p=><SelectItem value={String(p.id)}>{p.nombre}</SelectItem>)`).
- [ ] Columna: `<TableHead>Puesto</TableHead>` tras Empresa; celda `{puestoNombre(e.idPuesto)}`; subir `colSpan` 7→8 en skeleton/error/vacío.
- [ ] Verificar: `typecheck` + `build`; columna y filtro visibles (nombres, no ids; 194 sin puesto → "—").

---

## Slice A — Carga "General" área 3 (backend + frontend)

**Backend:**
- [ ] Crear `programacion-turnos/sql/001-tTurnosGenerales.sql` (ver DDL).
- [ ] `programacion.repo.ts`: `empleadosElegiblesGenerales()` (raw SQL: activo + flag + NOT EXISTS en acabados/produccion/pvc; cuadrilla=NULL; mismo shape que `empleadosElegibles`). En `contexto()`: agregar al `Promise.all`, fusionar generales en `Map empleados` solo si el id no existe, y devolver `elegiblesGenerales: Set<number>`.
- [ ] `lib/validacion.ts`: `ContextoValidacion += elegiblesGenerales: Set<number>`; `FilaTurno.idArea` → 1|2|3. En `validarFila`: early-return para `idArea===3` que solo verifica `ctx.elegiblesGenerales.has(idEmpleado)` (sin puesto/máquina/meta).
- [ ] `carga.service.ts`: `leerXlsx` detección triple (`ACABADOS`→1, `GENERAL`→3, else 2). `aplicar()`: rama DELETE `area==='3'`→`tTurnosGenerales`; rama INSERT `idArea===3`→`INSERT tTurnosGenerales(IdEmpleado,FechaDia,HoraInicio,HoraFin,Estado=1)`, contador `generales`; retorno `{acabados,maquinas,generales,avisos}`. (`parseFilas` sin cambios.)
- [ ] `plantilla.service.ts` `generar`: `general=area===3`; els = `empleadosElegiblesGenerales()`; areaTxt='GENERAL'; sin cols Meta/Turno/Máquina ni dropdowns para general.
- [ ] `programacion-turnos.controller.ts`: naming plantilla `area==='3'?'general':...`.
- [ ] `dto/rango-area.dto.ts` + `dto/carga-archivo.dto.ts`: `@IsIn(['1','2','3'])` en `area`.
- [ ] `horas-extra/lib/grano.ts`: `FuenteTurno += '| GENERAL'`.
- [ ] `horas-extra/grano.service.ts`: query `generales` desde `tTurnosGenerales` (FechaDia BETWEEN, Estado=1, CONVERT fecha/horas); push a `turnos[]` con `fuente:'GENERAL'`; ampliar conteos + log.
- [ ] Verificar: `nest build` + specs programacion-turnos/horas-extra. (Smoke end-to-end requiere correr el .sql primero.)

**Frontend:**
- [ ] `types/index.ts`: `FuenteTurno += 'GENERAL'`.
- [ ] `api/cargaTurnos.ts`: `aplicar()` retorno `{...; generales: number}`.
- [ ] `pages/carga-turnos/CargaTurnosPage.tsx`: `area` `<1|2|3>`; botón "General" (paleta sky); naming plantilla; `resultado += generales`; mensaje.
- [ ] `pages/carga-turnos/PreviewTurnosDialog.tsx`: `area` `1|2|3`; `const maquinas = area===2`; reemplazar `!acabados`→`maquinas` en cabeceras/celdas Turno/Máquina/equipo; rama badge GENERAL; General = 5 cols (Fecha/Tipo/Horario/Sistema/Estado).
- [ ] `pages/horas-extra/HorasExtraPage.tsx` (typecheck): `FuenteBadge` rama GENERAL; `FuenteFilter` opt GENERAL; `conteoFuente` `ids += GENERAL:new Set()` y Record salida += GENERAL.
- [ ] `lib/exportHorasExtra.ts`: `fuenteLabel`/`badgeFuente` += GENERAL ('General', indigo).
- [ ] Verificar: `typecheck` + `build`.

## Verificación / Riesgos
- **Riesgo alto:** front-B antes que backend-B → PUT 400 (forbidNonWhitelisted). Mitigar orden de deploy.
- **Riesgo medio:** sin fusionar generales en `contexto()`, validarFila marca "no existe" → carga General falla. (paso A-3.)
- **Riesgo medio:** `!acabados` en PreviewTurnosDialog significa "máquinas"; con 3 áreas reemplazar por `maquinas` o renderiza columnas vacías.
- **Riesgo medio (typecheck):** `FuenteTurno+='GENERAL'` sin actualizar `conteoFuente`/`FuenteFilter` rompe build strict.
- **Smoke A** end-to-end requiere aplicar el `.sql` (pendiente del cliente).
