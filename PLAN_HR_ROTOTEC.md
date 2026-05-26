# Plan de Implementación — Sistema HR Rototec
> Entregar este archivo a Claude Code y decirle: "Lee este plan y ejecútalo fase por fase. Pregúntame antes de iniciar cada fase."

---

## ESTADO ACTUAL DEL PROYECTO (snapshot)

Sección agregada para que una nueva sesión pueda retomar sin contexto previo. La fuente de verdad de campos y catálogos es `ESPECIFICACION_CAMPOS.md`, NO este plan original.

### Fases completadas

- [x] **Fase 1** — Empleados (CRUD completo en drawer con 4 tabs, baja/reactivar, detalle)
- [x] **Fase 2** — Catálogo de Turnos + asignaciones por empleado con historial
- [x] **Fase 3** — Ausencias y Atrasos (página única con 2 tabs)
- [x] **Fase 4** — Asistencias con cálculo de horas extras (lista + detalle por empleado)
- [x] **Fase 5** — Planilla consolidada con export Excel
- [x] **Fase 6** — Bonificaciones (módulo separado, captura individual y masiva)

### Pendientes

- [ ] **Fase 7** — Detalle horas extras por empleado (formato imprimible para pre-boleta)
- [ ] **Fase 8** — QA/buffer y pendientes técnicos (ver lista abajo)

### Desviaciones aplicadas vs plan original

1. **`ESPECIFICACION_CAMPOS.md` manda sobre este plan** en todo lo relativo a nombres de campos, catálogos y formularios. Refleja los archivos reales que comparte el cliente.
2. **Bonificación incentivo Q250 fija**: NO es un input editable del alta de empleado. Se aplica automáticamente como Q125 quincenal en planilla. El "BONO DECRETO 37-2001" variable en la planilla del cliente (Q850, Q1650) NO es la bonificación de ley; se renombró a `bonoExtraordinario` para evitar confusión.
3. **Turno mixto eliminado**: solo Diurno y Nocturno como tipos de turno asignables. La hora extra mixta sigue existiendo como concepto pero no se calcula porque ningún empleado tiene jornada mixta.
4. **Nombres en partes separadas**: `primerNombre`, `segundoNombre`, `tercerNombre`, `primerApellido`, `segundoApellido`, `apellidoCasada`. En planilla se concatenan como `APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2`.
5. **Catálogos MINTRAB con códigos numéricos**: pueblo de pertenencia, comunidad lingüística, estado civil, sexo, nivel académico, tipo de discapacidad, tipo/temporalidad de contrato. Los códigos son los que pide el MINTRAB.
6. **`lugarTrabajo` reemplazado por `departamento`** con catálogo cerrado (PRODUCCION, BODEGA, BODEGA_CEDIS, BODEGA_ZACAPA, VENTAS).
7. **Pre-Planilla y Planilla Final consolidados** en una sola ruta `/planilla` con dos estados (BORRADOR/CERRADA), no dos rutas separadas como decía el plan.
8. **Sin versionado de planilla**: regenerar sobreescribe el borrador. Cerrada queda inmutable.
9. **Sin doble turno** en asistencias. La spec real no lo muestra. Se puede agregar después si surge.
10. **ISR**: régimen opcional simplificado (5% sobre Q0–300k anual, 7% excedente, exención Q48k) con override editable por línea. Validar con contador.

### Stack confirmado

React 18 + Vite 5 + TypeScript strict, Tailwind v3 (NO v4) con CSS variables zinc, shadcn/ui escritos a mano en `src/components/ui/`, TanStack Query v5, TanStack Table v8, React Hook Form + Zod, React Router v6 (`createBrowserRouter`), Axios, sonner, lucide-react, date-fns, SheetJS (`xlsx`). Alias `@/*` → `src/*`.

### Backend / API

- Backend del cliente aún sin URL ni endpoints confirmados.
- Sistema corre en modo **mock con localStorage** (`VITE_USE_MOCK=true`).
- Cada módulo (`api/empleados.ts`, `api/turnos.ts`, `api/ausencias.ts`, `api/asistencias.ts`, `api/planilla.ts`, `api/bonificaciones.ts`) expone `mockApi` y `realApi` y elige según el flag.
- Storage keys actuales en localStorage:
  - `rototec.empleados.v2`
  - `rototec.turnos.v1`
  - `rototec.asignaciones_turno.v1`
  - `rototec.ausencias.v1`
  - `rototec.atrasos.v1`
  - `rototec.asistencias.v1`
  - `rototec.planillas.v1`
  - `rototec.bonificaciones.v1`

### Pendientes técnicos importantes

Cosas que se dejaron explícitamente fuera del MVP de cada fase y deberían retomarse:

1. **Códigos de banco reales** — el catálogo en `constants/guatemala.ts` tiene placeholders (520, 618, 781, etc.). Steven debe enviar el archivo con los nombres reales.
2. **Encriptados IGSS** — formato específico pendiente del cliente. No implementado.
3. **Pre-boletas individuales** (hoja por empleado en el Excel exportado). No implementado.
4. **Lista histórica de planillas pasadas** accesible desde la página. Hoy solo se muestra la del período seleccionado.
5. **Import CSV biométrico** (Video Time) — botón placeholder deshabilitado en `/asistencias`. Falta confirmar formato real.
6. **Doble turno por día** en asistencias. No implementado.
7. **Catálogos MINTRAB completos** — los códigos usados son aproximados; falta confirmar lista oficial completa de discapacidad, nivel académico, comunidad lingüística.
8. **Cálculo ISR validado con contador** — la fórmula simple actual puede no coincidir con cómo lo calcula Rototec hoy. Hay override por línea como mitigación.
9. **CENTRO DE COSTO** — campo en la planilla del cliente pero siempre vacío. Confirmar si se usa.
10. **Edición de monto en `/bonificaciones`** — solo se puede eliminar y recrear. Falta botón "Editar" reusando el dialog en modo edit.
11. **Bundle size**: ~963 kB JS (advertencia de Vite). Se puede mejorar con dynamic import de SheetJS si es problema en producción.
12. **Validación de campos cuando el formulario crece**: el alta de empleado tiene ~30 campos. Los formularios largos tipo "Personal" están en un solo tab que puede sentirse denso; podría dividirse mejor.

### Memorias persistentes (auto-memory de Claude Code)

Las siguientes memorias informan el comportamiento de Claude Code en este proyecto:

- `project_rototec_hr` — Frontend HR Guatemala, plan en disco, mock localStorage hasta tener microservicio
- `feedback_confirmar_antes_de_fase` — Resumen + confirmación explícita antes de iniciar nueva fase
- `reference_plan_hr` — Este archivo es la fuente de verdad de alcance
- `reference_especificacion_campos` — `ESPECIFICACION_CAMPOS.md` manda sobre el plan para campos
- `project_bono_decreto_diferente` — BONO DECRETO 37-2001 variable NO es la bonificación de ley

---

## Contexto del Proyecto

Sistema web de Recursos Humanos para empresa de producción en Guatemala. El backend (base de datos + microservicio REST) ya existe. Solo se construye el frontend.

**Restricciones críticas:**
- Plazo: 1 semana
- Entregable mínimo: hasta cálculo de horas extras y bonificaciones
- El sistema lo usará principalmente 1 persona (nóminas)
- Debe generar archivos compatibles con el Excel actual de nómina que usa Contabilidad

---

## Stack Tecnológico

```
Framework:     React 18 + Vite + TypeScript
UI Components: shadcn/ui (https://ui.shadcn.com)
Estilos:       Tailwind CSS v3
Formularios:   React Hook Form + Zod
Estado:        TanStack Query v5
Tablas:        TanStack Table v8
Routing:       React Router v6
HTTP:          Axios
Fechas:        date-fns
Export Excel:  SheetJS (xlsx)
Icons:         lucide-react
```

---

## Setup Inicial (ejecutar antes de cualquier fase)

```bash
npm create vite@latest rototec-hr -- --template react-ts
cd rototec-hr
npm install

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
npx shadcn@latest init
# Seleccionar: Default style, Zinc color, CSS variables: yes

# Dependencias principales
npm install react-router-dom axios @tanstack/react-query @tanstack/react-table
npm install react-hook-form @hookform/resolvers zod
npm install date-fns xlsx lucide-react
npm install @tanstack/react-query-devtools

# Componentes shadcn necesarios
npx shadcn@latest add button input label select checkbox badge
npx shadcn@latest add table card dialog form tabs toast
npx shadcn@latest add dropdown-menu separator skeleton alert
npx shadcn@latest add popover calendar command
```

### Estructura de Carpetas

```
src/
├── api/              # Llamadas al microservicio (axios)
│   ├── client.ts     # Instancia axios con baseURL y interceptores
│   ├── employees.ts
│   ├── shifts.ts
│   ├── absences.ts
│   ├── attendance.ts
│   └── payroll.ts
├── components/
│   ├── layout/       # Sidebar, Header, AppShell
│   └── ui/           # Re-exports de shadcn
├── pages/
│   ├── employees/
│   ├── shifts/
│   ├── absences/
│   ├── attendance/
│   ├── payroll/
│   └── reports/
├── hooks/            # Custom hooks con TanStack Query
├── types/            # TypeScript interfaces globales
├── lib/
│   ├── utils.ts      # cn(), formatters
│   ├── calculations.ts  # Lógica de horas extras
│   └── validators.ts    # Schemas Zod reutilizables
└── constants/
    └── guatemala.ts  # Catálogos: bancos, municipios, departamentos, etc.
```

### Variables de Entorno

Crear `.env.local`:
```
VITE_API_BASE_URL=http://localhost:XXXX/api
```

### `src/api/client.ts`

```typescript
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err.response?.data)
    return Promise.reject(err)
  }
)
```

---

## FASE 1 — Layout Base + Módulo de Empleados
**Tiempo estimado: Día 1**

### 1.1 Layout Principal

Crear `src/components/layout/AppShell.tsx`:
- Sidebar fijo izquierdo con navegación principal
- Header con nombre del módulo activo
- Área de contenido principal con scroll

**Items del sidebar (en orden):**
1. Empleados
2. Turnos
3. Asistencias
4. Ausencias
5. Pre-Planilla
6. Planilla Final

### 1.2 Tipos Base

Crear `src/types/index.ts` con estas interfaces:

```typescript
export type JornadaType = 'DIURNA' | 'NOCTURNA' | 'MIXTA'
export type SexoType = 'M' | 'F'
export type EstadoCivilType = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO' | 'UNION_LIBRE'
export type FormaPagoType = 'TRANSFERENCIA' | 'CHEQUE'
export type EstadoEmpleadoType = 'ACTIVO' | 'BAJA'
export type TipoBajaType = 'RENUNCIA' | 'DESPIDO' | 'ABANDONO'

export interface Empleado {
  id: string
  // Datos personales
  nombre: string
  apellido: string
  dpi: string
  nit: string
  igss: string
  fechaNacimiento: string       // ISO date
  sexo: SexoType
  estadoCivil: EstadoCivilType
  numerHijos: number
  profesion: string
  // Lingüístico/cultural (Ministerio de Trabajo)
  puebloPertenencia?: string
  comunidadLinguistica?: string
  nacionalidad: string
  municipioNacimiento?: string
  departamentoNacimiento?: string
  // Laboral
  lugarTrabajo: string          // Departamento/área
  puesto: string
  jornada: JornadaType
  salarioBase: number
  bonificacionIncentivo: number // Q250 fijo por ley
  fechaIngreso: string
  // Banco
  formaPago: FormaPagoType
  banco?: string
  numeroCuenta?: string
  // Estado
  estado: EstadoEmpleadoType
  tipoBaja?: TipoBajaType
  fechaBaja?: string
  motivoBaja?: string
}
```

### 1.3 Página de Empleados

**Vista Lista (`/empleados`):**
- Tabla con columnas: Nombre completo, DPI, Puesto, Jornada, Salario Base, Fecha Ingreso, Estado, Acciones
- Filtro por texto (nombre/DPI) y por estado (activo/baja)
- Botón "Nuevo Empleado" abre formulario en modal o drawer
- Badge de color para estado: verde=activo, rojo=baja
- Paginación (20 por página)

**Formulario de Alta (`modal/drawer`):**

Organizar en tabs para no abrumar:
- Tab 1: **Datos Personales** — nombre, apellido, DPI, NIT, IGSS, fecha nacimiento, sexo, estado civil, hijos, profesión
- Tab 2: **Laboral** — lugar trabajo, puesto, jornada, salario base, fecha ingreso
- Tab 3: **Bancario** — forma de pago, banco (select con catálogo), número de cuenta
- Tab 4: **Ministerio de Trabajo** — pueblo pertenencia, comunidad lingüística, nacionalidad, municipio/depto nacimiento

Validaciones Zod requeridas:
- DPI: exactamente 13 dígitos numéricos
- NIT: formato guatemalteco (números + K al final)
- Salario base: mínimo Q2,500 (salario mínimo Guatemala 2025)
- Fecha ingreso: no puede ser futura

**Vista Detalle (`/empleados/:id`):**
- Muestra todos los datos del empleado
- Botón editar
- Sección de baja: si está activo, mostrar botón "Dar de Baja" que abre modal con tipo de baja, fecha y motivo

### 1.4 Constantes Guatemala

Crear `src/constants/guatemala.ts`:

```typescript
export const BANCOS_GUATEMALA = [
  { codigo: '1', nombre: 'Banco Industrial' },
  { codigo: '2', nombre: 'Banrural' },
  { codigo: '3', nombre: 'BAC Credomatic' },
  { codigo: '4', nombre: 'G&T Continental' },
  { codigo: '5', nombre: 'Banco Agromercantil (BAM)' },
  { codigo: '6', nombre: 'Banco de los Trabajadores (Bantrab)' },
  { codigo: '7', nombre: 'Banco Promerica' },
  { codigo: '8', nombre: 'Citibank Guatemala' },
  { codigo: '9', nombre: 'Banco Ficohsa' },
  { codigo: '10', nombre: 'Vivibanco' },
]

export const PUEBLOS_GUATEMALA = [
  'Maya', 'Garífuna', 'Xinka', 'Afrodescendiente', 'Mestizo/Ladino', 'Otro'
]

export const JORNADAS = [
  { value: 'DIURNA', label: 'Diurna', horasUmbral: 44 },
  { value: 'NOCTURNA', label: 'Nocturna', horasUmbral: 36 },
  { value: 'MIXTA', label: 'Mixta', horasUmbral: 42 },
]
```

---

## FASE 2 — Catálogo de Turnos
**Tiempo estimado: Día 2 — mañana**

### Tipos

```typescript
export type TipoTurno = 'DIURNO' | 'NOCTURNO'

export interface Turno {
  id: string
  nombre: string               // Ej: "Diurno con almuerzo"
  tipo: TipoTurno
  horaEntrada: string          // "06:00"
  horaSalida: string           // "14:00"
  incluyeHoraAlmuerzo: boolean
  horasPlanificadas: number    // Se calcula: (salida - entrada) - (almuerzo ? 1 : 0)
  horasUmbralExtras: number    // 44 diurno, 36 nocturno, 42 mixto
  activo: boolean
}
```

**Turnos base a crear por defecto al entrar al catálogo:**

| Nombre | Tipo | Entrada | Salida | Almuerzo | Horas Plan. |
|--------|------|---------|--------|----------|-------------|
| Diurno con almuerzo | DIURNO | 06:00 | 15:00 | Sí | 8h |
| Diurno sin almuerzo | DIURNO | 06:00 | 14:00 | No | 8h |
| Nocturno con almuerzo | NOCTURNO | 18:00 | 03:00 | Sí | 8h |
| Nocturno sin almuerzo | NOCTURNO | 18:00 | 02:00 | No | 8h |

### Página de Turnos (`/turnos`)

- Tabla simple con todos los turnos
- Botón crear nuevo turno
- Formulario: nombre, tipo (diurna/nocturna), hora entrada, hora salida, toggle almuerzo
- Las horas planificadas se calculan automáticamente al ingresar entrada/salida/almuerzo
- No permitir eliminar turno si tiene empleados asignados — mostrar mensaje de error claro

### Asignación de Turno a Empleado

En la página detalle del empleado, agregar sección **"Turno Actual"**:
- Select para escoger turno del catálogo
- Campo de fecha de vigencia
- Historial de cambios de turno (tabla simple)

---

## FASE 3 — Control de Ausencias
**Tiempo estimado: Día 2 — tarde / Día 3 — mañana**

### Tipos

```typescript
export type TipoAusencia =
  | 'INJUSTIFICADA'          // Descuenta día + séptimo
  | 'PERMISO_CON_GOCE'       // No descuenta
  | 'PERMISO_SIN_GOCE'       // Descuenta día
  | 'SUSPENSION_IGSS'        // IGSS paga, empresa no descuenta
  | 'VACACIONES'             // Días de vacaciones acumulados
  | 'MATRIMONIO'             // 5 días con goce por ley
  | 'FALLECIMIENTO_FAMILIAR' // 3 días con goce por ley
  | 'NACIMIENTO_HIJO'        // 2 días con goce por ley

export interface ReglasAusencia {
  tipo: TipoAusencia
  label: string
  descontarDia: boolean
  descontarSeptimo: boolean
  requiereDocumento: boolean
  diasLegales?: number       // Para matrimonio, fallecimiento, etc.
  descripcion: string        // Para que el usuario entienda qué aplica
}

export interface Ausencia {
  id: string
  empleadoId: string
  fecha: string
  tipoAusencia: TipoAusencia
  presentoConstancia: boolean
  tipoConstancia?: string
  noDescontar: boolean        // Override manual autorizado
  noDescontarMotivo?: string
  cargadoPor: string
  observaciones?: string
  // Calculados
  descuentoDia: number
  descuentoSeptimo: number
}
```

### Catálogo de Reglas (hardcoded en `src/constants/ausencias.ts`)

```typescript
export const REGLAS_AUSENCIA: ReglasAusencia[] = [
  {
    tipo: 'INJUSTIFICADA',
    label: 'Injustificada',
    descontarDia: true,
    descontarSeptimo: true,
    requiereDocumento: false,
    descripcion: 'Se descuenta el día trabajado más el día de descanso (séptimo)'
  },
  {
    tipo: 'PERMISO_CON_GOCE',
    label: 'Permiso con goce de sueldo',
    descontarDia: false,
    descontarSeptimo: false,
    requiereDocumento: true,
    descripcion: 'Autorizado por gerencia. No genera descuento.'
  },
  {
    tipo: 'PERMISO_SIN_GOCE',
    label: 'Permiso sin goce de sueldo',
    descontarDia: true,
    descontarSeptimo: false,
    requiereDocumento: true,
    descripcion: 'Se descuenta únicamente el día de ausencia.'
  },
  {
    tipo: 'SUSPENSION_IGSS',
    label: 'Suspensión IGSS',
    descontarDia: false,
    descontarSeptimo: false,
    requiereDocumento: true,
    descripcion: 'Con incapacidad válida del IGSS. El IGSS paga los días.'
  },
  {
    tipo: 'VACACIONES',
    label: 'Vacaciones',
    descontarDia: false,
    descontarSeptimo: false,
    requiereDocumento: false,
    descripcion: 'Días de vacaciones aprobados. Se pagan normalmente.'
  },
  {
    tipo: 'MATRIMONIO',
    label: 'Matrimonio',
    descontarDia: false,
    descontarSeptimo: false,
    requiereDocumento: true,
    diasLegales: 5,
    descripcion: 'Artículo 61 CT: 5 días con goce de sueldo.'
  },
  {
    tipo: 'FALLECIMIENTO_FAMILIAR',
    label: 'Fallecimiento de familiar',
    descontarDia: false,
    descontarSeptimo: false,
    requiereDocumento: true,
    diasLegales: 3,
    descripcion: 'Artículo 61 CT: 3 días con goce de sueldo.'
  },
  {
    tipo: 'NACIMIENTO_HIJO',
    label: 'Nacimiento de hijo',
    descontarDia: false,
    descontarSeptimo: false,
    requiereDocumento: true,
    diasLegales: 2,
    descripcion: 'Artículo 61 CT: 2 días con goce de sueldo.'
  },
]
```

### Página de Ausencias (`/ausencias`)

**Vista principal:**
- Filtro por quincena (selector de período: 1-15 o 16-fin de mes)
- Filtro por empleado
- Tabla: Empleado, Fecha, Tipo, Constancia, Descuento Día, Descuento Séptimo, Cargado por
- Botón "Registrar Ausencia"

**Formulario de registro:**
- Select de empleado (búsqueda por nombre)
- Date picker de fecha
- Select de tipo de ausencia → al seleccionar, mostrar cuadro informativo con las reglas que aplican
- Toggle "Presentó constancia"
- Toggle "No descontar" (visible solo para rol autorizado) → campo de motivo
- Observaciones (opcional)
- Preview en tiempo real: "Esta ausencia generará un descuento de Q___"

**Lógica de descuento del séptimo:**
El séptimo solo se descuenta una vez por semana aunque haya múltiples ausencias injustificadas en esa semana. Implementar esta validación al guardar.

---

## FASE 4 — Registro de Asistencias y Cálculo de Horas Extras
**Tiempo estimado: Día 3 — tarde / Día 4**

### Tipos

```typescript
export interface RegistroAsistencia {
  id: string
  empleadoId: string
  fecha: string              // ISO date
  turnoAsignadoId: string
  turnoAsignado: Turno
  horaEntradaReal?: string   // "07:34"
  horaSalidaReal?: string    // "16:15"
  esDobleTurno: boolean
  turnoSecundarioId?: string // Si es doble turno
  horaEntradaSecundaria?: string
  horaSalidaSecundaria?: string
  // Calculados
  horasTrabajadas: number
  horasExtras: number
  horasDeficit: number       // Si se fue antes (negativo)
  tipoHorasExtras: 'DIURNA' | 'NOCTURNA' | 'NINGUNA'
}

export interface ResumenSemanalExtras {
  empleadoId: string
  semanaInicio: string       // ISO date lunes
  semanaFin: string          // ISO date domingo
  horasTotalesTrabajadas: number
  horasUmbral: number        // 44, 42 o 36 según jornada predominante
  horasExtrasDiurnas: number
  horasExtrasNocturnas: number
  horasExtrasMixtas: number
  calculoPorDia: boolean     // true si hubo cambio de turno en la semana
}
```

### Página de Asistencias (`/asistencias`)

**Selector de período:**
- Quincena actual por defecto
- Navegar entre quincenas

**Tabla por empleado:**

Para cada empleado, mostrar tabla diaria con columnas:
| Fecha | Día | Turno | Entrada Plan. | Salida Plan. | Entrada Real | Salida Real | Horas Plan. | Horas Trab. | Extras |
|-------|-----|-------|--------------|-------------|-------------|------------|-------------|------------|--------|

- Fila con color si hay déficit (rojo suave) o extras (verde suave)
- Columna "Extras" muestra valor negativo si se fue antes (ej: `-0:45`)
- Fila de totales semanales al final de cada semana

**Ingreso de marcajes:**
- Opción 1: editar celda directamente en tabla (inline edit)
- Opción 2: importar CSV del biométrico (Video Time exporta CSV)

**Resumen de horas extras por empleado (semanal):**
Mostrar card por empleado con:
- Total horas trabajadas
- Umbral según jornada
- Horas extras diurnas / nocturnas
- Si hubo cambio de turno → badge "Cálculo diario"

### Lógica de Cálculo (`src/lib/calculations.ts`)

```typescript
/**
 * Reglas de negocio Rototec:
 * - Diurno: extras después de 44h semanales
 * - Nocturno: extras después de 36h semanales
 * - Mixto: extras después de 42h semanales
 * - Se descuenta 1h de almuerzo por día SI el turno lo incluye
 * - Si el turno cambia durante la semana → calcular por día
 * - Doble turno: dos registros separados en el mismo día
 * - No hay reposición de horas: si falta, se descuenta
 */

export function calcularHorasTrabajadas(
  horaEntrada: string,
  horaSalida: string,
  incluyeAlmuerzo: boolean
): number { ... }

export function determinarCalculoPorDia(
  registrosSemana: RegistroAsistencia[]
): boolean {
  // Retorna true si el empleado tuvo más de un tipo de turno en la semana
}

export function calcularExtrasSemanales(
  registros: RegistroAsistencia[],
  umbralHoras: number
): ResumenSemanalExtras { ... }

export function calcularExtrasPorDia(
  registros: RegistroAsistencia[]
): ResumenSemanalExtras { ... }
```

---

## FASE 5 — Pre-Planilla y Planilla Final
**Tiempo estimado: Día 5**

### Tipos

```typescript
export type EstadoPlanilla = 'BORRADOR' | 'EN_REVISION' | 'CERRADA'

export interface LineaPlanilla {
  empleadoId: string
  empleado: Empleado
  diasTrabajados: number
  salarioDiario: number
  salarioPeriodo: number
  bonificacionIncentivo: number  // Q125 quincenal (Q250/2)
  otrosBonos: number
  horasExtrasDiurnas: number
  valorHoraExtraDiurna: number
  horasExtrasNocturnas: number
  valorHoraExtraNocturna: number
  totalHorasExtras: number
  descuentoIGSS: number          // 4.83% del salario
  descuentoISR: number
  otrosDescuentos: number
  totalDescuentos: number
  liquidoRecibir: number
  formaPago: FormaPagoType
  numeroCuenta?: string
  banco?: string
}

export interface Planilla {
  id: string
  periodo: string                // "2026-05-01_2026-05-15"
  fechaGeneracion: string
  estado: EstadoPlanilla
  version: number                // Incrementa cada vez que se regenera
  lineas: LineaPlanilla[]
  totalBruto: number
  totalDescuentos: number
  totalLiquido: number
  generadoPor: string
  cerradoPor?: string
  fechaCierre?: string
}
```

### Página Pre-Planilla (`/pre-planilla`)

**Paso 1 — Selección de período:**
- Date range picker (1-15 o 16-fin de mes)
- Botón "Generar Pre-Planilla"
- Si existe borrador del período, pregunta si desea regenerar

**Paso 2 — Vista de revisión:**
- Tabla con todas las líneas (un empleado por fila)
- Columnas colapsables por categoría (salario base, extras, descuentos, líquido)
- Totales al pie de tabla
- Badge con versión actual: "Borrador v3"
- Botones: "Regenerar" y "Cerrar Planilla"

**Al regenerar:** crea nueva versión, mantiene historial de versiones anteriores

**Al cerrar:**
- Modal de confirmación: "Esta acción bloqueará el período. No se podrán agregar ausencias ni modificar asistencias de estas fechas."
- Genera automáticamente:
  1. Archivo Excel (formato nómina existente de Rototec)
  2. Archivo encriptado IGSS
  3. Pre-boletas individuales (una hoja por empleado en el Excel)

### Export Excel (`src/lib/exportPlanilla.ts`)

Usar SheetJS para generar el archivo. El formato debe respetar la estructura del Excel actual:
- Hoja 1: Nómina completa (mismas columnas que el Excel actual)
- Hoja 2: Encriptado IGSS
- Hoja 3: Encriptado horas extras
- Hoja por empleado: Pre-boleta individual con detalle de horas extras por día

**Fórmula IGSS Guatemala 2026:**
- Cuota laboral: 4.83% del salario ordinario
- Cuota patronal: 12.67% del salario ordinario

**Fórmula ISR Guatemala:**
- Aplicar tabla de retención según salario anual proyectado
- Régimen opcional simplificado: 5% sobre Q0-Q30,000 anuales, 7% sobre el excedente

---

## FASE 6 — Bonificaciones
**Tiempo estimado: Día 6 — mañana**

### Tipos

```typescript
export type TipoBonificacion =
  | 'INCENTIVO_LEY'    // Q250 mensuales, siempre
  | 'PRODUCCION'       // Variable por quincena
  | 'ACABADOS'
  | 'POLISON'
  | 'OTRO'

export interface Bonificacion {
  id: string
  empleadoId: string
  periodo: string
  tipo: TipoBonificacion
  monto: number
  descripcion?: string
}
```

### Página de Bonificaciones

- Tabla por período filtrable
- Formulario para agregar bonificación a empleado
- La bonificación de incentivo de ley (Q250) se agrega automáticamente al generar planilla
- Las demás se ingresan manualmente antes de generar

---

## FASE 7 — Detalle de Horas Extras para Empleados
**Tiempo estimado: Día 6 — tarde**

### Componente `DetalleHorasExtrasEmpleado`

Formato que se incluirá en la pre-boleta y que se puede imprimir por separado.

**Tabla por día:**
| Fecha | Día | Turno | Entrada Plan. | Salida Plan. | Entrada Real | Salida Real | Diferencia |
|-------|-----|-------|--------------|-------------|-------------|------------|-----------|

- Diferencia positiva: horas extras ganadas ese día
- Diferencia negativa: horas que no cumplió (mostrar en rojo con signo `-`)

**Resumen al pie:**
```
Horas planificadas en el período:  ___h
Horas trabajadas en el período:    ___h
Horas extras diurnas:              ___h  × Q___ = Q___
Horas extras nocturnas:            ___h  × Q___ = Q___
Total bonificación horas extras:   Q___
```

---

## FASE 8 — Buffer / QA
**Tiempo estimado: Día 7**

### Checklist de Pruebas

- [ ] Alta de empleado completa con todos los campos
- [ ] Baja de empleado (renuncia, despido, abandono)
- [ ] Cambio de turno a mitad de semana → verificar que cálculo cambia a diario
- [ ] Doble turno en un mismo día
- [ ] Ausencia injustificada → verificar descuento de séptimo una sola vez por semana
- [ ] Empleado con suspensión IGSS → no genera descuento
- [ ] Generar pre-planilla → revisar totales
- [ ] Cerrar planilla → verificar bloqueo del período
- [ ] Export Excel → abrir en Excel y verificar formato

---

## Notas de Negocio Importantes

### Séptimo día (Guatemala)
Cada semana laboral (lunes a domingo) el empleado tiene derecho a un día de descanso remunerado. Si falta injustificadamente, pierde también ese séptimo. Solo se descuenta una vez por semana aunque falte varios días.

### Horas extras Guatemala
- **Diurnas**: las que excedan 44h semanales en jornada diurna. Se pagan a 1.5× el valor de la hora ordinaria.
- **Nocturnas**: las que excedan 36h semanales en jornada nocturna. Se pagan a 1.5× el valor de la hora ordinaria nocturna.
- **Mixtas**: las que excedan 42h semanales. (Rototec decidió eliminar turnos mixtos, pero mantener la lógica por si regresa)

### Valor de la hora ordinaria
```
Valor hora = Salario mensual / 30 / (horas diarias según jornada)
```

### Bonificación incentivo (Decreto 78-89)
Q250 mensuales fijos para todos los trabajadores del sector privado. No es parte del salario para efectos de IGSS ni indemnización.

### IGSS
Solo se descuenta sobre el salario ordinario (no sobre horas extras ni bonificaciones en la mayoría de casos). Verificar con el contador de Rototec si aplican extras al IGSS.

---

## Preguntas Pendientes a Resolver con el Cliente

1. ¿Cuál es la URL base del microservicio existente? → Actualizar `.env.local`
2. ¿Qué endpoints ya existen en el microservicio?
3. ¿Tienen columnas adicionales en el Excel de nómina que usa Contabilidad que no están en este plan?
4. ¿Quién cargará las bajas: nóminas o recursos humanos?
5. ¿El microservicio ya maneja autenticación/roles o es acceso libre?
6. ¿Las pre-boletas físicas siguen siendo obligatorias o se puede pasar a digital?
7. ¿Los encriptados de IGSS tienen formato específico que deba respetar?

---

## Cómo usar este plan con Claude Code

```bash
# En PowerShell, dentro de la carpeta del proyecto:
claude

# Luego dentro de Claude Code:
# "Lee el archivo PLAN_HR_ROTOTEC.md y ejecuta la Fase 1 completa.
#  Antes de empezar cada fase, muéstrame un resumen de lo que vas a hacer
#  y espera mi confirmación."
```

**Comandos útiles durante el desarrollo:**
```bash
# Ver el proyecto corriendo
npm run dev

# Verificar tipos TypeScript sin errores
npx tsc --noEmit

# Agregar nuevo componente shadcn cuando se necesite
npx shadcn@latest add [componente]
```
