# Plan 3 — Frontend Capacitaciones (RototecRH)

**For agentic workers.** This plan is written so an agent can execute it task-by-task with no further design decisions. Every task is bite-sized, ends in one commit, and has a concrete verification gate. Mirror the existing `turnos` module patterns cited inline; do not invent new conventions.

---

## Goal

Add a **Capacitaciones** module to the RototecRH frontend that mirrors the canonical `turnos` module (mock↔real API parity, TanStack Query hooks, shadcn UI). One sidebar item **Capacitaciones** with three tabs: **Pensums / Empleados / Reasignación**. Per-employee actions (assignment, grades, attempts, generate-exam link, license) live inside the employee DETAIL `Sheet`. Plus a **public route `/examen/:token`** (outside `RequireAuth`) that replaces the legacy exam page: an employee opens it with no login, confirms, answers single-choice questions with a countdown, and submits.

Plan 3 delivers **Pensums + Empleados + public exam + a Reasignación placeholder**. The real reassignment of expired/failed trainings (backend endpoint + wiring the third tab) is **Plan 4**; here the tab is only a static "coming in Plan 4" card.

Out of scope (Plan 4): reassignment backend/wiring, DOCX diploma generation, DB migrations. Do not touch them.

## Architecture

- React 18 + Vite 5 + TypeScript **strict** (`noUnusedLocals`, `noUnusedParameters`).
- Tailwind v3 + shadcn/ui components hand-written in `src/components/ui/` (no CLI).
- TanStack Query v5 + TanStack Table v8, React Hook Form + Zod, React Router v6 (`createBrowserRouter`).
- API layer: each `src/api/<recurso>.ts` exports `<recurso>Api = USE_MOCK ? mockApi : realApi`. `realApi` hits `rrhhApi` (axios instance with baseURL `${BASE_URL}/rrhh`, Bearer auth interceptor, `{ok,message,data}` envelope unwrap). See `src/api/client.ts` and `src/api/turnos.ts` (canonical).
- Backend (branch `feat/capacitaciones-backend` of the Microservicios repo) exposes `/rrhh/capacitaciones/...`. Since `rrhhApi` already prepends `/rrhh`, the frontend paths start at `/capacitaciones/...`.

### Backend contract (verified against compiled `dist` + `feat/capacitaciones-backend` source)

All under `rrhhApi` (so prefix `/capacitaciones`). Controllers and exact decorators:

**Pensums** (`@Controller('capacitaciones/pensums')`)
- `GET /capacitaciones/pensums` → `Pensum[]`
- `GET /capacitaciones/pensums/:id` → tree `{ id, nombre, puesto, idPuesto, modulos: [{ id, modulo, objetivo, duracionHoras, capacitador, tipoEvaluacion, instrumentos, porcentajeAprobacion, vigencia, bono, temas: [{ id, tema, modalidad, recursos }] }] }`
- `POST /capacitaciones/pensums` body `{ nombre, puesto?, idPuesto? }` → `Pensum`
- `PUT /capacitaciones/pensums/:id` body `{ nombre?, puesto?, idPuesto? }` → `Pensum`
- `DELETE /capacitaciones/pensums/:id` → `{ id }`
- `POST /capacitaciones/pensums/:id/modulos` body `{ modulo, objetivo?, duracionHoras?, capacitador?, tipoEvaluacion?, instrumentos?, porcentajeAprobacion?, vigencia?, bono? }` → `PensumModulo`
- `PUT /capacitaciones/pensums/modulos/:id` body partial of módulo → `PensumModulo`
- `DELETE /capacitaciones/pensums/modulos/:id` → `{ id }`
- `POST /capacitaciones/pensums/modulos/:id/temas` body `{ tema, modalidad?, recursos? }` → `PensumTema`
- `DELETE /capacitaciones/pensums/temas/:id` → `{ id }`

**Evaluaciones** (`@Controller('capacitaciones')`)
- `GET /capacitaciones/modulos/:id/evaluacion` → `{ evaluacion, preguntas: [{ id, idEvaluacion, pregunta, puntosPorRespuesta, idTema, respuestas: Respuesta[] }] } | null`
- `POST /capacitaciones/evaluaciones` body `{ idModulo, nombre? }` → `Evaluacion`
- `PUT /capacitaciones/evaluaciones/:id` body `{ nombre? }` → `Evaluacion`
- `DELETE /capacitaciones/evaluaciones/:id` → `{ id }`
- `POST /capacitaciones/evaluaciones/:id/preguntas` body `{ pregunta, puntosPorRespuesta?, idTema? }` → `Pregunta`
- `DELETE /capacitaciones/preguntas/:id` → `{ id }`
- `POST /capacitaciones/preguntas/:id/respuestas` body `{ respuesta, respuestaCorrecta? }` → `Respuesta`
- `DELETE /capacitaciones/respuestas/:id` → `{ id }`

**Asignaciones** (`@Controller('capacitaciones/asignaciones')`)
- `POST /capacitaciones/asignaciones` body `{ empleadoIds: number[] }` (primaria: resuelve el pensum por el puesto de cada empleado) → `unknown`
- `POST /capacitaciones/asignaciones/secundaria` body `{ empleadoId, idPensum }` → `unknown`

**Empleados** (`@Controller('capacitaciones/empleados')`)
- `GET /capacitaciones/empleados?puesto=&departamento=&estado=` → `[{ empleadoId, nombre, idPuesto, idDepartamento, estaActivo, modulosTotal, modulosAprobados, licenciaActiva }]`
- `GET /capacitaciones/empleados/:empleadoId` → `{ empleadoId, asignaciones: [{ id, idPensum, tipo, licenciaActiva, venceLicencia, fechaFinaliza, detalles: [{ id, idModulo, puntuacion, estado, intentos }] }] }`

**Examen** (`@Controller('capacitaciones')`)
- `POST /capacitaciones/examenes` body `{ idAsignacionDetalle, horasVigencia? }` → `{ token, url }` *(admin)*
- `GET /capacitaciones/examen/:token` → `{ idEvaluacion, nombre, preguntas: [{ idPregunta, pregunta, puntos, opciones: [{ idRespuesta, respuesta }] }] }` *(público, sin respuesta correcta)*
- `POST /capacitaciones/examen/:token` body `{ respuestas: [{ idPregunta, idRespuesta? }] }` → `{ puntaje, aprobado, estado: 'Pendiente'|'Aprobado'|'No aprobado' }` *(público)*

> The exam controller comments mark `GET/POST /examen/:token` as **público (sin auth)**. The employee opening that link is NOT logged in, so the frontend must call those two endpoints **without** the `Authorization` Bearer header. We add a dedicated `rrhhPublicApi` axios instance (same baseURL, envelope unwrap, **no auth request interceptor**) for them. See Task 2 + caveat in Global Constraints.

## Tech Stack quick ref

- `formatQ(n)` / `formatDate(iso)` from `@/lib/utils`. `cn(...)` for class merge.
- `toast` from `sonner` (already mounted in `App.tsx`).
- Forms: `useForm` + `zodResolver`, schemas in `@/lib/validators.ts`.
- Dialog (`@/components/ui/dialog`) for small forms; Sheet (`@/components/ui/sheet`, side right) for large drawers.
- Tabs: `Tabs/TabsList/TabsTrigger/TabsContent`. Table primitives in `@/components/ui/table`. Badge variants: `success` / `destructive` / `warning` / `secondary` / `outline`.
- Org tree: `useArbolEmpresa(empresaId)` → `DepartamentoNodo[]` (`PuestoNodo {id,nombre,codigoBiotime}`). `EmpleadoCombobox` (`@/components/ui/employee-combobox`) for picking an employee.

## Global Constraints

1. **No test runner exists.** `package.json` scripts are only `dev`, `build` (`tsc -b && vite build`), `typecheck` (`tsc --noEmit`), `preview`. **There is NO TDD here.** The gate for every task is **`npm run typecheck` green** (and `npm run build` green for tasks that add routes/pages). Do not scaffold Vitest/Jest or write `.test.ts` files.
2. **Mock↔Real parity.** `src/api/capacitaciones.ts` must define `mockApi` and `realApi` with **identical method names and signatures**, then `export const capacitacionesApi = USE_MOCK ? mockApi : realApi`. Mock seeds/persists in `localStorage` under `rototec.cap.*` keys (mirror `turnos.ts`).
3. **rrhhApi base.** `realApi` calls use paths starting `/capacitaciones/...` on `rrhhApi`. The public exam uses `rrhhPublicApi`.
4. **shadcn by hand.** All UI components needed already exist in `src/components/ui/` (dialog, sheet, tabs, table, badge, select, textarea, input, label, button, card, separator, skeleton, alert). If a future change needs a new one, copy from the official registry + add the matching `@radix-ui/*` dep to `package.json` + `npm install` — **none required for this plan.**
5. **Strict TS.** No unused locals/params, no `any` where a type exists. Reuse the response shapes from the contract above as exported interfaces in `src/types/index.ts` so api/hook/pages stay consistent.
6. **One commit per task**, message in Spanish, prefix `feat(capacitaciones):`, ending with the Co-Authored-By trailer the repo uses.
7. **`USE_MOCK` truth:** mocks are the dev default; real endpoints are wired but unverified against a live gateway. Keep both paths compiling.

## File Structure (created / edited)

```
src/
├── types/index.ts                         (EDIT: + tipos Capacitaciones)
├── lib/validators.ts                      (EDIT: + schemas Capacitaciones)
├── api/
│   ├── client.ts                          (EDIT: + export rrhhPublicApi)
│   └── capacitaciones.ts                  (NEW: mock + real, paridad)
├── hooks/useCapacitaciones.ts             (NEW: QK + queries/mutations)
├── pages/capacitaciones/
│   ├── CapacitacionesPage.tsx             (NEW: shell con Tabs)
│   ├── PensumsTab.tsx                      (NEW: lista pensums + abrir editor)
│   ├── PensumEditor.tsx                    (NEW: árbol pensum→módulos→temas + evaluación)
│   ├── ModuloEvaluacionDialog.tsx         (NEW: autoría preguntas/respuestas)
│   ├── EmpleadosTab.tsx                    (NEW: lista filtrable)
│   ├── EmpleadoCapDetailSheet.tsx         (NEW: asignación/notas/intentos/examen/licencia)
│   ├── ReasignacionTab.tsx                (NEW: asignación primaria por puesto)
│   └── ExamenPublicoPage.tsx              (NEW: ruta pública /examen/:token)
├── router.tsx                             (EDIT: ruta protegida + pública)
└── components/layout/AppShell.tsx         (EDIT: NAV item)
```

---

## Task 1 — Tipos + validators

**Files:** `src/types/index.ts` (append), `src/lib/validators.ts` (append).

**Interfaces produced (consumed by Tasks 2–8):**

```ts
// types
Pensum, PensumArbol, PensumModuloArbol, PensumTemaArbol,
PensumInput, ModuloInput, TemaInput,
Evaluacion, Pregunta, Respuesta, EvaluacionDetalle,
EvaluacionInput, PreguntaInput, RespuestaInput,
EmpleadoCapResumen, EmpleadoCapDetalle, AsignacionCap, AsignacionDetalleCap,
GenerarExamenInput, GenerarExamenResult,
ExamenPublico, ExamenPreguntaPublica, ExamenOpcion, EnviarRespuestasInput, ResultadoExamen,
EstadoModulo
// validators
pensumSchema, moduloSchema, temaSchema, evaluacionSchema, preguntaSchema, respuestaSchema,
asignacionSecundariaSchema, generarExamenSchema
```

Append to `src/types/index.ts`:

```ts
// =====================================================
// CAPACITACIONES
// =====================================================
export type EstadoModulo = 'Pendiente' | 'Aprobado' | 'No aprobado'

export interface Pensum {
  id: number
  nombre: string
  puesto: string | null
  idPuesto: number | null
}

export interface PensumTemaArbol {
  id: number
  tema: string | null
  modalidad: string | null
  recursos: string | null
}
export interface PensumModuloArbol {
  id: number
  modulo: string
  objetivo: string | null
  duracionHoras: number | null
  capacitador: number | null
  tipoEvaluacion: string | null
  instrumentos: string | null
  porcentajeAprobacion: number | null
  vigencia: number | null
  bono: boolean | null
  temas: PensumTemaArbol[]
}
export interface PensumArbol {
  id: number
  nombre: string
  puesto: string | null
  idPuesto: number | null
  modulos: PensumModuloArbol[]
}

export interface PensumInput {
  nombre: string
  puesto?: string
  idPuesto?: number
}
export interface ModuloInput {
  modulo: string
  objetivo?: string
  duracionHoras?: number
  capacitador?: number
  tipoEvaluacion?: string
  instrumentos?: string
  porcentajeAprobacion?: number
  vigencia?: number
  bono?: boolean
}
export interface TemaInput {
  tema: string
  modalidad?: string
  recursos?: string
}

export interface Respuesta {
  id: number
  idPregunta: number
  respuesta: string
  respuestaCorrecta: boolean | null
}
export interface Pregunta {
  id: number
  idEvaluacion: number
  pregunta: string
  puntosPorRespuesta: number | null
  idTema: number | null
  respuestas: Respuesta[]
}
export interface Evaluacion {
  id: number
  idModulo: number
  nombre: string | null
}
export interface EvaluacionDetalle {
  evaluacion: Evaluacion
  preguntas: Pregunta[]
}

export interface EvaluacionInput {
  idModulo: number
  nombre?: string
}
export interface PreguntaInput {
  pregunta: string
  puntosPorRespuesta?: number
  idTema?: number
}
export interface RespuestaInput {
  respuesta: string
  respuestaCorrecta?: boolean
}

export interface EmpleadoCapResumen {
  empleadoId: number
  nombre: string
  idPuesto: number | null
  idDepartamento: number | null
  estaActivo: boolean
  modulosTotal: number
  modulosAprobados: number
  licenciaActiva: boolean
}
export interface AsignacionDetalleCap {
  id: number
  idModulo: number
  puntuacion: number | null
  estado: string
  intentos: number
}
export interface AsignacionCap {
  id: number
  idPensum: number
  tipo: string
  licenciaActiva: boolean
  venceLicencia: string | null
  fechaFinaliza: string | null
  detalles: AsignacionDetalleCap[]
}
export interface EmpleadoCapDetalle {
  empleadoId: number
  asignaciones: AsignacionCap[]
}

export interface GenerarExamenInput {
  idAsignacionDetalle: number
  horasVigencia?: number
}
export interface GenerarExamenResult {
  token: string
  url: string
}

export interface ExamenOpcion {
  idRespuesta: number
  respuesta: string
}
export interface ExamenPreguntaPublica {
  idPregunta: number
  pregunta: string
  puntos: number | null
  opciones: ExamenOpcion[]
}
export interface ExamenPublico {
  idEvaluacion: number
  nombre: string | null
  preguntas: ExamenPreguntaPublica[]
}
export interface EnviarRespuestasInput {
  respuestas: { idPregunta: number; idRespuesta: number | null }[]
}
export interface ResultadoExamen {
  puntaje: number
  aprobado: boolean
  estado: EstadoModulo
}
```

Append to `src/lib/validators.ts` (mirror existing `.optional().or(z.literal(''))` style; numbers use `z.coerce.number()`):

```ts
// =====================================================
// CAPACITACIONES
// =====================================================
const optStr = (max = 200) => z.string().max(max).optional().or(z.literal(''))

export const pensumSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(120),
  idPuesto: z.coerce.number().int().positive().optional(),
  puesto: optStr(120),
})
export type PensumFormValues = z.infer<typeof pensumSchema>

export const moduloSchema = z.object({
  modulo: z.string().min(1, 'Requerido').max(160),
  objetivo: optStr(500),
  duracionHoras: z.coerce.number().min(0).max(999).optional(),
  capacitador: z.coerce.number().int().positive().optional(),
  tipoEvaluacion: optStr(80),
  instrumentos: optStr(300),
  porcentajeAprobacion: z.coerce.number().min(0).max(100).optional(),
  vigencia: z.coerce.number().int().min(0).max(120).optional(),
  bono: z.boolean().optional(),
})
export type ModuloFormValues = z.infer<typeof moduloSchema>

export const temaSchema = z.object({
  tema: z.string().min(1, 'Requerido').max(200),
  modalidad: optStr(80),
  recursos: optStr(300),
})
export type TemaFormValues = z.infer<typeof temaSchema>

export const evaluacionSchema = z.object({
  nombre: optStr(160),
})
export type EvaluacionFormValues = z.infer<typeof evaluacionSchema>

export const preguntaSchema = z.object({
  pregunta: z.string().min(1, 'Requerido').max(500),
  puntosPorRespuesta: z.coerce.number().min(0).max(100).optional(),
  idTema: z.coerce.number().int().positive().optional(),
})
export type PreguntaFormValues = z.infer<typeof preguntaSchema>

export const respuestaSchema = z.object({
  respuesta: z.string().min(1, 'Requerido').max(300),
  respuestaCorrecta: z.boolean().optional(),
})
export type RespuestaFormValues = z.infer<typeof respuestaSchema>

export const asignacionSecundariaSchema = z.object({
  idPensum: z.coerce.number().int().positive('Selecciona un pensum'),
})
export type AsignacionSecundariaFormValues = z.infer<typeof asignacionSecundariaSchema>

export const generarExamenSchema = z.object({
  horasVigencia: z.coerce.number().int().min(1).max(720).optional(),
})
export type GenerarExamenFormValues = z.infer<typeof generarExamenSchema>
```

> Note: `z` and `isoDate` already imported/defined in `validators.ts`. Do not re-import.

**Gate:** `npm run typecheck` green (the new types/schemas are unused so far → strict allows unused **exports**; only unused *locals* fail. `optStr` is used. OK).
**Commit:** `feat(capacitaciones): tipos y validators`.

---

## Task 2 — `rrhhPublicApi` + `api/capacitaciones.ts` (mock + real, paridad)

**Files:** `src/api/client.ts` (add public instance), `src/api/capacitaciones.ts` (NEW).

### 2a. `client.ts` — add a no-auth instance for the public exam

After the `rrhhApi` block, before `export const USE_MOCK`, add:

```ts
// Instancia PÚBLICA para el examen por token (sin Bearer). El empleado que abre
// /examen/:token NO está autenticado; el backend marca GET/POST /examen/:token
// como públicos. Reusa baseURL y el unwrap de { ok, message, data } pero NO
// inyecta Authorization. Si el gateway exigiera auth a nivel de ruteo, este es el
// único punto a ajustar (p.ej. un prefijo público dedicado).
export const rrhhPublicApi = axios.create({
  baseURL: `${BASE_URL}/rrhh`,
  headers: { 'Content-Type': 'application/json' },
})
attachInterceptors(rrhhPublicApi, { unwrapEnvelope: true, skipAuth: true })
```

Update `attachInterceptors` signature + request interceptor to honor `skipAuth`:

```ts
function attachInterceptors(
  instance: AxiosInstance,
  opts: { unwrapEnvelope?: boolean; skipAuth?: boolean } = {},
) {
  if (!opts.skipAuth) {
    instance.interceptors.request.use((config) => {
      const token = getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })
  }
  // ...response interceptor unchanged...
}
```

(The 401-redirect logic in the response interceptor stays; for the public instance a 401 with no token simply rejects to the page's `onError` — `getToken()` is falsy so no redirect fires.)

### 2b. `src/api/capacitaciones.ts` (NEW)

Full file — mock persists in `localStorage` (`rototec.cap.*`), real hits `rrhhApi` / `rrhhPublicApi`. Both objects share the exact same method set.

```ts
import {
  rrhhApi as api,
  rrhhPublicApi as publicApi,
  USE_MOCK,
} from './client'
import type {
  Pensum, PensumArbol, PensumInput, ModuloInput, TemaInput,
  PensumModuloArbol, PensumTemaArbol,
  Evaluacion, EvaluacionDetalle, EvaluacionInput,
  Pregunta, PreguntaInput, Respuesta, RespuestaInput,
  EmpleadoCapResumen, EmpleadoCapDetalle,
  GenerarExamenInput, GenerarExamenResult,
  ExamenPublico, EnviarRespuestasInput, ResultadoExamen, EstadoModulo,
} from '@/types'

// ============ Storage (mock) ============
const K = {
  pensums: 'rototec.cap.pensums.v1',
  modulos: 'rototec.cap.modulos.v1',
  temas: 'rototec.cap.temas.v1',
  evals: 'rototec.cap.evaluaciones.v1',
  preguntas: 'rototec.cap.preguntas.v1',
  respuestas: 'rototec.cap.respuestas.v1',
  empleados: 'rototec.cap.empleados.v1',
  tokens: 'rototec.cap.tokens.v1',
}
function read<T>(key: string, seed: () => T[] = () => []): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) { const s = seed(); if (s.length) window.localStorage.setItem(key, JSON.stringify(s)); return s }
    const p = JSON.parse(raw) as T[]
    return Array.isArray(p) ? p : []
  } catch { return [] }
}
function write<T>(key: string, data: T[]) { window.localStorage.setItem(key, JSON.stringify(data)) }
function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1
}
function delay(ms = 120) { return new Promise((r) => setTimeout(r, ms)) }

// Mock raw rows
interface ModuloRow extends ModuloInput { id: number; idPensum: number }
interface TemaRow extends TemaInput { id: number; idModulo: number }

function seedPensums(): Pensum[] {
  return [{ id: 1, nombre: 'Inducción Operario', puesto: 'Operario', idPuesto: null }]
}
function seedModulos(): ModuloRow[] {
  return [{ id: 1, idPensum: 1, modulo: 'Seguridad básica', objetivo: 'Conocer EPP', porcentajeAprobacion: 70, bono: false }]
}

// ============ Mock helpers to build trees ============
function buildPensumArbol(p: Pensum): PensumArbol {
  const modulos = read<ModuloRow>(K.modulos, seedModulos).filter((m) => m.idPensum === p.id)
  const temas = read<TemaRow>(K.temas)
  const modulosArbol: PensumModuloArbol[] = modulos.map((m) => ({
    id: m.id, modulo: m.modulo, objetivo: m.objetivo ?? null,
    duracionHoras: m.duracionHoras ?? null, capacitador: m.capacitador ?? null,
    tipoEvaluacion: m.tipoEvaluacion ?? null, instrumentos: m.instrumentos ?? null,
    porcentajeAprobacion: m.porcentajeAprobacion ?? null, vigencia: m.vigencia ?? null,
    bono: m.bono ?? null,
    temas: temas.filter((t) => t.idModulo === m.id).map<PensumTemaArbol>((t) => ({
      id: t.id, tema: t.tema ?? null, modalidad: t.modalidad ?? null, recursos: t.recursos ?? null,
    })),
  }))
  return { id: p.id, nombre: p.nombre, puesto: p.puesto, idPuesto: p.idPuesto, modulos: modulosArbol }
}

// ============ MOCK API ============
const mockApi = {
  // -- Pensums --
  async listPensums(): Promise<Pensum[]> { await delay(); return read<Pensum>(K.pensums, seedPensums) },
  async getPensum(id: number): Promise<PensumArbol> {
    await delay()
    const p = read<Pensum>(K.pensums, seedPensums).find((x) => x.id === id)
    if (!p) throw new Error('Pensum no encontrado')
    return buildPensumArbol(p)
  },
  async createPensum(input: PensumInput): Promise<Pensum> {
    await delay()
    const rows = read<Pensum>(K.pensums, seedPensums)
    const nuevo: Pensum = { id: nextId(rows), nombre: input.nombre, puesto: input.puesto ?? null, idPuesto: input.idPuesto ?? null }
    write(K.pensums, [nuevo, ...rows]); return nuevo
  },
  async updatePensum(id: number, input: PensumInput): Promise<Pensum> {
    await delay()
    const rows = read<Pensum>(K.pensums, seedPensums)
    const i = rows.findIndex((x) => x.id === id); if (i === -1) throw new Error('Pensum no encontrado')
    rows[i] = { ...rows[i], nombre: input.nombre, puesto: input.puesto ?? rows[i].puesto, idPuesto: input.idPuesto ?? rows[i].idPuesto }
    write(K.pensums, rows); return rows[i]
  },
  async deletePensum(id: number): Promise<{ id: number }> {
    await delay(); write(K.pensums, read<Pensum>(K.pensums, seedPensums).filter((x) => x.id !== id)); return { id }
  },
  // -- Módulos --
  async createModulo(idPensum: number, input: ModuloInput): Promise<PensumModuloArbol> {
    await delay()
    const rows = read<ModuloRow>(K.modulos, seedModulos)
    const row: ModuloRow = { ...input, id: nextId(rows), idPensum }
    write(K.modulos, [...rows, row])
    return { id: row.id, modulo: row.modulo, objetivo: row.objetivo ?? null, duracionHoras: row.duracionHoras ?? null, capacitador: row.capacitador ?? null, tipoEvaluacion: row.tipoEvaluacion ?? null, instrumentos: row.instrumentos ?? null, porcentajeAprobacion: row.porcentajeAprobacion ?? null, vigencia: row.vigencia ?? null, bono: row.bono ?? null, temas: [] }
  },
  async updateModulo(id: number, input: ModuloInput): Promise<{ id: number }> {
    await delay()
    const rows = read<ModuloRow>(K.modulos, seedModulos)
    const i = rows.findIndex((x) => x.id === id); if (i === -1) throw new Error('Módulo no encontrado')
    rows[i] = { ...rows[i], ...input }; write(K.modulos, rows); return { id }
  },
  async deleteModulo(id: number): Promise<{ id: number }> {
    await delay(); write(K.modulos, read<ModuloRow>(K.modulos, seedModulos).filter((x) => x.id !== id)); return { id }
  },
  // -- Temas --
  async createTema(idModulo: number, input: TemaInput): Promise<PensumTemaArbol> {
    await delay()
    const rows = read<TemaRow>(K.temas)
    const row: TemaRow = { ...input, id: nextId(rows), idModulo }
    write(K.temas, [...rows, row])
    return { id: row.id, tema: row.tema ?? null, modalidad: row.modalidad ?? null, recursos: row.recursos ?? null }
  },
  async deleteTema(id: number): Promise<{ id: number }> {
    await delay(); write(K.temas, read<TemaRow>(K.temas).filter((x) => x.id !== id)); return { id }
  },
  // -- Evaluación / preguntas / respuestas --
  async getEvaluacion(idModulo: number): Promise<EvaluacionDetalle | null> {
    await delay()
    const ev = read<Evaluacion>(K.evals).find((e) => e.idModulo === idModulo)
    if (!ev) return null
    const preguntas = read<Pregunta>(K.preguntas).filter((p) => p.idEvaluacion === ev.id)
    const resp = read<Respuesta>(K.respuestas)
    return { evaluacion: ev, preguntas: preguntas.map((p) => ({ ...p, respuestas: resp.filter((r) => r.idPregunta === p.id) })) }
  },
  async createEvaluacion(input: EvaluacionInput): Promise<Evaluacion> {
    await delay()
    const rows = read<Evaluacion>(K.evals)
    const ev: Evaluacion = { id: nextId(rows), idModulo: input.idModulo, nombre: input.nombre ?? null }
    write(K.evals, [...rows, ev]); return ev
  },
  async updateEvaluacion(id: number, nombre: string | undefined): Promise<Evaluacion> {
    await delay()
    const rows = read<Evaluacion>(K.evals); const i = rows.findIndex((e) => e.id === id)
    if (i === -1) throw new Error('Evaluación no encontrada')
    rows[i] = { ...rows[i], nombre: nombre ?? rows[i].nombre }; write(K.evals, rows); return rows[i]
  },
  async deleteEvaluacion(id: number): Promise<{ id: number }> {
    await delay(); write(K.evals, read<Evaluacion>(K.evals).filter((e) => e.id !== id)); return { id }
  },
  async createPregunta(idEvaluacion: number, input: PreguntaInput): Promise<Pregunta> {
    await delay()
    const rows = read<Pregunta>(K.preguntas)
    const p: Pregunta = { id: nextId(rows), idEvaluacion, pregunta: input.pregunta, puntosPorRespuesta: input.puntosPorRespuesta ?? null, idTema: input.idTema ?? null, respuestas: [] }
    write(K.preguntas, [...rows, p]); return p
  },
  async deletePregunta(id: number): Promise<{ id: number }> {
    await delay(); write(K.preguntas, read<Pregunta>(K.preguntas).filter((p) => p.id !== id)); return { id }
  },
  async createRespuesta(idPregunta: number, input: RespuestaInput): Promise<Respuesta> {
    await delay()
    const rows = read<Respuesta>(K.respuestas)
    const r: Respuesta = { id: nextId(rows), idPregunta, respuesta: input.respuesta, respuestaCorrecta: input.respuestaCorrecta ?? false }
    write(K.respuestas, [...rows, r]); return r
  },
  async deleteRespuesta(id: number): Promise<{ id: number }> {
    await delay(); write(K.respuestas, read<Respuesta>(K.respuestas).filter((r) => r.id !== id)); return { id }
  },
  // -- Asignaciones --
  async asignarPrimaria(empleadoIds: number[]): Promise<{ ok: true }> { await delay(); void empleadoIds; return { ok: true } },
  async asignarSecundaria(empleadoId: number, idPensum: number): Promise<{ ok: true }> { await delay(); void empleadoId; void idPensum; return { ok: true } },
  // -- Empleados --
  async listEmpleados(filtros?: { puesto?: string; departamento?: string; estado?: string }): Promise<EmpleadoCapResumen[]> {
    await delay(); void filtros
    return read<EmpleadoCapResumen>(K.empleados, () => [
      { empleadoId: 1, nombre: 'María García', idPuesto: 1, idDepartamento: 1, estaActivo: true, modulosTotal: 3, modulosAprobados: 1, licenciaActiva: false },
    ])
  },
  async getEmpleado(empleadoId: number): Promise<EmpleadoCapDetalle> {
    await delay()
    return { empleadoId, asignaciones: [] }
  },
  // -- Examen (admin genera) --
  async generarExamen(input: GenerarExamenInput): Promise<GenerarExamenResult> {
    await delay()
    const token = `tok-${input.idAsignacionDetalle}-${Date.now().toString(36)}`
    return { token, url: `${window.location.origin}/examen/${token}` }
  },
  // -- Examen público --
  async getExamenPublico(token: string): Promise<ExamenPublico> {
    await delay()
    void token
    return { idEvaluacion: 1, nombre: 'Examen de prueba (mock)', preguntas: [
      { idPregunta: 1, pregunta: '¿Qué es EPP?', puntos: 50, opciones: [
        { idRespuesta: 1, respuesta: 'Equipo de protección personal' },
        { idRespuesta: 2, respuesta: 'Examen previo de planta' },
      ] },
    ] }
  },
  async enviarExamen(token: string, input: EnviarRespuestasInput): Promise<ResultadoExamen> {
    await delay(); void token
    const correctas = input.respuestas.filter((r) => r.idRespuesta === 1).length
    const puntaje = correctas * 50
    const estado: EstadoModulo = puntaje >= 70 ? 'Aprobado' : 'No aprobado'
    return { puntaje, aprobado: estado === 'Aprobado', estado }
  },
}

// ============ REAL API ============
const realApi: typeof mockApi = {
  async listPensums() { const { data } = await api.get<Pensum[]>('/capacitaciones/pensums'); return data },
  async getPensum(id) { const { data } = await api.get<PensumArbol>(`/capacitaciones/pensums/${id}`); return data },
  async createPensum(input) { const { data } = await api.post<Pensum>('/capacitaciones/pensums', input); return data },
  async updatePensum(id, input) { const { data } = await api.put<Pensum>(`/capacitaciones/pensums/${id}`, input); return data },
  async deletePensum(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/${id}`); return data },
  async createModulo(idPensum, input) { const { data } = await api.post<PensumModuloArbol>(`/capacitaciones/pensums/${idPensum}/modulos`, input); return data },
  async updateModulo(id, input) { const { data } = await api.put<{ id: number }>(`/capacitaciones/pensums/modulos/${id}`, input); return data },
  async deleteModulo(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/modulos/${id}`); return data },
  async createTema(idModulo, input) { const { data } = await api.post<PensumTemaArbol>(`/capacitaciones/pensums/modulos/${idModulo}/temas`, input); return data },
  async deleteTema(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/temas/${id}`); return data },
  async getEvaluacion(idModulo) { const { data } = await api.get<EvaluacionDetalle | null>(`/capacitaciones/modulos/${idModulo}/evaluacion`); return data },
  async createEvaluacion(input) { const { data } = await api.post<Evaluacion>('/capacitaciones/evaluaciones', input); return data },
  async updateEvaluacion(id, nombre) { const { data } = await api.put<Evaluacion>(`/capacitaciones/evaluaciones/${id}`, { nombre }); return data },
  async deleteEvaluacion(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/evaluaciones/${id}`); return data },
  async createPregunta(idEvaluacion, input) { const { data } = await api.post<Pregunta>(`/capacitaciones/evaluaciones/${idEvaluacion}/preguntas`, input); return data },
  async deletePregunta(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/preguntas/${id}`); return data },
  async createRespuesta(idPregunta, input) { const { data } = await api.post<Respuesta>(`/capacitaciones/preguntas/${idPregunta}/respuestas`, input); return data },
  async deleteRespuesta(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/respuestas/${id}`); return data },
  async asignarPrimaria(empleadoIds) { const { data } = await api.post<{ ok: true }>('/capacitaciones/asignaciones', { empleadoIds }); return data },
  async asignarSecundaria(empleadoId, idPensum) { const { data } = await api.post<{ ok: true }>('/capacitaciones/asignaciones/secundaria', { empleadoId, idPensum }); return data },
  async listEmpleados(filtros) {
    const { data } = await api.get<EmpleadoCapResumen[]>('/capacitaciones/empleados', { params: filtros })
    return data
  },
  async getEmpleado(empleadoId) { const { data } = await api.get<EmpleadoCapDetalle>(`/capacitaciones/empleados/${empleadoId}`); return data },
  async generarExamen(input) { const { data } = await api.post<GenerarExamenResult>('/capacitaciones/examenes', input); return data },
  async getExamenPublico(token) { const { data } = await publicApi.get<ExamenPublico>(`/capacitaciones/examen/${token}`); return data },
  async enviarExamen(token, input) { const { data } = await publicApi.post<ResultadoExamen>(`/capacitaciones/examen/${token}`, input); return data },
}

export const capacitacionesApi = USE_MOCK ? mockApi : realApi
```

> Type-consistency note: `realApi: typeof mockApi` forces method-set parity at compile time (the same trick `estructura.ts` uses with `mockApi: typeof realApi`). The mock returns `{ ok: true }` for assignments so both shapes match.

**Gate:** `npm run typecheck` green.
**Commit:** `feat(capacitaciones): capa api mock+real + instancia publica de examen`.

---

## Task 3 — Hook `useCapacitaciones.ts` (QK + queries/mutations)

**File:** `src/hooks/useCapacitaciones.ts` (NEW). Mirror `useTurnos.ts`: `QK` constant, `useQuery`/`useMutation`, `onSuccess` invalidate.

**Interfaces consumed:** all from Task 1 + `capacitacionesApi` from Task 2.

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { capacitacionesApi as cap } from '@/api/capacitaciones'
import type {
  PensumInput, ModuloInput, TemaInput, EvaluacionInput, PreguntaInput, RespuestaInput,
  GenerarExamenInput,
} from '@/types'

const QK = {
  pensums: ['cap', 'pensums'] as const,
  pensum: (id: number) => ['cap', 'pensums', id] as const,
  evaluacion: (idModulo: number) => ['cap', 'evaluacion', idModulo] as const,
  empleados: (f?: { puesto?: string; departamento?: string; estado?: string }) =>
    ['cap', 'empleados', f ?? {}] as const,
  empleado: (id: number) => ['cap', 'empleados', id] as const,
}

// ---------- Pensums ----------
export function usePensums() {
  return useQuery({ queryKey: QK.pensums, queryFn: () => cap.listPensums() })
}
export function usePensumArbol(id: number | undefined) {
  return useQuery({ queryKey: QK.pensum(id ?? 0), queryFn: () => cap.getPensum(id as number), enabled: Boolean(id) })
}
export function useCreatePensum() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: PensumInput) => cap.createPensum(input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensums }) })
}
export function useUpdatePensum(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: PensumInput) => cap.updatePensum(id, input), onSuccess: () => { qc.invalidateQueries({ queryKey: QK.pensums }); qc.invalidateQueries({ queryKey: QK.pensum(id) }) } })
}
export function useDeletePensum() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deletePensum(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensums }) })
}

// ---------- Módulos / Temas (invalidan el árbol del pensum) ----------
export function useCreateModulo(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: ModuloInput) => cap.createModulo(idPensum, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}
export function useUpdateModulo(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: ModuloInput }) => cap.updateModulo(id, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}
export function useDeleteModulo(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deleteModulo(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}
export function useCreateTema(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ idModulo, input }: { idModulo: number; input: TemaInput }) => cap.createTema(idModulo, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}
export function useDeleteTema(idPensum: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deleteTema(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.pensum(idPensum) }) })
}

// ---------- Evaluación ----------
export function useEvaluacion(idModulo: number | undefined) {
  return useQuery({ queryKey: QK.evaluacion(idModulo ?? 0), queryFn: () => cap.getEvaluacion(idModulo as number), enabled: Boolean(idModulo) })
}
export function useCreateEvaluacion(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: EvaluacionInput) => cap.createEvaluacion(input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useDeleteEvaluacion(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deleteEvaluacion(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useCreatePregunta(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ idEvaluacion, input }: { idEvaluacion: number; input: PreguntaInput }) => cap.createPregunta(idEvaluacion, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useDeletePregunta(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deletePregunta(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useCreateRespuesta(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ idPregunta, input }: { idPregunta: number; input: RespuestaInput }) => cap.createRespuesta(idPregunta, input), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}
export function useDeleteRespuesta(idModulo: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => cap.deleteRespuesta(id), onSuccess: () => qc.invalidateQueries({ queryKey: QK.evaluacion(idModulo) }) })
}

// ---------- Empleados / asignaciones / examen ----------
export function useEmpleadosCap(filtros?: { puesto?: string; departamento?: string; estado?: string }) {
  return useQuery({ queryKey: QK.empleados(filtros), queryFn: () => cap.listEmpleados(filtros) })
}
export function useEmpleadoCap(empleadoId: number | undefined) {
  return useQuery({ queryKey: QK.empleado(empleadoId ?? 0), queryFn: () => cap.getEmpleado(empleadoId as number), enabled: Boolean(empleadoId) })
}
export function useAsignarPrimaria() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (empleadoIds: number[]) => cap.asignarPrimaria(empleadoIds), onSuccess: () => qc.invalidateQueries({ queryKey: ['cap', 'empleados'] }) })
}
export function useAsignarSecundaria(empleadoId: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (idPensum: number) => cap.asignarSecundaria(empleadoId, idPensum), onSuccess: () => { qc.invalidateQueries({ queryKey: QK.empleado(empleadoId) }); qc.invalidateQueries({ queryKey: ['cap', 'empleados'] }) } })
}
export function useGenerarExamen() {
  return useMutation({ mutationFn: (input: GenerarExamenInput) => cap.generarExamen(input) })
}
```

**Gate:** `npm run typecheck` green.
**Commit:** `feat(capacitaciones): hooks useCapacitaciones (queries + mutations)`.

---

## Task 4 — Router + NAV + `CapacitacionesPage` shell con tabs

**Files:** `src/router.tsx` (edit), `src/components/layout/AppShell.tsx` (edit), `src/pages/capacitaciones/CapacitacionesPage.tsx` (NEW). Tabs initially render placeholders; real tab bodies arrive in Tasks 5–7.

### 4a. `router.tsx`

- Add imports:
```ts
import CapacitacionesPage from '@/pages/capacitaciones/CapacitacionesPage'
import ExamenPublicoPage from '@/pages/capacitaciones/ExamenPublicoPage'
```
- Add a protected child (next to `turnos`): `{ path: 'capacitaciones', element: <CapacitacionesPage /> },`
- Add a **public sibling** of `/login` (outside `RequireAuth`): in the top-level array, after the `/login` entry add `{ path: '/examen/:token', element: <ExamenPublicoPage /> },`

> `ExamenPublicoPage` is created in Task 8; until then add a temporary 1-line stub `export default function ExamenPublicoPage(){return null}` in that file so the build passes, then flesh it out in Task 8. (Or reorder: do Task 8's file creation first. Either way the route import must resolve.)

### 4b. `AppShell.tsx`

- Import an icon: add `GraduationCap` to the `lucide-react` import.
- Add to `NAV` (e.g. after Turnos): `{ to: '/capacitaciones', label: 'Capacitaciones', icon: GraduationCap },`

### 4c. `CapacitacionesPage.tsx`

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PensumsTab from './PensumsTab'
import EmpleadosTab from './EmpleadosTab'
import ReasignacionTab from './ReasignacionTab'

export default function CapacitacionesPage() {
  return (
    <Tabs defaultValue="pensums" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pensums">Pensums</TabsTrigger>
        <TabsTrigger value="empleados">Empleados</TabsTrigger>
        <TabsTrigger value="reasignacion">Reasignación</TabsTrigger>
      </TabsList>
      <TabsContent value="pensums"><PensumsTab /></TabsContent>
      <TabsContent value="empleados"><EmpleadosTab /></TabsContent>
      <TabsContent value="reasignacion"><ReasignacionTab /></TabsContent>
    </Tabs>
  )
}
```

> Create minimal stub files for `PensumsTab.tsx`, `EmpleadosTab.tsx`, `ReasignacionTab.tsx` exporting `export default function X(){return <div className="text-sm text-muted-foreground">Próximamente</div>}` so this task builds. Tasks 5–7 replace them.

**Gate:** `npm run build` green; manual: `/capacitaciones` shows 3 tabs, sidebar item present; `/examen/x` resolves outside auth.
**Commit:** `feat(capacitaciones): ruta protegida + ruta publica de examen + shell con tabs`.

---

## Task 5 — PensumsTab + PensumEditor + autoría de evaluación

**Files:** `src/pages/capacitaciones/PensumsTab.tsx`, `PensumEditor.tsx`, `ModuloEvaluacionDialog.tsx` (replace stubs / create).

**Behaviour:**
- `PensumsTab`: table of pensums (mirror `TurnosListPage`): columns Nombre, Puesto, # módulos (from list, no count → omit or fetch tree on expand), Acciones (Editar, Eliminar). A "Nuevo pensum" button opens a `Dialog` (`PensumFormDialog`, small) with `pensumSchema` (nombre + optional puesto via free text OR `idPuesto` selected from org tree). Clicking a row opens `PensumEditor` (large → `Sheet` side right).
- `PensumEditor` (Sheet): loads `usePensumArbol(id)`. Renders módulos as cards; each module has inline fields summary, buttons: Editar módulo (Dialog `moduloSchema`), Eliminar módulo, "Temas" (add via Dialog `temaSchema`, list with delete), and "Evaluación" (opens `ModuloEvaluacionDialog`). "Agregar módulo" button at top (Dialog `moduloSchema`). Use mutations from Task 3 keyed by `idPensum` so the tree invalidates.
- `ModuloEvaluacionDialog`: `useEvaluacion(idModulo)`. If null → button "Crear evaluación" (`useCreateEvaluacion`). Once present: edit nombre, list preguntas; each pregunta shows its respuestas with a "correcta" badge (`respuestaCorrecta`); add pregunta (`preguntaSchema`), add respuesta (`respuestaSchema` with `respuestaCorrecta` checkbox), delete pregunta/respuesta. "Eliminar evaluación" at footer.

**Patterns to copy:** `TurnoFormDialog.tsx` (RHF + zodResolver + Select + toast on submit/error), `TurnosListPage.tsx` (table skeleton/empty/error states, row action buttons), Sheet usage from `EmpleadoFormSheet`. For the puesto selector reuse the org tree: `useArbolEmpresa(empresaId)` flatten to `PuestoNodo[]` and feed a `Select` of `{id,nombre}`. (`empresaId` — use the same source `EmpleadoDetailPage` uses; if no single empresa context, allow free-text `puesto` and leave `idPuesto` optional. Decision: ship free-text `puesto` + optional puesto-id select when an empresa is in scope.)

**Interfaces consumed:** `Pensum`, `PensumArbol`, `PensumModuloArbol`, `PensumTemaArbol`, `EvaluacionDetalle`, `Pregunta`, `Respuesta`, hooks from Task 3, schemas from Task 1.

> Full component code follows the cited patterns verbatim (RHF form per dialog, `toast.success/error`, `mutateAsync`, close on success). Each dialog is small → `Dialog`; `PensumEditor` is large → `Sheet`. No new deps.

**Gate:** `npm run typecheck` + `npm run build` green; manual: create pensum → open editor → add módulo → add tema → open evaluación → add pregunta + 2 respuestas (mark one correcta) → all persist (mock localStorage `rototec.cap.*`).
**Commit:** `feat(capacitaciones): pensums tab + editor de arbol + autoria de evaluacion`.

---

## Task 6 — EmpleadosTab + EmpleadoCapDetailSheet

**Files:** `src/pages/capacitaciones/EmpleadosTab.tsx`, `EmpleadoCapDetailSheet.tsx`.

**EmpleadosTab:** `useEmpleadosCap(filtros)`. Table columns: Nombre, Estado (`success`/`destructive` badge), Progreso (`modulosAprobados/modulosTotal`), Licencia (`success` "Vigente" / `outline` "—"). Filters row: `Input` for puesto, `Input` for departamento, `Select` estado (todos/activos/inactivos) → builds `filtros` and refetches via query key. Row click opens `EmpleadoCapDetailSheet`.

**EmpleadoCapDetailSheet (Sheet, side right):** `useEmpleadoCap(empleadoId)`. Sections:
1. **Asignaciones**: list `asignaciones[]`; each shows `tipo` (PRIMARIA/SECUNDARIA), pensum id, licencia (`licenciaActiva`, `venceLicencia` via `formatDate`, `fechaFinaliza`). For each `detalles[]` row show módulo, **nota** (`puntuacion` read-only), `estado` badge (`Aprobado`→success, `No aprobado`→destructive, else warning), `intentos`. Per detalle a **"Generar examen"** button → `useGenerarExamen({ idAsignacionDetalle: detalle.id, horasVigencia })` → on success show the `url`, with a **"Copiar link"** button (`navigator.clipboard.writeText(url)` + toast). Optional small `Dialog` to set `horasVigencia` (`generarExamenSchema`, default 72).
2. **Asignación secundaria**: a `Select` of pensums (`usePensums`) + button → `useAsignarSecundaria(empleadoId).mutateAsync(idPensum)` (validate with `asignacionSecundariaSchema`).
3. **Asignación primaria** (single employee): button → `useAsignarPrimaria().mutateAsync([empleadoId])`.

> "Notas" are **read-only** (no backend endpoint edits puntuación; it is set by exam scoring). "Intentos"/"licencia" are display-only from the detalle/asignación. State this in the section header to avoid implying editability.

**Patterns:** table from `TurnosListPage`, Sheet from `EmpleadoFormSheet`, detail layout helpers from `EmpleadoDetailPage` (`Section`/`Item`). `EmpleadoCombobox` not needed here (list already gives employees).

**Interfaces consumed:** `EmpleadoCapResumen`, `EmpleadoCapDetalle`, `AsignacionCap`, `AsignacionDetalleCap`, `Pensum`, `GenerarExamenResult`, hooks Task 3.

**Gate:** `npm run typecheck` + `npm run build` green; manual: open a detail sheet → generate exam link → copy → assign secondary pensum.
**Commit:** `feat(capacitaciones): empleados tab + detalle (asignacion, notas, examen, licencia)`.

---

## Task 7 — ReasignacionTab (PLACEHOLDER — Plan 4)

**File:** `src/pages/capacitaciones/ReasignacionTab.tsx`.

**Scope decision (resolved):** the Plan 2 backend (branch `feat/capacitaciones-backend`) has **no** reassignment endpoint — reassignment of expired/failed (vencidos/reprobados) trainings is **Plan 4** (backend + tab wiring). Therefore in Plan 3 the **Reasignación** tab is a **static placeholder only**: no state, no API calls, no hooks, no mutations. The tab stays visible in `CapacitacionesPage` to preserve the decided 3-tab navigation.

**No api/hook surface for reassignment.** Confirm `src/api/capacitaciones.ts` and `src/hooks/useCapacitaciones.ts` contain **no** `reasignar*` method (they don't — Tasks 2/3 never introduced one). `useAsignarPrimaria`/`asignarPrimaria` remain, but they belong to Task 6 (single-employee primary assignment in the detail Sheet) and are **not** used here.

**Component (full code):**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function ReasignacionTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Reasignación de vencidos / reprobados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta función estará disponible en una próxima fase (Plan 4). Permitirá reasignar
          módulos a empleados con licencia vencida o evaluaciones reprobadas.
        </p>
      </CardContent>
    </Card>
  )
}
```

**Interfaces consumed:** none.

**Gate:** `npm run typecheck` + `npm run build` green; manual: the third tab renders the placeholder card.
**Commit:** `feat(capacitaciones): placeholder de reasignacion (pendiente Plan 4)`.

---

## Task 8 — ExamenPublicoPage `/examen/:token`

**File:** `src/pages/capacitaciones/ExamenPublicoPage.tsx` (replace the Task 4 stub).

**Standalone page (no AppShell, no auth).** Three phases via local state `phase: 'confirm' | 'examen' | 'enviado'`:

1. **confirm**: `useParams<{token}>()`; on mount, `capacitacionesApi.getExamenPublico(token)` via a `useQuery({ queryKey:['examen',token], queryFn, enabled, retry:false })`. Show a centered card with `evaluacion.nombre`, number of questions, and a "Comenzar examen" button. Handle error (invalid/expired token → friendly message, no redirect to /login because there is no token to clear).
2. **examen**: render `preguntas[]` as single-choice groups (radio inputs, one `idRespuesta` per `idPregunta`) held in `useState<Record<number, number>>`. A **countdown timer** (`useState` seconds + `useEffect` interval; default e.g. 20 min — configurable constant `DURACION_SEG`). When timer hits 0 → auto-submit. "Enviar respuestas" button builds `EnviarRespuestasInput` (`respuestas: preguntas.map(p => ({ idPregunta, idRespuesta: selected[p.id] ?? null }))`) and calls `capacitacionesApi.enviarExamen(token, input)` (a `useMutation`).
3. **enviado**: show `ResultadoExamen` — `puntaje`, `estado` badge (Aprobado→success), aprobado/no aprobado message. No further navigation (employee just closes the tab).

> Because this page is outside `RequireAuth`, it must NOT import anything that requires the auth context (no `useAuth`). It uses `capacitacionesApi` directly (the methods route through `rrhhPublicApi`, no Bearer). It still needs `QueryClientProvider` — confirm it is mounted at the `App.tsx`/router root above ALL routes (it is, since `App.tsx` wraps `RouterProvider`). If not, fall back to plain `useState` + `useEffect` fetch with `capacitacionesApi` (no TanStack) to stay self-contained.

**Standalone styling:** full-screen centered layout (`min-h-screen flex items-center justify-center bg-muted/30`), a `Card` with max width. Reuse `Button`, `Card`, `Badge`, `Skeleton`, `Alert`. No sidebar.

**Interfaces consumed:** `ExamenPublico`, `ExamenPreguntaPublica`, `ExamenOpcion`, `EnviarRespuestasInput`, `ResultadoExamen`, `capacitacionesApi`.

**Gate:** `npm run typecheck` + `npm run build` green; manual (mock): visit `/examen/abc` while **logged out** → confirm → answer → submit → result. Verify no Bearer header is sent (Network tab) and no redirect to `/login`.
**Commit:** `feat(capacitaciones): pagina publica de examen /examen/:token`.

---

## Self-Review (run before declaring done)

**Coverage vs. decided structure**
- [ ] One sidebar item **Capacitaciones** (Task 4) — yes.
- [ ] Tabs Pensums / Empleados / Reasignación (Task 4) — yes; Reasignación is a placeholder (Plan 4).
- [ ] Assignment / notas / intentos / generar-examen / licencia inside employee DETAIL Sheet (Task 6) — yes.
- [ ] Public route `/examen/:token` outside `RequireAuth`, replaces legacy exam page (Tasks 4+8) — yes.
- [ ] Pensum authoring incl. evaluación/preguntas/respuestas (Task 5) — yes.
- [ ] **Reasignación real (backend + tab wiring) is Plan 4** — Plan 3 ships only the placeholder card (Task 7); confirm no `reasignar*` exists in api/hook.
- [ ] Reassignment backend/wiring + Diploma DOCX + migrations excluded — confirmed not referenced anywhere.

**Placeholder scan**
- [ ] No `TODO`, no `return null` stubs left except where Task 4 intentionally stubs files later replaced by Tasks 5/6/7/8 — confirm each stub is overwritten by its owning task.
- [ ] No `any`; every endpoint response is typed via Task-1 interfaces.

**Type consistency (api ↔ hook ↔ pages)**
- [ ] `realApi: typeof mockApi` compiles → method parity guaranteed.
- [ ] Hook mutation/query generics match `capacitacionesApi` return types.
- [ ] Page props/state types come from `@/types` (no locally-redeclared shapes).
- [ ] Backend paths in `realApi` exactly match the contract table (prefix `/capacitaciones`, `pensums/modulos/:id`, `pensums/modulos/:id/temas`, `pensums/temas/:id`, `modulos/:id/evaluacion`, etc.).

**Gates**
- [ ] `npm run typecheck` green after every task.
- [ ] `npm run build` green after Tasks 4–8.

## Open items to confirm with backend/user
1. **Public exam + gateway auth:** the MS marks `GET/POST /examen/:token` public, but if the **API gateway** enforces auth before reaching the MS, the no-Bearer `rrhhPublicApi` calls may be rejected. Confirm the gateway whitelists those two paths (or exposes a public prefix). Single adjustment point: the `rrhhPublicApi` baseURL/instance in `client.ts`.
2. **`empresaId` for puesto selector** in PensumEditor — confirm the empresa context to populate the org-tree puesto `Select`; otherwise ship free-text `puesto` + optional id.
3. **Reasignación semantics** — confirmed as bulk primary (re)assignment; verify with the user this matches their mental model (no separate "transfer pensum" endpoint exists).
4. **Notas/intentos are read-only** in the UI (no edit endpoints). Confirm acceptable.
