# Cumplimiento de meta + salida temprana autorizada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar Meta / Ejecutado / % Cumplimiento por día en el módulo Horas Extra (UI + Excel) y, cuando un colaborador alcanza el 100% de su meta del día y sale temprano, restituir su salida programada como oficial (no penalizar la salida temprana) — para Acabados (puntos) y Producción/Rotomoldeo/Máquinas (kg, a nivel cuadrilla).

**Architecture:** Patrón BFF/agregador en el MS RH (NestJS `Microservicios/apps/domains/global/recursos-humanos`). El front (RototecRH) NUNCA toca otro servicio que `/rrhh`; el cálculo de cumplimiento se hace SERVER-SIDE dentro del MS RH (mismo DataSource → `INTRA_ROTOTEC`, ya hace `manager.query()` cross-DB) y viaja DENTRO del payload de los endpoints existentes `GET /rrhh/horas-extra/detalle` y `/detalle-todos`. El motor de horas extra (`lib/grano.ts`) aplica la regla de salida temprana. El contrato es **null-safe**: días/áreas sin cumplimiento devuelven `null` y el front pinta "—".

**Tech Stack:** Backend NestJS 10 + TypeORM (mssql, `INTRA_ROTOTEC`), jest. Frontend React 18 + Vite + TS (strict), TanStack Query/Table, SheetJS (`xlsx`). Sin gateway changes (la fila `/api/v2/rrhh → /rrhh` ya reenvía cualquier subpath).

## Global Constraints

- **Contrato canónico de campos** (idéntico en backend y front, NO renombrar): `metaDia: number|null`, `ejecutado: number|null`, `cumplimientoPct: number|null`, `cumplioMeta: boolean`, `salidaAutorizada: boolean`, `unidad: 'puntos'|'kg'|null`.
- **Regla de salida temprana** (decisión del usuario 2026-06-26): SOLO se restituye la SALIDA (egreso oficial = fin de turno). La llegada tarde SIGUE penalizando (no se toca `ingresoOficial`). NO genera horas extra por irse antes.
- **Umbral**: `cumplioMeta = metaDia>0 && ejecutado >= metaDia` (≥100% exacto, sin tolerancia; el usuario dijo "igual o mayor").
- **Acabados — ejecutado oficial** (validado contra `sp_RendimientoAcabados`): `SUM(tProductosEnAcabados.tiempo_minutos)` agrupado por `(id_empleado, fecha)`, donde la orden `tOrdenesFabricacion.Estado IN (5,7,10,11,12,13,14,15,16,17,19)` vía `pa.num_orden_fabricacion = orf.ID`. Meta = `tTurnosAcabados.MetaDia` por `(IdEmpleado, FechaDia)`. NO se hace join a `tManoObraPreciosProductos` (evita doble conteo: su `codigo_producto` tiene duplicados).
- **Producción/Rotomoldeo/Máquinas** = `fuente='MAQUINAS'` en el grano (de `tTurnosProduccion`/`tTurnosProduccionDetalle`). Cumplimiento (kg, ya per-empleado a nivel cuadrilla) desde `VW_CUMPLIMIENTO_ROTOMOLDEO` por `(id_empleado, fecha)`: `meta=SUM(programado)`, `ejecutado=SUM(ejecutado_ajustado_kg)`, `unidad='kg'`. Es una tabla materializada por batch (freshness = última corrida del SP); se LEE, nunca se ejecuta el batch.
- **PVC** (`fuente='PVC'`): NO tiene meta por empleado-día limpia (es por lote). En esta entrega PVC queda con cumplimiento `null` (UI "—", regla N/A). Decisión pendiente de negocio para una fase posterior.
- **Strict TS**: `noUnusedLocals`, `noUnusedParameters`. Todo campo nuevo del front es opcional (`?`) para render graceful.
- **DB credenciales** (solo lectura para verificación): en `Microservicios/apps/domains/global/recursos-humanos/.env` (`DB_HOST=192.168.1.108`, `DATABASE=INTRA_ROTOTEC`).

---

## File Structure

**Backend (`Microservicios/apps/domains/global/recursos-humanos/src/`):**
- `horas-extra/lib/grano.ts` — MODIFY: tipos (`ContextoDia`, `TurnoDia`?, `RegistroGrano`), `egresoOficial` (regla), `derivarRegistroDia`, `ensamblarGrano` (cumplioMeta + emisión de campos). Responsabilidad: motor puro (testeable).
- `horas-extra/lib/grano.spec.ts` — CREATE (o extender si existe): tests unitarios de la regla.
- `horas-extra/cumplimiento.service.ts` — CREATE: servicio que arma `Map<"id|fecha", {meta, ejecutado, unidad}>` con las 2 queries (acabados + rotomoldeo). Responsabilidad: acceso a datos de cumplimiento.
- `horas-extra/grano.service.ts` — MODIFY: inyectar `CumplimientoService`, cargar el mapa, pasarlo a `ensamblarGrano`.
- `horas-extra/horas-extra.service.ts` — MODIFY: `RegistroDiaHE` + `DetalleDiaHE` (campos nuevos), `enriquecerDetalle` (propagar + override de flag).
- `horas-extra/horas-extra.module.ts` — MODIFY: registrar `CumplimientoService` (provider).

**Frontend (`RototecRH/src/`):**
- `types/index.ts` — MODIFY: `DetalleDiaHE` (+6 campos opcionales).
- `pages/horas-extra/HorasExtraPage.tsx` — MODIFY: helper de formato, 3 columnas en tabla día-por-día, `colSpan`, badge en `EstadoDia`.
- `lib/exportHorasExtra.ts` — MODIFY: 3 columnas en `hojaDetalle` + reindex de la celda Estado.

---

## Task 1: Backend — CumplimientoService (acabados + rotomoldeo → mapa)

**Files:**
- Create: `Microservicios/apps/domains/global/recursos-humanos/src/horas-extra/cumplimiento.service.ts`
- Modify: `horas-extra/horas-extra.module.ts`

**Interfaces:**
- Produces: `CumplimientoService.cargarMapa(desde: string, hasta: string): Promise<Map<string, CumplimientoDia>>` donde la clave es `` `${idEmpleado}|${fecha}` `` (fecha `YYYY-MM-DD`) y `CumplimientoDia = { meta: number; ejecutado: number; unidad: 'puntos'|'kg' }`. La interfaz `CumplimientoDia` se exporta para Task 2/3.

- [ ] **Step 1: Escribir el servicio**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empleado } from '../models/entities/empleado.entity';

export interface CumplimientoDia {
  meta: number;
  ejecutado: number;
  unidad: 'puntos' | 'kg';
}

interface FilaAcabados { IdEmpleado: number; fecha: string; meta: number; ejecutado: number; }
interface FilaRoto { id_empleado: number; fecha: string; meta: number; ejecutado: number; }

@Injectable()
export class CumplimientoService {
  private readonly logger = new Logger(CumplimientoService.name);
  constructor(@InjectRepository(Empleado) private readonly empleadosRepo: Repository<Empleado>) {}

  /** Mapa (id|fecha)→cumplimiento para ACABADOS (puntos) y MAQUINAS/ROTOMOLDEO (kg). */
  async cargarMapa(desde: string, hasta: string): Promise<Map<string, CumplimientoDia>> {
    const mapa = new Map<string, CumplimientoDia>();
    const q = this.empleadosRepo.manager;

    // ACABADOS: meta = tTurnosAcabados.MetaDia; ejecutado = SUM(pa.tiempo_minutos) con
    // orf.Estado IN (5,7,10..19). Espejo exacto de sp_RendimientoAcabados (validado).
    const acabados: FilaAcabados[] = await q.query(
      `SELECT ta.IdEmpleado AS IdEmpleado,
              CONVERT(varchar(10), ta.FechaDia, 23) AS fecha,
              MAX(ta.MetaDia) AS meta,
              ISNULL((SELECT SUM(pa.tiempo_minutos)
                      FROM tProductosEnAcabados pa
                      INNER JOIN tOrdenesFabricacion orf ON pa.num_orden_fabricacion = orf.ID
                      WHERE pa.id_empleado = ta.IdEmpleado
                        AND pa.fecha = ta.FechaDia
                        AND orf.Estado IN (5,7,10,11,12,13,14,15,16,17,19)), 0) AS ejecutado
       FROM tTurnosAcabados ta
       WHERE ta.FechaDia BETWEEN @0 AND @1 AND ta.MetaDia > 0
       GROUP BY ta.IdEmpleado, ta.FechaDia`,
      [desde, hasta],
    );
    for (const r of acabados) {
      mapa.set(`${r.IdEmpleado}|${r.fecha}`, { meta: Number(r.meta), ejecutado: Number(r.ejecutado), unidad: 'puntos' });
    }

    // ROTOMOLDEO/MAQUINAS: VW_CUMPLIMIENTO_ROTOMOLDEO (materializada, ya per-empleado = cuadrilla).
    // meta = SUM(programado kg), ejecutado = SUM(ejecutado_ajustado_kg). % se recalcula en el motor.
    const roto: FilaRoto[] = await q.query(
      `SELECT id_empleado,
              CONVERT(varchar(10), fecha, 23) AS fecha,
              SUM(programado) AS meta,
              SUM(ejecutado_ajustado_kg) AS ejecutado
       FROM VW_CUMPLIMIENTO_ROTOMOLDEO
       WHERE fecha BETWEEN @0 AND @1
       GROUP BY id_empleado, fecha`,
      [desde, hasta],
    );
    for (const r of roto) {
      // No pisar acabados si por dato sucio coincidiera la clave (acabados manda).
      const k = `${r.id_empleado}|${r.fecha}`;
      if (!mapa.has(k)) mapa.set(k, { meta: Number(r.meta), ejecutado: Number(r.ejecutado), unidad: 'kg' });
    }

    this.logger.log(`cumplimiento ${desde}..${hasta}: acabados=${acabados.length} roto=${roto.length} total=${mapa.size}`);
    return mapa;
  }
}
```

- [ ] **Step 2: Registrar el provider** en `horas-extra.module.ts`: agregar `CumplimientoService` al array `providers` y, si `TypeOrmModule.forFeature([...])` no incluye `Empleado`, agregarlo (ya está, lo usa `GranoService`).

- [ ] **Step 3: Verificar build** — Run: `npm --workspace ...recursos-humanos run build` (o `nest build`). Expected: compila sin errores.

- [ ] **Step 4: Commit** — `git add` + `git commit -m "feat(rrhh): CumplimientoService (acabados puntos + rotomoldeo kg) por empleado/dia"`

---

## Task 2: Backend — Regla de salida temprana en el motor (`lib/grano.ts`)

**Files:**
- Modify: `horas-extra/lib/grano.ts`
- Test: `horas-extra/lib/grano.spec.ts`

**Interfaces:**
- Consumes: `CumplimientoDia` (Task 1).
- Produces: `ensamblarGrano(turnos, marcas, fechaInicial, fechaFinal, cumplimiento?: Map<string, CumplimientoDia>)`. `RegistroGrano` gana: `metaDia: number|null`, `ejecutado: number|null`, `cumplimientoPct: number|null`, `cumplioMeta: boolean`, `unidad: 'puntos'|'kg'|null`.

- [ ] **Step 1: Test que falla — egreso restituido cuando cumplió meta** (agregar a `grano.spec.ts`):

```ts
import { egresoOficial } from './grano';
// (egresoOficial es interno; exportarlo o testear vía ensamblarGrano. Si es privado, exportarlo.)
test('cumplioMeta: salida temprana se restituye al fin de turno', () => {
  // turno 08:00-17:00, marcó salida 15:00 (temprano), cumplió meta → egreso = 17:00:00
  expect(egresoOficial('08:00:00', '17:00:00', '08:00:00', '08:00:00', '15:00:00', true)).toBe('17:00:00');
});
test('sin cumplir meta: salida temprana se paga hasta la marca', () => {
  expect(egresoOficial('08:00:00', '17:00:00', '08:00:00', '08:00:00', '15:00:00', false)).toBe('15:00:00');
});
```

- [ ] **Step 2: Run test → FALLA** (firma vieja / comportamiento viejo). Run: `npm --workspace ...recursos-humanos run test -- grano.spec`. Expected: FAIL.

- [ ] **Step 3: Implementar.** En `lib/grano.ts`:
  1. Exportar `egresoOficial` (cambiar `function` → `export function`) y agregar parámetro `cumplioMeta: boolean` al final. Tras el guard `if (!esMarca(marcaSalida)) return turnoSalida;` insertar:
     ```ts
     // Regla 2026-06-26: si alcanzó su meta del día, no se penaliza la salida temprana:
     // el fin de turno PROGRAMADO pasa a ser el egreso OFICIAL. Solo afecta la salida (la
     // llegada tarde se sigue penalizando en ingresoOficial).
     if (cumplioMeta) return turnoSalida;
     ```
  2. `ContextoDia`: agregar `cumplioMeta?: boolean;`.
  3. `derivarRegistroDia` (línea ~144): pasar el nuevo arg →
     `const egreso = egresoOficial(turnoIngreso, turnoSalida, ingreso, marcaEntrada, ctx.marcaSalida, ctx.cumplioMeta ?? false);`
  4. `RegistroGrano`: agregar `metaDia: number | null; ejecutado: number | null; cumplimientoPct: number | null; cumplioMeta: boolean; unidad: 'puntos' | 'kg' | null;`.
  5. `ensamblarGrano`: agregar 5º parámetro `cumplimiento?: Map<string, CumplimientoDia>` (importar el tipo desde `../cumplimiento.service`). Dentro del loop por fecha, antes de `derivarRegistroDia`:
     ```ts
     const cmp = cumplimiento?.get(`${idEmpleado}|${fecha}`) ?? null;
     const metaDia = cmp ? cmp.meta : null;
     const ejecutado = cmp ? cmp.ejecutado : null;
     const cumplimientoPct = cmp && cmp.meta > 0 ? Math.round((cmp.ejecutado / cmp.meta) * 1000) / 10 : null;
     const cumplioMeta = !!cmp && cmp.meta > 0 && cmp.ejecutado >= cmp.meta;
     const unidad = cmp ? cmp.unidad : null;
     ```
     Pasar `cumplioMeta` al `ctx` de `derivarRegistroDia`, y en el `grano.push({...})` emitir `metaDia, ejecutado, cumplimientoPct, cumplioMeta, unidad`.

- [ ] **Step 4: Run test → PASA.** Run: `npm --workspace ...recursos-humanos run test -- grano.spec`. Expected: PASS. Correr TODA la suite de horas-extra para no romper paridad: `npm --workspace ...recursos-humanos run test -- horas-extra`. Expected: verde (los tests existentes no pasan `cumplimiento` → `cumplioMeta=false` → comportamiento idéntico).

- [ ] **Step 5: Commit** — `git commit -m "feat(rrhh): regla salida temprana por meta cumplida en motor HE (solo egreso)"`

---

## Task 3: Backend — Propagar al DTO + apagar el flag (`horas-extra.service.ts`)

**Files:**
- Modify: `horas-extra/horas-extra.service.ts`

**Interfaces:**
- Consumes: `RegistroGrano` campos nuevos (Task 2).
- Produces: `DetalleDiaHE` con `metaDia, ejecutado, cumplimientoPct, cumplioMeta, salidaAutorizada, unidad` + `salidaTemprano` ya neutralizado cuando `cumplioMeta`.

- [ ] **Step 1: Extender interfaces.** En `RegistroDiaHE` (16-29) agregar opcionales: `metaDia?: number | null; ejecutado?: number | null; cumplimientoPct?: number | null; cumplioMeta?: boolean; unidad?: 'puntos' | 'kg' | null;`. En `DetalleDiaHE` (34-49) agregar: `metaDia: number | null; ejecutado: number | null; cumplimientoPct: number | null; cumplioMeta: boolean; salidaAutorizada: boolean; unidad: 'puntos' | 'kg' | null;`.

- [ ] **Step 2: Modificar `enriquecerDetalle`** (213-274):
  ```ts
  const cumplioMeta = raw?.cumplioMeta ?? false;
  const salidaTempranoRaw = salidaDeltaMin != null && salidaDeltaMin < -INCONSISTENCIA_TOL_MIN;
  const salidaTemprano = salidaTempranoRaw && !cumplioMeta;          // meta cumplida → ya no es "salió temprano"
  const salidaAutorizada = salidaTempranoRaw && cumplioMeta;         // salió temprano PERO autorizado por meta
  ```
  (Reemplaza la línea 242 `const salidaTemprano = ...`.) `inconsistente` (248-255) ya excluye el caso autorizado porque usa el nuevo `salidaTemprano`. En el `return` agregar:
  ```ts
  metaDia: raw?.metaDia ?? null,
  ejecutado: raw?.ejecutado ?? null,
  cumplimientoPct: raw?.cumplimientoPct ?? null,
  cumplioMeta,
  salidaAutorizada,
  unidad: raw?.unidad ?? null,
  ```

- [ ] **Step 3: Test** — agregar a `horas-extra.service.spec.ts` un caso: un `RegistroDiaHE` con `cumplioMeta:true` + marca de salida temprana → `detalle()` devuelve `salidaTemprano===false`, `salidaAutorizada===true`, `inconsistente===false`, y `metaDia/ejecutado/cumplimientoPct` presentes. Run test → primero FALLA, luego PASA tras Step 2.

- [ ] **Step 4: Run suite completa** `npm --workspace ...recursos-humanos run test` + `build`. Expected: verde.

- [ ] **Step 5: Commit** — `git commit -m "feat(rrhh): DetalleDiaHE expone meta/ejecutado/% y salidaAutorizada; apaga salidaTemprano si cumplio meta"`

---

## Task 4: Backend — Conectar GranoService + smoke contra BD

**Files:**
- Modify: `horas-extra/grano.service.ts`

- [ ] **Step 1: Inyectar y usar `CumplimientoService`.** Constructor: agregar `private readonly cumplimientoService: CumplimientoService`. En `cargarTurnosYMarcas`, tras calcular `desde/hasta`, cargar `const cumplimiento = await this.cumplimientoService.cargarMapa(desde, hasta);` y retornarlo. En `obtenerGrano`, pasarlo: `ensamblarGrano(turnos, marcas, desde, hasta, cumplimiento)`. (Nota: `desde/hasta` ya son semanas completas; el mapa cubre todo el rango usado.)

- [ ] **Step 2: Build** `npm --workspace ...recursos-humanos run build`. Expected: OK.

- [ ] **Step 3: Smoke contra BD (read-only)** — levantar el MS (`npm --workspace ...recursos-humanos run start:dev` con su `.env`) y `GET /rrhh/horas-extra/detalle-todos?fechaInicial=2026-06-16&fechaFinal=2026-06-26` (un rango con datos de acabados). Verificar que días de empleados de acabados traen `metaDia`/`ejecutado`/`cumplimientoPct`/`unidad:'puntos'`, y empleados de rotomoldeo `unidad:'kg'`. Contrastar 2-3 valores con la pantalla CumplimientoAcabados de la Intranet / con el script `db-discovery2.js` (ya coincidió con `sp_RendimientoAcabados`).
  - Caso regla: un empleado de acabados con meta cumplida y salida temprana → `salidaTemprano:false`, `salidaAutorizada:true`, y sus efectivas == jornada programada completa.

- [ ] **Step 4: Commit** — `git commit -m "feat(rrhh): grano consume cumplimiento por empleado/dia"`

---

## Task 5: Frontend — Tipos (`types/index.ts`)

**Files:**
- Modify: `RototecRH/src/types/index.ts` (interface `DetalleDiaHE`, ~317-340)

- [ ] **Step 1:** Antes del `}` de `DetalleDiaHE` agregar (todos opcionales):
  ```ts
  metaDia?: number | null;
  ejecutado?: number | null;
  cumplimientoPct?: number | null;
  cumplioMeta?: boolean;
  salidaAutorizada?: boolean;
  unidad?: 'puntos' | 'kg' | null;
  ```
- [ ] **Step 2:** Run `npm run typecheck` en RototecRH. Expected: PASS (campos opcionales, sin literales que construyan el tipo).
- [ ] **Step 3: Commit** — `git commit -m "feat(horas-extra-fe): DetalleDiaHE con meta/ejecutado/% cumplimiento"`

---

## Task 6: Frontend — Columnas + badge (`HorasExtraPage.tsx`)

**Files:**
- Modify: `RototecRH/src/pages/horas-extra/HorasExtraPage.tsx`

- [ ] **Step 1: Helper de formato** (zona de helpers ~510-532):
  ```tsx
  const fmtCumpl = (n?: number | null, unidad?: 'puntos' | 'kg' | null) =>
    n == null ? '—' : `${Number.isInteger(n) ? n : n.toFixed(1)}${unidad === 'kg' ? ' kg' : unidad === 'puntos' ? ' pts' : ''}`;
  ```
- [ ] **Step 2: Header** — en el `TableHeader` del `DetalleDialog` (~753), entre "Efectivas" y "Estado", insertar 3 `<TableHead className="text-right">`: `Meta`, `Ejecutado`, `% Cumpl.`.
- [ ] **Step 3: Celdas** — en el map de filas (~782-822), entre la celda de Efectivas y la de Estado, insertar 3 `<TableCell className="text-right tabular-nums">`: `fmtCumpl(d.metaDia, d.unidad)`, `fmtCumpl(d.ejecutado, d.unidad)`, y `% Cumpl.` con color (`d.cumplimientoPct==null ? '—'` ; `>=100` verde `text-emerald-600`, `<100` ámbar `text-amber-600`, mostrando `Math.round(pct)+'%'`).
- [ ] **Step 4: colSpan** — subir los `colSpan={9}` de las filas skeleton/vacío DE LA TABLA DÍA-POR-DÍA (l.770 y l.777) a `colSpan={12}`. NO tocar los `colSpan` de la tabla resumen externa (l.319/326/332).
- [ ] **Step 5: Badge** — en `EstadoDia` (~552-614), donde hoy se pinta "Salió X antes" con `dia.salidaTemprano && dia.salidaDeltaMin` (~598): si `dia.salidaAutorizada` → badge verde "Salida autorizada · meta {pct}%"; else si `dia.salidaTemprano` → el badge ámbar actual.
- [ ] **Step 6:** `npm run typecheck` + `npm run build`. Expected: PASS.
- [ ] **Step 7: Commit** — `git commit -m "feat(horas-extra-fe): columnas meta/ejecutado/% + badge salida autorizada"`

---

## Task 7: Frontend — Excel detalle día-por-día (`exportHorasExtra.ts`)

**Files:**
- Modify: `RototecRH/src/lib/exportHorasExtra.ts`

- [ ] **Step 1: Columnas** — en `hojaDetalle` `cols[]` (~312-323), entre "Efectivas" y "Estado", insertar: `{ header: 'Meta', width: 11, align: 'right', num: true }`, `{ header: 'Ejecutado', width: 12, align: 'right', num: true }`, `{ header: '% Cumpl.', width: 9, align: 'right' }`.
- [ ] **Step 2: Valores** — en `vals[]` (~341-352), entre `d.efectivas` y `estadoTexto(d)`, insertar: `d.metaDia ?? ''`, `d.ejecutado ?? ''`, `d.cumplimientoPct != null ? Math.round(d.cumplimientoPct) + '%' : ''`.
- [ ] **Step 3: Reindex Estado** — la celda de Estado pasó de col 10 a 13: cambiar `r.getCell(10)` → `r.getCell(13)` (~376). En `estadoTexto` (~296-308), condicionar el push "Salió X antes" con `&& !d.salidaAutorizada` y, si `d.salidaAutorizada`, push "Salida autorizada (meta {pct}%)".
- [ ] **Step 4:** `npm run typecheck` + `npm run build`. Expected: PASS.
- [ ] **Step 5: Verificación manual** — exportar el Excel desde el módulo Horas Extra y abrir la hoja "Detalle día a día": confirmar 13 columnas, alineación, y que la columna Estado quedó en su lugar.
- [ ] **Step 6: Commit** — `git commit -m "feat(horas-extra-fe): Excel detalle dia-a-dia con meta/ejecutado/%"`

---

## Verification Plan (global)

- Backend: `npm --workspace ...recursos-humanos run test` (suite verde, incl. nuevos tests de la regla) + `build`.
- Backend smoke (BD real, read-only): `GET /rrhh/horas-extra/detalle-todos` para un rango con datos → campos presentes; acabados `unidad:'puntos'` y valores == `sp_RendimientoAcabados`; rotomoldeo `unidad:'kg'`; caso meta-cumplida → `salidaTemprano:false`, `salidaAutorizada:true`, efectivas completas.
- Caso contrario: salida temprana SIN cumplir meta → `salidaTemprano:true`, `salidaAutorizada:false`, efectivas reducidas.
- Borde: `metaDia` null/0 → `cumplimientoPct:null`, `cumplioMeta:false`, no autoriza; PVC → todo null, UI "—".
- Frontend: `npm run typecheck` + `npm run build`; smoke manual del `DetalleDialog` (columnas + colores + badge) y del Excel exportado.

## Riesgos / Notas

- **Rotomoldeo materializado**: `VW_CUMPLIMIENTO_ROTOMOLDEO` lee `tCumplimientoRotomoldeo` (poblada por batch). Para días aún no procesados el cumplimiento es 0/parcial → la regla no autoriza salida hasta que el batch corra. Es el comportamiento del sistema actual (la Intranet ve lo mismo). No ejecutar el batch desde el MS RH.
- **PVC sin meta per-empleado**: queda null en esta entrega (UI "—"). Confirmar con negocio si se quiere derivar algo a nivel día/lote en una fase posterior.
- **% rotomoldeo** usa kg ajustado (regla 40%) tal como el reporte oficial; `cumplioMeta` = `ejecutado_ajustado >= programado`.
- **Pantalla Asistencias** (`/rrhh/asistencias/verificar` + `verificacion.tsx`) muestra su propio `salioTemprano` y NO se toca en esta entrega → puede divergir del módulo Horas Extra para un día con meta cumplida. Si se requiere paridad, es una tarea adicional (replicar la regla en `asistencias.service.ts` cargando meta+ejecutado). Fuera de alcance salvo que se pida.
- **Turnos nocturnos acabados**: `pa.fecha` (DEFAULT getdate) puede caer en la madrugada del día siguiente; se replica el comportamiento del SP oficial (fiel al sistema actual).
