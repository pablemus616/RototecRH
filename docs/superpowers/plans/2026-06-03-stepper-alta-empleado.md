# Wizard de Alta de Empleado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el alta de empleado por un wizard de 9 pasos (cascada organizacional desde el API → datos → biométrico) que valida por paso y termina con un diálogo que muestra el código Biotime y exige copiarlo para cerrar.

**Architecture:** Página propia `/empleados/nuevo` (layout A). Un único `react-hook-form` con valores snake_case espejo de `CreateEmployeeDto`; Zod por slices para gating por paso. Catálogos en cascada/biométrico vía TanStack Query contra `rrhhApi` (`/rrhh/...`); MINTRAB/bancos desde constantes locales. Render de campos **config-driven** para no repetir 9 bloques de JSX.

**Tech Stack:** React 18 + Vite + TS strict, Tailwind v3 + shadcn/ui, TanStack Query v5, react-hook-form + Zod, React Router v6, Axios, sonner.

**Verificación (este repo NO tiene test runner):** cada tarea cierra con `npm run typecheck` (tsc strict, `noUnusedLocals`) + un check manual en `npm run dev`. No se introduce framework de tests (se sigue la convención del `CLAUDE.md`: typecheck + smoke test).

**Spec:** `docs/superpowers/specs/2026-06-03-stepper-alta-empleado-design.md`

**Commits:** El plan incluye un commit por tarea, pero **confirmar con el usuario antes de commitear** (regla del proyecto: no encadenar fases sin confirmar).

**Pendientes heredados del spec (decididos con default, confirmar contra backend real):**
- Forma de la respuesta de los SP de `company` (`SELECT *`): se asume `{ id, nombre }` (empresa/depto/sub-depto/puesto) y `{ codigo, nombre }` (países). Si difieren, ajustar SOLO el `mapToOption` del módulo `api/company.ts`.
- Biotime: items `{ id, dept_name }` / `{ id, area_name }`. Ajustar label si difiere.
- Codificación MINTRAB: se envía el identificador string del catálogo (`.value`/`.codigo`). Si el backend exige el `codigoMintrab` numérico, cambiar el `value` en los `toOptions` (Task 7).

---

## Estructura de archivos

**Crear:**
- `src/api/company.ts` — catálogos cascada (paises, empresas, departamentos, sub-departamentos, puestos)
- `src/api/biotime.ts` — catálogos biométrico (departamentos, ubicaciones)
- `src/hooks/useCompanyCatalogos.ts` — hooks TanStack Query de la cascada
- `src/hooks/useBiotime.ts` — hooks TanStack Query del biométrico
- `src/components/ui/stepper.tsx` — riel de pasos vertical
- `src/pages/empleados/nuevo/EmpleadoCreateWizard.tsx` — shell del wizard (RHF, gating, submit)
- `src/pages/empleados/nuevo/wizardSteps.tsx` — config de los 9 pasos + render config-driven de campos
- `src/pages/empleados/nuevo/fields.tsx` — componentes de campo (Text/Number/Date/Select/AsyncSelect) atados a RHF
- `src/pages/empleados/nuevo/BiotimeCodeDialog.tsx` — diálogo de éxito con copy-to-close

**Modificar:**
- `src/types/index.ts` — `CreateEmpleadoInput`, `CreateEmpleadoResponse`, tipos de catálogo
- `src/lib/validators.ts` — `empleadoCreateSchema` + `WIZARD_STEP_FIELDS`
- `src/api/employees.ts` — `realApi.create` → `rrhhApi.post('/empleados', …)`, devuelve `CreateEmpleadoResponse`
- `src/hooks/useEmpleados.ts` — `useCreateEmpleado` tipado a `CreateEmpleadoInput`/`CreateEmpleadoResponse`
- `src/router.tsx` — ruta `empleados/nuevo`
- `src/pages/empleados/EmpleadosListPage.tsx` — botón "Nuevo Empleado" → `navigate('/empleados/nuevo')`

---

## Task 1: Tipos del flujo de creación

**Files:**
- Modify: `src/types/index.ts` (agregar al final)

- [ ] **Step 1: Agregar los tipos**

```ts
// ───────── Alta de empleado (contrato backend /rrhh, snake_case) ─────────

/** Item genérico de catálogo de la cascada (company). Ajustar si el SP devuelve otras columnas. */
export interface CatalogoItem {
  id: number
  nombre: string
}

/** País del catálogo company (código string + nombre). */
export interface PaisItem {
  codigo: string
  nombre: string
}

/** Item de catálogo de Biotime (departamento o área). */
export interface BiotimeItem {
  id: number
  nombre: string
}

/** Body de POST /rrhh/empleados — espejo de CreateEmployeeDto. */
export interface CreateEmpleadoInput {
  // cascada organizacional
  PAIS: string
  empresa_id: number
  id_departamento: number
  id_sub_departamento: number
  id_puesto: number
  // personales / documentos
  primer_nombre: string
  segundo_nombre?: string
  tercer_nombre?: string
  primer_apellido: string
  segundo_apellido?: string
  apellido_casada?: string
  numero_identificacion_nacional: string
  id_tributario: string
  id_seguro_social: string
  fecha_nacimiento: string
  sexo: string
  estado_civil: string
  cantidad_hijos: number
  tipo_discapacidad: string
  telefono?: string
  correo?: string
  direccion?: string
  pasaporte?: string
  // culturales (MINTRAB)
  pueblo_pertenencia: string
  comunidad_linguistica: string
  grupo_etnico?: string
  lugar_nacimiento_municipio?: string
  permiso_extranjero?: string
  // contrato / pago
  jornada: string
  temporalidad_contrato: string
  tipo_contrato: string
  fecha_contratacion: string
  fecha_reingreso?: string
  salario_base_contrato: number
  profesion?: string
  titulo?: string
  forma_pago: string
  codigo_banco?: string
  numero_cuenta?: string
  tipo_cuenta?: string
  // biométrico
  departamento_biotime: number
  ubicacion_biometrico: number
}

/** Respuesta de POST /rrhh/empleados — entidad creada (camelCase del backend). */
export interface CreateEmpleadoResponse {
  id: number
  codigoEmpleadoBio: number | null
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: PASS (sin errores).

- [ ] **Step 3: Commit** (confirmar antes)

```bash
git add src/types/index.ts
git commit -m "feat(alta): tipos del flujo de creación (CreateEmpleadoInput/Response, catálogos)"
```

---

## Task 2: Zod schema + grupos de campos por paso

**Files:**
- Modify: `src/lib/validators.ts` (agregar; reutiliza `dpiRegex`, `nitRegex`, `isoDate`, `SALARIO_BASE_MINIMO_VALIDACION` ya existentes)

- [ ] **Step 1: Agregar el schema y los grupos**

```ts
import type { CreateEmpleadoInput } from '@/types'
// (dpiRegex, nitRegex, isoDate, SALARIO_BASE_MINIMO_VALIDACION ya están en este archivo)

const reqStr = (msg = 'Requerido') => z.string().min(1, msg)
const optStr = (max: number) => z.string().max(max).optional().or(z.literal(''))
const reqId = z.coerce.number().int().positive('Selecciona una opción')

export const empleadoCreateSchema = z
  .object({
    // cascada
    PAIS: reqStr('Selecciona el país'),
    empresa_id: reqId,
    id_departamento: reqId,
    id_sub_departamento: reqId,
    id_puesto: reqId,
    // personales / documentos
    primer_nombre: reqStr().max(50),
    segundo_nombre: optStr(50),
    tercer_nombre: optStr(50),
    primer_apellido: reqStr().max(50),
    segundo_apellido: optStr(50),
    apellido_casada: optStr(50),
    numero_identificacion_nacional: z.string().regex(dpiRegex, 'El DPI debe tener exactamente 13 dígitos'),
    id_tributario: reqStr('Requerido').regex(nitRegex, 'NIT inválido (dígitos, opcional K final)'),
    id_seguro_social: reqStr('Requerido').max(30),
    fecha_nacimiento: isoDate,
    sexo: reqStr('Selecciona el sexo'),
    estado_civil: reqStr('Selecciona el estado civil'),
    cantidad_hijos: z.coerce.number().int().min(0).max(30),
    tipo_discapacidad: reqStr('Selecciona una opción'),
    telefono: optStr(30),
    correo: z.string().email('Correo inválido').max(255).optional().or(z.literal('')),
    direccion: optStr(200),
    pasaporte: optStr(30),
    // culturales
    pueblo_pertenencia: reqStr('Selecciona una opción'),
    comunidad_linguistica: reqStr('Selecciona una opción'),
    grupo_etnico: optStr(20),
    lugar_nacimiento_municipio: optStr(80),
    permiso_extranjero: optStr(40),
    // contrato / pago
    jornada: reqStr('Selecciona la jornada'),
    temporalidad_contrato: reqStr('Selecciona una opción'),
    tipo_contrato: reqStr('Selecciona una opción'),
    fecha_contratacion: isoDate.refine(
      (v) => new Date(v).getTime() <= Date.now(),
      'La fecha de contratación no puede ser futura',
    ),
    fecha_reingreso: z.string().optional().or(z.literal('')).refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      'Fecha inválida',
    ),
    salario_base_contrato: z.coerce
      .number()
      .min(SALARIO_BASE_MINIMO_VALIDACION, `Mínimo Q${SALARIO_BASE_MINIMO_VALIDACION}`),
    profesion: optStr(100),
    titulo: optStr(60),
    forma_pago: reqStr('Selecciona la forma de pago'),
    codigo_banco: z.string().optional().or(z.literal('')),
    numero_cuenta: z.string().optional().or(z.literal('')),
    tipo_cuenta: z.string().optional().or(z.literal('')),
    // biométrico
    departamento_biotime: reqId,
    ubicacion_biometrico: reqId,
  })
  .superRefine((data, ctx) => {
    if (data.forma_pago === 'TRANSFERENCIA') {
      if (!data.codigo_banco)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['codigo_banco'], message: 'Requerido para transferencia' })
      if (!data.numero_cuenta || data.numero_cuenta.trim().length < 4)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['numero_cuenta'], message: 'Número de cuenta requerido' })
      if (!data.tipo_cuenta)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tipo_cuenta'], message: 'Selecciona tipo de cuenta' })
    }
  })

export type EmpleadoCreateValues = z.infer<typeof empleadoCreateSchema>

/** Campos de cada paso (para form.trigger por paso). Índice = nº de paso - 1. */
export const WIZARD_STEP_FIELDS: (keyof EmpleadoCreateValues)[][] = [
  ['PAIS'],
  ['empresa_id'],
  ['id_departamento'],
  ['id_sub_departamento'],
  ['id_puesto'],
  ['primer_nombre', 'segundo_nombre', 'tercer_nombre', 'primer_apellido', 'segundo_apellido', 'apellido_casada',
   'numero_identificacion_nacional', 'id_tributario', 'id_seguro_social', 'fecha_nacimiento', 'sexo', 'estado_civil',
   'cantidad_hijos', 'tipo_discapacidad', 'telefono', 'correo', 'direccion', 'pasaporte'],
  ['pueblo_pertenencia', 'comunidad_linguistica', 'grupo_etnico', 'lugar_nacimiento_municipio', 'permiso_extranjero'],
  ['jornada', 'temporalidad_contrato', 'tipo_contrato', 'fecha_contratacion', 'fecha_reingreso',
   'salario_base_contrato', 'profesion', 'titulo', 'forma_pago', 'codigo_banco', 'numero_cuenta', 'tipo_cuenta'],
  ['departamento_biotime', 'ubicacion_biometrico'],
]
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit** (confirmar antes)

```bash
git add src/lib/validators.ts
git commit -m "feat(alta): zod schema del wizard + grupos de campos por paso"
```

---

## Task 3: Capa API — company, biotime, employees.create

**Files:**
- Create: `src/api/company.ts`
- Create: `src/api/biotime.ts`
- Modify: `src/api/employees.ts`

- [ ] **Step 1: `src/api/company.ts`**

```ts
import { rrhhApi, USE_MOCK } from './client'
import type { CatalogoItem, PaisItem } from '@/types'

// El SP devuelve SELECT *; normalizamos a {id,nombre}/{codigo,nombre}. Ajustar aquí si difieren las columnas.
const mapCat = (r: Record<string, unknown>): CatalogoItem => ({
  id: Number(r.id ?? r.Id ?? r.ID),
  nombre: String(r.nombre ?? r.Nombre ?? r.descripcion ?? r.NOMBRE ?? ''),
})
const mapPais = (r: Record<string, unknown>): PaisItem => ({
  codigo: String(r.codigo ?? r.Codigo ?? r.PAIS ?? r.id ?? ''),
  nombre: String(r.nombre ?? r.Nombre ?? r.NOMBRE ?? ''),
})

const realApi = {
  async paises(): Promise<PaisItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/company/paises')
    return data.map(mapPais)
  },
  async empresas(): Promise<CatalogoItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/company/empresas')
    return data.map(mapCat)
  },
  async departamentos(empresaId: number): Promise<CatalogoItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>(`/company/departamentos/${empresaId}`)
    return data.map(mapCat)
  },
  async subDepartamentos(departamentoId: number): Promise<CatalogoItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>(`/company/sub-departamentos/${departamentoId}`)
    return data.map(mapCat)
  },
  async puestos(subDepartamentoId: number): Promise<CatalogoItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>(`/company/puestos/${subDepartamentoId}`)
    return data.map(mapCat)
  },
}

const mockApi: typeof realApi = {
  async paises() { return [{ codigo: 'GT', nombre: 'Guatemala' }, { codigo: 'SV', nombre: 'El Salvador' }] },
  async empresas() { return [{ id: 1, nombre: 'Rototec' }, { id: 2, nombre: 'Rototec Comercial' }] },
  async departamentos() { return [{ id: 10, nombre: 'Producción' }, { id: 11, nombre: 'Ventas' }] },
  async subDepartamentos() { return [{ id: 100, nombre: 'Acabados' }, { id: 101, nombre: 'Rotomoldeo' }] },
  async puestos() { return [{ id: 1000, nombre: 'Operario de Máquina' }, { id: 1001, nombre: 'Supervisor de Turno' }] },
}

export const companyApi = USE_MOCK ? mockApi : realApi
```

- [ ] **Step 2: `src/api/biotime.ts`**

```ts
import { rrhhApi, USE_MOCK } from './client'
import type { BiotimeItem } from '@/types'

const mapBio = (r: Record<string, unknown>): BiotimeItem => ({
  id: Number(r.id ?? r.Id),
  nombre: String(r.dept_name ?? r.area_name ?? r.name ?? r.nombre ?? ''),
})

const realApi = {
  async departamentos(): Promise<BiotimeItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/biotime/departamentos')
    return data.map(mapBio)
  },
  async ubicaciones(): Promise<BiotimeItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/biotime/ubicaciones')
    return data.map(mapBio)
  },
}

const mockApi: typeof realApi = {
  async departamentos() { return [{ id: 1, nombre: 'PRODUCCION' }, { id: 2, nombre: 'ADMIN' }] },
  async ubicaciones() { return [{ id: 1, nombre: 'PLANTA EL SALVADOR' }, { id: 2, nombre: 'CEDIS' }] },
}

export const biotimeApi = USE_MOCK ? mockApi : realApi
```

- [ ] **Step 3: Modificar `src/api/employees.ts` — create real apunta a `/rrhh/empleados`**

Cambiar el import para incluir `rrhhApi` y los tipos nuevos, y reemplazar `create` en `realApi`:

```ts
// arriba: asegurar imports
import { api, rrhhApi, USE_MOCK } from './client'
import type { Empleado, EmpleadoInput, BajaInput, CreateEmpleadoInput, CreateEmpleadoResponse } from '@/types'
```

En `realApi`, reemplazar el método `create` existente por:

```ts
  async create(input: CreateEmpleadoInput): Promise<CreateEmpleadoResponse> {
    const { data } = await rrhhApi.post<CreateEmpleadoResponse>('/empleados', input)
    return data
  },
```

En `mockApi`, reemplazar `create` por una versión compatible con la nueva firma:

```ts
  async create(input: CreateEmpleadoInput): Promise<CreateEmpleadoResponse> {
    await delay()
    return { id: Math.floor(Math.random() * 9000) + 1000, codigoEmpleadoBio: Math.floor(Math.random() * 900) + 100 }
  },
```

> Nota: `list/get/update/darDeBaja/reactivar` siguen igual (modelo viejo `Empleado`). Solo `create` cambia de firma.

- [ ] **Step 4: Verificar**

Run: `npm run typecheck`
Expected: Puede fallar en `useEmpleados.ts`/`EmpleadoFormSheet.tsx` porque `create` cambió de firma — se arregla en Task 4 y Task 9. Verificar que `company.ts` y `biotime.ts` no tengan errores propios.

- [ ] **Step 5: Commit** (confirmar antes)

```bash
git add src/api/company.ts src/api/biotime.ts src/api/employees.ts
git commit -m "feat(alta): API company + biotime y create contra /rrhh/empleados"
```

---

## Task 4: Hooks de catálogos + create

**Files:**
- Create: `src/hooks/useCompanyCatalogos.ts`
- Create: `src/hooks/useBiotime.ts`
- Modify: `src/hooks/useEmpleados.ts`

- [ ] **Step 1: `src/hooks/useCompanyCatalogos.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { companyApi } from '@/api/company'

const QK = {
  paises: ['company', 'paises'] as const,
  empresas: ['company', 'empresas'] as const,
  departamentos: (empresaId?: number) => ['company', 'departamentos', empresaId] as const,
  subDepartamentos: (depId?: number) => ['company', 'sub-departamentos', depId] as const,
  puestos: (subId?: number) => ['company', 'puestos', subId] as const,
}
const HORA = 1000 * 60 * 60

export const usePaises = () =>
  useQuery({ queryKey: QK.paises, queryFn: () => companyApi.paises(), staleTime: HORA })

export const useEmpresas = () =>
  useQuery({ queryKey: QK.empresas, queryFn: () => companyApi.empresas(), staleTime: HORA })

export const useDepartamentos = (empresaId?: number) =>
  useQuery({
    queryKey: QK.departamentos(empresaId),
    queryFn: () => companyApi.departamentos(empresaId as number),
    enabled: Boolean(empresaId),
    staleTime: HORA,
  })

export const useSubDepartamentos = (departamentoId?: number) =>
  useQuery({
    queryKey: QK.subDepartamentos(departamentoId),
    queryFn: () => companyApi.subDepartamentos(departamentoId as number),
    enabled: Boolean(departamentoId),
    staleTime: HORA,
  })

export const usePuestos = (subDepartamentoId?: number) =>
  useQuery({
    queryKey: QK.puestos(subDepartamentoId),
    queryFn: () => companyApi.puestos(subDepartamentoId as number),
    enabled: Boolean(subDepartamentoId),
    staleTime: HORA,
  })
```

- [ ] **Step 2: `src/hooks/useBiotime.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { biotimeApi } from '@/api/biotime'

const HORA = 1000 * 60 * 60

export const useBiotimeDepartamentos = () =>
  useQuery({ queryKey: ['biotime', 'departamentos'], queryFn: () => biotimeApi.departamentos(), staleTime: HORA })

export const useBiotimeUbicaciones = () =>
  useQuery({ queryKey: ['biotime', 'ubicaciones'], queryFn: () => biotimeApi.ubicaciones(), staleTime: HORA })
```

- [ ] **Step 3: Modificar `useCreateEmpleado` en `src/hooks/useEmpleados.ts`**

Reemplazar el hook por la versión tipada al nuevo contrato:

```ts
import type { CreateEmpleadoInput, CreateEmpleadoResponse } from '@/types'

export function useCreateEmpleado() {
  const qc = useQueryClient()
  return useMutation<CreateEmpleadoResponse, Error, CreateEmpleadoInput>({
    mutationFn: (input) => empleadosApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck`
Expected: Los hooks nuevos PASS. `EmpleadoFormSheet.tsx` aún romperá (usa `create` con la firma vieja) — se resuelve en Task 9 (deja de usar `create` para alta). Si bloquea, continuar; el typecheck final (Task 10) debe quedar limpio.

- [ ] **Step 5: Commit** (confirmar antes)

```bash
git add src/hooks/useCompanyCatalogos.ts src/hooks/useBiotime.ts src/hooks/useEmpleados.ts
git commit -m "feat(alta): hooks de catálogos (company/biotime) y create tipado"
```

---

## Task 5: Componente Stepper (riel vertical)

**Files:**
- Create: `src/components/ui/stepper.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepperItem {
  id: string
  title: string
}
type StepState = 'done' | 'active' | 'error' | 'todo'

export function Stepper({
  steps,
  current,
  stateOf,
  onStepClick,
}: {
  steps: StepperItem[]
  current: number
  stateOf: (index: number) => StepState
  onStepClick?: (index: number) => void
}) {
  return (
    <ol className="flex flex-col gap-1">
      {steps.map((s, i) => {
        const st = stateOf(i)
        const clickable = onStepClick && i <= current
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                i === current ? 'bg-secondary' : 'hover:bg-secondary/50',
                !clickable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  st === 'done' && 'border-transparent bg-primary text-primary-foreground',
                  st === 'active' && 'border-primary text-foreground',
                  st === 'error' && 'border-destructive text-destructive',
                  st === 'todo' && 'border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {st === 'done' ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn('truncate', st === 'todo' && 'text-muted-foreground')}>{s.title}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit** (confirmar antes)

```bash
git add src/components/ui/stepper.tsx
git commit -m "feat(ui): componente Stepper vertical"
```

---

## Task 6: Componentes de campo atados a RHF

**Files:**
- Create: `src/pages/empleados/nuevo/fields.tsx`

- [ ] **Step 1: Implementar los field components**

```tsx
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { EmpleadoCreateValues } from '@/lib/validators'

export type Opt = { value: string; label: string }
type Name = keyof EmpleadoCreateValues

function FieldShell({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function TextField({ name, label, required, type = 'text', placeholder, disabled }: {
  name: Name; label: string; required?: boolean; type?: string; placeholder?: string; disabled?: boolean
}) {
  const { register, formState: { errors } } = useFormContext<EmpleadoCreateValues>()
  const err = errors[name]?.message as string | undefined
  return (
    <FieldShell label={label} required={required} error={err}>
      <Input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!err}
        className={cn(err && 'border-destructive')}
        {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
      />
    </FieldShell>
  )
}

export function SelectField({ name, label, required, options, disabled, loading, placeholder = 'Seleccionar' }: {
  name: Name; label: string; required?: boolean; options: Opt[]
  disabled?: boolean; loading?: boolean; placeholder?: string
}) {
  const { watch, setValue, formState: { errors } } = useFormContext<EmpleadoCreateValues>()
  const err = errors[name]?.message as string | undefined
  const value = watch(name)
  return (
    <FieldShell label={label} required={required} error={err}>
      <Select
        value={value == null || value === '' ? undefined : String(value)}
        onValueChange={(v) => setValue(name, v as never, { shouldValidate: true, shouldDirty: true })}
        disabled={disabled || loading}
      >
        <SelectTrigger className={cn(err && 'border-destructive')}>
          <SelectValue placeholder={loading ? 'Cargando…' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit** (confirmar antes)

```bash
git add src/pages/empleados/nuevo/fields.tsx
git commit -m "feat(alta): componentes de campo (text/select) atados a RHF"
```

---

## Task 7: Config de los 9 pasos + render

**Files:**
- Create: `src/pages/empleados/nuevo/wizardSteps.tsx`

Convierte las constantes MINTRAB heterogéneas a `Opt[]` y declara el contenido de cada paso. El render de la cascada y biométrico usa los hooks (con dependencia del padre).

- [ ] **Step 1: Implementar `toOptions` + render por paso**

```tsx
import { useFormContext } from 'react-hook-form'
import {
  SEXOS, ESTADOS_CIVILES, PUEBLOS_GUATEMALA, COMUNIDADES_LINGUISTICAS, JORNADAS,
  TEMPORALIDAD_CONTRATO, TIPOS_CONTRATO, TIPOS_DISCAPACIDAD, BANCOS_GUATEMALA,
  FORMAS_PAGO, TIPOS_CUENTA,
} from '@/constants/guatemala'
import {
  usePaises, useEmpresas, useDepartamentos, useSubDepartamentos, usePuestos,
} from '@/hooks/useCompanyCatalogos'
import { useBiotimeDepartamentos, useBiotimeUbicaciones } from '@/hooks/useBiotime'
import type { EmpleadoCreateValues } from '@/lib/validators'
import { SelectField, TextField, type Opt } from './fields'

// MINTRAB: se envía el identificador string (.value/.codigo). Si el backend exige codigoMintrab, cambiar aquí.
const sexos: Opt[] = SEXOS.map((x) => ({ value: x.value, label: x.label }))
const estadosCiviles: Opt[] = ESTADOS_CIVILES.map((x) => ({ value: x.value, label: x.label }))
const pueblos: Opt[] = PUEBLOS_GUATEMALA.map((x) => ({ value: x.codigo, label: x.label }))
const comunidades: Opt[] = COMUNIDADES_LINGUISTICAS.map((x) => ({ value: x.codigo, label: x.label }))
const jornadas: Opt[] = JORNADAS.map((x) => ({ value: x.value, label: x.label }))
const temporalidades: Opt[] = TEMPORALIDAD_CONTRATO.map((x) => ({ value: x.value, label: x.label }))
const tiposContrato: Opt[] = TIPOS_CONTRATO.map((x) => ({ value: x.value, label: x.label }))
const discapacidades: Opt[] = TIPOS_DISCAPACIDAD.map((x) => ({ value: x.codigo, label: x.label }))
const bancos: Opt[] = BANCOS_GUATEMALA.map((x) => ({ value: x.codigo, label: `${x.codigo} · ${x.nombre}` }))
const formasPago: Opt[] = FORMAS_PAGO.map((x) => ({ value: x.value, label: x.label }))
const tiposCuenta: Opt[] = TIPOS_CUENTA.map((x) => ({ value: x.value, label: x.label }))

const toOpt = (rows: { id: number; nombre: string }[] | undefined): Opt[] =>
  (rows ?? []).map((r) => ({ value: String(r.id), label: r.nombre }))

export const WIZARD_STEPS = [
  { id: 'pais', title: 'País' },
  { id: 'empresa', title: 'Empresa' },
  { id: 'departamento', title: 'Departamento' },
  { id: 'subdepartamento', title: 'Sub-departamento' },
  { id: 'puesto', title: 'Puesto' },
  { id: 'personales', title: 'Datos personales' },
  { id: 'culturales', title: 'Datos culturales' },
  { id: 'contrato', title: 'Contrato y pago' },
  { id: 'biometrico', title: 'Config. biométrico' },
]

const grid = 'grid gap-4 sm:grid-cols-2'

export function StepContent({ index }: { index: number }) {
  const { watch } = useFormContext<EmpleadoCreateValues>()
  const empresaId = watch('empresa_id')
  const departamentoId = watch('id_departamento')
  const subDepId = watch('id_sub_departamento')
  const esTransferencia = watch('forma_pago') === 'TRANSFERENCIA'

  const paises = usePaises()
  const empresas = useEmpresas()
  const departamentos = useDepartamentos(empresaId || undefined)
  const subDeps = useSubDepartamentos(departamentoId || undefined)
  const puestos = usePuestos(subDepId || undefined)
  const bioDeptos = useBiotimeDepartamentos()
  const bioUbic = useBiotimeUbicaciones()

  switch (index) {
    case 0:
      return <SelectField name="PAIS" label="País" required loading={paises.isLoading}
        options={(paises.data ?? []).map((p) => ({ value: p.codigo, label: p.nombre }))} />
    case 1:
      return <SelectField name="empresa_id" label="Empresa" required loading={empresas.isLoading} options={toOpt(empresas.data)} />
    case 2:
      return <SelectField name="id_departamento" label="Departamento" required
        loading={departamentos.isLoading} disabled={!empresaId} options={toOpt(departamentos.data)} />
    case 3:
      return <SelectField name="id_sub_departamento" label="Sub-departamento" required
        loading={subDeps.isLoading} disabled={!departamentoId} options={toOpt(subDeps.data)} />
    case 4:
      return <SelectField name="id_puesto" label="Puesto" required
        loading={puestos.isLoading} disabled={!subDepId} options={toOpt(puestos.data)} />
    case 5:
      return (
        <div className={grid}>
          <TextField name="primer_nombre" label="Primer nombre" required />
          <TextField name="segundo_nombre" label="Segundo nombre" />
          <TextField name="tercer_nombre" label="Tercer nombre" />
          <TextField name="primer_apellido" label="Primer apellido" required />
          <TextField name="segundo_apellido" label="Segundo apellido" />
          <TextField name="apellido_casada" label="Apellido de casada" />
          <TextField name="numero_identificacion_nacional" label="DPI" required placeholder="13 dígitos" />
          <TextField name="id_tributario" label="NIT" required />
          <TextField name="id_seguro_social" label="No. IGSS" required />
          <TextField name="fecha_nacimiento" label="Fecha de nacimiento" required type="date" />
          <SelectField name="sexo" label="Sexo" required options={sexos} />
          <SelectField name="estado_civil" label="Estado civil" required options={estadosCiviles} />
          <TextField name="cantidad_hijos" label="Cantidad de hijos" required type="number" />
          <SelectField name="tipo_discapacidad" label="Tipo de discapacidad" required options={discapacidades} />
          <TextField name="telefono" label="Teléfono" />
          <TextField name="correo" label="Correo" type="email" />
          <TextField name="direccion" label="Dirección" />
          <TextField name="pasaporte" label="Pasaporte" />
        </div>
      )
    case 6:
      return (
        <div className={grid}>
          <SelectField name="pueblo_pertenencia" label="Pueblo de pertenencia" required options={pueblos} />
          <SelectField name="comunidad_linguistica" label="Comunidad lingüística" required options={comunidades} />
          <TextField name="grupo_etnico" label="Grupo étnico" />
          <TextField name="lugar_nacimiento_municipio" label="Lugar de nacimiento (municipio)" />
          <TextField name="permiso_extranjero" label="Permiso/Expediente extranjero" />
        </div>
      )
    case 7:
      return (
        <div className={grid}>
          <SelectField name="jornada" label="Jornada" required options={jornadas} />
          <SelectField name="temporalidad_contrato" label="Temporalidad del contrato" required options={temporalidades} />
          <SelectField name="tipo_contrato" label="Tipo de contrato" required options={tiposContrato} />
          <TextField name="fecha_contratacion" label="Fecha de contratación" required type="date" />
          <TextField name="fecha_reingreso" label="Fecha de reingreso" type="date" />
          <TextField name="salario_base_contrato" label="Salario base (Q)" required type="number" />
          <TextField name="profesion" label="Profesión" />
          <TextField name="titulo" label="Título / diploma" />
          <SelectField name="forma_pago" label="Forma de pago" required options={formasPago} />
          <SelectField name="codigo_banco" label="Banco" required={esTransferencia} disabled={!esTransferencia} options={bancos} />
          <TextField name="numero_cuenta" label="No. de cuenta" required={esTransferencia} disabled={!esTransferencia} />
          <SelectField name="tipo_cuenta" label="Tipo de cuenta" required={esTransferencia} disabled={!esTransferencia} options={tiposCuenta} />
        </div>
      )
    case 8:
      return (
        <div className={grid}>
          <SelectField name="departamento_biotime" label="Departamento (biométrico)" required
            loading={bioDeptos.isLoading} options={toOpt(bioDeptos.data)} />
          <SelectField name="ubicacion_biometrico" label="Ubicación / área (biométrico)" required
            loading={bioUbic.isLoading} options={toOpt(bioUbic.data)} />
        </div>
      )
    default:
      return null
  }
}
```

> Nota DRY: `TextField`/`SelectField` toman `disabled`/`required` para los campos bancarios condicionados. El reseteo en cascada (limpiar hijos al cambiar el padre) se maneja en el shell (Task 8).

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: PASS (asumiendo nombres de export de `guatemala.ts` correctos; si alguno difiere, ajustar el `.map`).

- [ ] **Step 3: Commit** (confirmar antes)

```bash
git add src/pages/empleados/nuevo/wizardSteps.tsx
git commit -m "feat(alta): config y render de los 9 pasos del wizard"
```

---

## Task 8: Diálogo de éxito (copy-to-close)

**Files:**
- Create: `src/pages/empleados/nuevo/BiotimeCodeDialog.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

export interface AltaResumen {
  id: number
  nombre: string
  puesto: string
  departamento: string
  codigoBiotime: string
}

export function BiotimeCodeDialog({ resumen, onClose }: { resumen: AltaResumen | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const open = resumen != null

  async function copiar() {
    if (!resumen) return
    try {
      await navigator.clipboard.writeText(resumen.codigoBiotime)
      setCopied(true)
      toast.success('Código copiado')
    } catch {
      toast.error('No se pudo copiar; cópialo manualmente')
    }
  }

  function handleClose() {
    setCopied(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && copied) handleClose() }}>
      <DialogContent
        onEscapeKeyDown={(e) => { if (!copied) e.preventDefault() }}
        onInteractOutside={(e) => { if (!copied) e.preventDefault() }}
        onPointerDownOutside={(e) => { if (!copied) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle>Empleado creado ✓</DialogTitle>
          <DialogDescription>
            Copia el código de Biotime para registrarlo en el biométrico. Es obligatorio copiarlo para cerrar.
          </DialogDescription>
        </DialogHeader>

        {resumen && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <div><span className="font-medium text-foreground">ID:</span> {resumen.id}</div>
              <div><span className="font-medium text-foreground">Nombre:</span> {resumen.nombre}</div>
              <div><span className="font-medium text-foreground">Puesto:</span> {resumen.puesto}</div>
              <div><span className="font-medium text-foreground">Departamento:</span> {resumen.departamento}</div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Código Biotime</div>
                <div className="font-mono text-2xl font-bold tracking-wider">{resumen.codigoBiotime}</div>
              </div>
              <Button type="button" variant={copied ? 'outline' : 'default'} onClick={copiar}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleClose} disabled={!copied}>
            {copied ? 'Cerrar' : 'Copia el código para cerrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

> El cierre por Esc / click afuera / X y `onOpenChange(false)` quedan bloqueados mientras `!copied`. Confirmar que `DialogContent` de este repo reenvía `onEscapeKeyDown`/`onInteractOutside`/`onPointerDownOutside` a Radix (shadcn estándar lo hace); si el `DialogContent` trae botón X propio, igual dispara `onOpenChange` que está guardado.

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit** (confirmar antes)

```bash
git add src/pages/empleados/nuevo/BiotimeCodeDialog.tsx
git commit -m "feat(alta): diálogo de éxito con código Biotime y copy-to-close"
```

---

## Task 9: Wizard shell + routing + botón

**Files:**
- Create: `src/pages/empleados/nuevo/EmpleadoCreateWizard.tsx`
- Modify: `src/router.tsx`
- Modify: `src/pages/empleados/EmpleadosListPage.tsx`

- [ ] **Step 1: `EmpleadoCreateWizard.tsx` (shell: RHF + gating + cascada-reset + submit)**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Stepper } from '@/components/ui/stepper'
import { empleadoCreateSchema, WIZARD_STEP_FIELDS, type EmpleadoCreateValues } from '@/lib/validators'
import { useCreateEmpleado } from '@/hooks/useEmpleados'
import { extractApiErrorMessage } from '@/api/client'
import { WIZARD_STEPS, StepContent } from './wizardSteps'
import { BiotimeCodeDialog, type AltaResumen } from './BiotimeCodeDialog'

const LAST = WIZARD_STEPS.length - 1

export default function EmpleadoCreateWizard() {
  const navigate = useNavigate()
  const createMut = useCreateEmpleado()
  const [step, setStep] = useState(0)
  const [resumen, setResumen] = useState<AltaResumen | null>(null)

  const form = useForm<EmpleadoCreateValues>({
    resolver: zodResolver(empleadoCreateSchema),
    mode: 'onChange',
    defaultValues: { cantidad_hijos: 0, PAIS: '', forma_pago: 'TRANSFERENCIA' } as Partial<EmpleadoCreateValues> as EmpleadoCreateValues,
  })

  // Reseteo en cascada: cambiar un padre limpia a sus hijos.
  const empresaId = form.watch('empresa_id')
  const depId = form.watch('id_departamento')
  const subId = form.watch('id_sub_departamento')
  useEffect(() => { form.resetField('id_departamento'); form.resetField('id_sub_departamento'); form.resetField('id_puesto') }, [empresaId]) // eslint-disable-line
  useEffect(() => { form.resetField('id_sub_departamento'); form.resetField('id_puesto') }, [depId]) // eslint-disable-line
  useEffect(() => { form.resetField('id_puesto') }, [subId]) // eslint-disable-line

  const stepStateOf = useMemo(() => (i: number) => {
    if (i === step) return 'active' as const
    if (i < step) return 'done' as const
    return 'todo' as const
  }, [step])

  async function next() {
    const ok = await form.trigger(WIZARD_STEP_FIELDS[step], { shouldFocus: true })
    if (ok) setStep((s) => Math.min(LAST, s + 1))
  }
  function back() { setStep((s) => Math.max(0, s - 1)) }

  async function onSubmit(values: EmpleadoCreateValues) {
    try {
      const res = await createMut.mutateAsync(values as unknown as Parameters<typeof createMut.mutateAsync>[0])
      // labels para el resumen (de lo ya seleccionado en el form)
      const nombre = [values.primer_nombre, values.segundo_nombre, values.primer_apellido, values.segundo_apellido]
        .filter(Boolean).join(' ')
      setResumen({
        id: res.id,
        nombre,
        puesto: '—', // opcional: resolver label del puesto desde el catálogo si se desea
        departamento: '—',
        codigoBiotime: res.codigoEmpleadoBio != null ? String(res.codigoEmpleadoBio) : 'N/D',
      })
    } catch (err) {
      const msg = extractApiErrorMessage(err)
      // DPI duplicado u otros 4xx → llevar al paso 6 y avisar
      if (/identificaci[oó]n|dpi|duplicad/i.test(msg)) setStep(5)
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Nuevo empleado</h2>
        <Button variant="ghost" onClick={() => navigate('/empleados')}>Cancelar</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <Card className="h-fit p-3">
          <Stepper steps={WIZARD_STEPS} current={step} stateOf={stepStateOf} onStepClick={setStep} />
        </Card>

        <Card className="p-5">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="min-h-[280px]">
                <StepContent index={step} />
              </div>
              <div className="mt-6 flex justify-between border-t pt-4">
                <Button type="button" variant="outline" onClick={back} disabled={step === 0}>
                  <ArrowLeft className="h-4 w-4" /> Atrás
                </Button>
                {step < LAST ? (
                  <Button type="button" onClick={next}>Siguiente <ArrowRight className="h-4 w-4" /></Button>
                ) : (
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? 'Creando…' : 'Crear empleado'}
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </Card>
      </div>

      <BiotimeCodeDialog resumen={resumen} onClose={() => navigate('/empleados')} />
    </div>
  )
}
```

> Nota: `puesto`/`departamento` en el resumen quedan como `—` por simplicidad; si se quiere el label real, leer el item seleccionado de `usePuestos`/`useDepartamentos` por `id`. El gating no deja llegar al submit sin requeridos (cada `next` valida su paso; el `handleSubmit` revalida todo el schema).

- [ ] **Step 2: `src/router.tsx` — agregar ruta (ANTES de `empleados/:id`)**

Agregar import:
```tsx
import EmpleadoCreateWizard from '@/pages/empleados/nuevo/EmpleadoCreateWizard'
```
Y dentro de los `children` del `AppShell`, agregar antes de `{ path: 'empleados/:id', … }`:
```tsx
          { path: 'empleados/nuevo', element: <EmpleadoCreateWizard /> },
```

- [ ] **Step 3: `EmpleadosListPage.tsx` — botón navega, quitar el Sheet de creación**

1. Quitar el import `import { EmpleadoFormSheet } from './EmpleadoFormSheet'` (sigue usándose en `EmpleadoDetailPage`, no acá).
2. Quitar el estado `const [sheetOpen, setSheetOpen] = useState(false)`.
3. Cambiar el botón:
```tsx
        <Button onClick={() => navigate('/empleados/nuevo')}>
          <Plus className="h-4 w-4" />
          Nuevo Empleado
        </Button>
```
4. Quitar el bloque al final:
```tsx
      <EmpleadoFormSheet open={sheetOpen} onOpenChange={setSheetOpen} mode="create" />
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck`
Expected: PASS (todo el proyecto limpio; `noUnusedLocals` exige que `sheetOpen`/import se hayan quitado).

- [ ] **Step 5: Commit** (confirmar antes)

```bash
git add src/pages/empleados/nuevo/EmpleadoCreateWizard.tsx src/router.tsx src/pages/empleados/EmpleadosListPage.tsx
git commit -m "feat(alta): wizard shell, ruta /empleados/nuevo y botón de alta"
```

---

## Task 10: Verificación end-to-end

**Files:** (ninguno — verificación)

- [ ] **Step 1: Typecheck completo**

Run: `npm run typecheck`
Expected: PASS sin errores.

- [ ] **Step 2: Smoke test manual**

Run: `npm run dev` y en el navegador:
- Ir a Empleados → "Nuevo Empleado" → carga `/empleados/nuevo` con el riel de 9 pasos.
- Paso 1 País carga del API; al elegir Empresa (paso 2) se habilita Departamento (paso 3), etc. (cascada).
- Intentar "Siguiente" con un requerido vacío → no avanza y marca error. DPI de 12 dígitos → bloquea con mensaje.
- Completar todo → "Crear empleado" → aparece el diálogo con el **código Biotime**.
- Verificar que el diálogo **no se cierra** (Esc, click afuera, X, botón) hasta presionar "Copiar"; tras copiar, "Cerrar" funciona y regresa a la lista; el empleado nuevo aparece.
- Caso error: crear con un DPI ya existente → toast con el mensaje del backend y salto al paso 6.

- [ ] **Step 3: Commit final** (si hubo ajustes; confirmar antes)

```bash
git add -A
git commit -m "feat(alta): wizard de alta de empleado completo (9 pasos + dialog biotime)"
```

---

## Self-review (cobertura del spec)

- Ruta `/empleados/nuevo` + layout A → Task 9 ✓
- 9 pasos (cascada 1-5, personales, culturales, contrato/pago, biométrico) → Task 7 ✓
- RHF único + gating por paso (`form.trigger`) → Tasks 2, 9 ✓
- Catálogos cascada/biotime del API + MINTRAB local → Tasks 3, 4, 7 ✓
- Reseteo en cascada → Task 9 ✓
- Modelo snake_case `CreateEmpleadoInput` + create real a `/rrhh/empleados` → Tasks 1, 3 ✓
- Requeridos estrictos + formato (DPI/NIT/salario/fechas/email) → Task 2 ✓
- Manejo de DPI duplicado (4xx) → Task 9 ✓
- Diálogo de éxito con código Biotime + copy-to-close → Tasks 8, 9 ✓
- Alcance solo creación (no toca lista salvo el botón, ni detalle/edición) → Task 9 ✓
