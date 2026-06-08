# Diseño — Wizard de Alta de Empleado (stepper dinámico)

> Fecha: 2026-06-03 · Proyecto: RototecRH (frontend) · Backend: microservicio `recursos-humanos` (`/rrhh`)

## 1. Contexto y objetivo

El alta de empleado vive hoy en `EmpleadoFormSheet.tsx` (drawer lateral, 4 tabs) con catálogos parcialmente hardcodeados y apuntando a un contrato de API viejo (`/empleados`, modelo camelCase). El backend nuevo expone empleados y catálogos bajo `/rrhh`, con un `CreateEmployeeDto` en **snake_case** y una **cascada organizacional** (empresa → departamento → sub-departamento → puesto), además de un alta espejo en **Biotime** (biométrico) que devuelve un **código** que el personal necesita para registrar al empleado en el reloj.

Objetivo: reemplazar el alta por un **wizard (stepper) de 9 pasos**, dinámico y pulido, que:
- consuma los catálogos en cascada desde el API y vaya habilitando cada dropdown;
- garantice que **los campos obligatorios nunca lleguen nulos, vacíos o con formato inválido** (validación por paso, no se avanza si el paso es inválido);
- al crear, muestre un **diálogo de éxito** con los datos básicos del empleado y, sobre todo, el **código de Biotime**, exigiendo **copiarlo** para poder cerrar.

## 2. Alcance

**Incluye:** el flujo de **creación** de empleado (wizard + capa de datos + diálogo de éxito).

**No incluye (queda igual por ahora):** lista, detalle, edición, baja/reactivar y el `EmpleadoFormSheet` actual. La migración de esos al modelo/contrato nuevo es trabajo aparte.

## 3. Decisiones tomadas

- **Layout:** página completa en ruta propia `/empleados/nuevo` (dentro del `AppShell`), con riel de pasos vertical + panel de contenido.
- **Catálogos:** cascada (`/rrhh/company/*`) y biométrico (`/rrhh/biotime/*`) desde el API; los catálogos MINTRAB y bancos **se mantienen como constantes** en `src/constants/guatemala.ts`.
- **Modelo:** nuevo input **snake_case** que calza 1:1 con `CreateEmployeeDto` (sin adapter de nombres). Acotado al flujo de creación.
- **Backend:** real, vía la URL ya configurada en `.env` (`VITE_API_BASE_URL` + prefijo `/rrhh`, `USE_MOCK=false`). Se usa la instancia `rrhhApi` de `src/api/client.ts`.

## 4. Arquitectura

- **Ruta:** nueva entrada en `router.tsx` → `/empleados/nuevo` que renderiza `EmpleadoCreateWizard`. El botón "Nuevo Empleado" de `EmpleadosListPage` pasa de abrir el `Sheet` a `navigate('/empleados/nuevo')`.
- **Estado del form:** un **único** `useForm` (react-hook-form) cuyos valores son snake_case (espejo de `CreateEmployeeDto`). Un Zod schema completo, con los campos agrupados por paso para poder validar por slices.
- **Gating por paso:** `Siguiente` ejecuta `await form.trigger(camposDelPaso)`; sólo avanza si pasa. El riel marca cada paso como pendiente / activo / completado / con error. `Atrás` nunca valida.
- **Stepper UI:** componente nuevo `components/ui/stepper.tsx` (riel vertical accesible, sin dependencias nuevas; estados visuales con el tema zinc existente).
- **Submit:** sólo habilitado en el último paso; valida todo el schema y llama la mutación de creación.

## 5. Catálogos y capa de API

Instancia `rrhhApi` (base `.env` + `/rrhh`). Nuevos módulos en `src/api/` con sus hooks TanStack Query (patrón `QK` + `staleTime`):

| Hook | Endpoint | Notas |
|---|---|---|
| `usePaises()` | `GET /company/paises` | independiente |
| `useEmpresas()` | `GET /company/empresas` | independiente |
| `useDepartamentos(empresaId)` | `GET /company/departamentos/:empresaId` | `enabled: !!empresaId` |
| `useSubDepartamentos(departamentoId)` | `GET /company/sub-departamentos/:departamentoId` | `enabled: !!departamentoId` |
| `usePuestos(subDepartamentoId)` | `GET /company/puestos/:subDepartamentoId` | `enabled: !!subDepartamentoId` |
| `useBiotimeDepartamentos()` | `GET /biotime/departamentos` | items `{ id, dept_code, dept_name }` |
| `useBiotimeUbicaciones()` | `GET /biotime/ubicaciones` | items `{ id, area_code, area_name }` |

- Al cambiar una selección de la cascada se **resetean los hijos** (p.ej. cambiar empresa limpia departamento/sub-depto/puesto) para no enviar combinaciones inválidas.
- Cada dropdown muestra `Skeleton`/disabled mientras `isLoading` y mensaje si error/vacío.
- MINTRAB y bancos: desde `guatemala.ts` (`SEXOS`, `ESTADOS_CIVILES`, `PUEBLOS_GUATEMALA`, `COMUNIDADES_LINGUISTICAS`, `JORNADAS`, `TEMPORALIDAD_CONTRATO`, `TIPOS_CONTRATO`, `TIPOS_DISCAPACIDAD`, `BANCOS_GUATEMALA`, `FORMAS_PAGO`, `TIPOS_CUENTA`).

## 6. Pasos y campos

Requeridos = obligatorios de negocio (`ESPECIFICACION_CAMPOS.md`), **más estrictos** que el DTO (que sólo exige `primer_nombre`/`primer_apellido`). Campo del form (snake_case) = campo de `CreateEmployeeDto`.

**Paso 1 — País:** `PAIS` *(req)* — select desde `usePaises`.
**Paso 2 — Empresa:** `empresa_id` *(req)* — select desde `useEmpresas`.
**Paso 3 — Departamento:** `id_departamento` *(req)* — select `useDepartamentos(empresa_id)`.
**Paso 4 — Sub-departamento:** `id_sub_departamento` *(req)* — select `useSubDepartamentos(id_departamento)`.
**Paso 5 — Puesto:** `id_puesto` *(req)* — select `usePuestos(id_sub_departamento)`.

**Paso 6 — Datos personales / documentos:**
- `primer_nombre` *(req)*, `segundo_nombre`, `tercer_nombre`, `primer_apellido` *(req)*, `segundo_apellido`, `apellido_casada` (habilitado si `estado_civil = CASADO`)
- `numero_identificacion_nacional` (DPI) *(req, 13 dígitos)*
- `id_tributario` (NIT) *(req, formato NIT: dígitos opcionalmente +K)*
- `id_seguro_social` (IGSS) *(req)*
- `fecha_nacimiento` *(req, fecha válida, no futura)*
- `sexo` *(req, MINTRAB)*, `estado_civil` *(req, MINTRAB)*
- `cantidad_hijos` *(req, entero ≥ 0, default 0)*
- `tipo_discapacidad` *(req, MINTRAB)*
- contacto: `telefono`, `correo` (formato email si viene), `direccion` *(opcionales)*
- `pasaporte` *(opcional)*

**Paso 7 — Datos culturales (MINTRAB):**
- `pueblo_pertenencia` *(req, MINTRAB)*, `comunidad_linguistica` *(req, MINTRAB)*
- `grupo_etnico`, `lugar_nacimiento_municipio`, `permiso_extranjero` *(opcionales)*
- códigos de nacimiento/vecindad (`codigo_departamento_nacimiento`, `codigo_municipio_nacimiento`, `departamento_vecindad_abreviatura`, `municipio_vecindad_abreviatura`) *(opcionales, MINTRAB)*

**Paso 8 — Contrato y pago:**
- `jornada` *(req: diurna/nocturna)*, `temporalidad_contrato` *(req)*, `tipo_contrato` *(req)*
- `fecha_contratacion` *(req, no futura)*, `fecha_reingreso` *(opcional)*
- `salario_base_contrato` *(req, ≥ Q2,500 `SALARIO_BASE_MINIMO_VALIDACION`)*
- `profesion`, `titulo` *(opcionales)*
- `forma_pago` *(req)*; si `forma_pago = TRANSFERENCIA`: `codigo_banco` *(req)*, `numero_cuenta` *(req, ≥4)*, `tipo_cuenta` *(req)* (deshabilitados si no es transferencia)
- `bonificacion_decreto_base_contrato` **NO** se captura (la pone el backend, Q250 de ley).

**Paso 9 — Configuración biométrico:**
- `departamento_biotime` *(req, number = `id` del depto Biotime)* — select `useBiotimeDepartamentos`
- `ubicacion_biometrico` *(req, number = `id` del área Biotime)* — select `useBiotimeUbicaciones`

**No se piden** (default/baja/auto): `esta_activo`, `tipo_baja`, `motivo_baja`, `fecha_baja`, `fecha_alta_seguro`, `fecha_baja_seguro`, `codigo_ocupacion`, `id_codVendSAP`.

## 7. Submit y manejo de errores

- Mutación `useCreateEmpleado()` → `empleadosApi.create(input)` → `rrhhApi.post('/empleados', input)`. `input` es el objeto snake_case tal cual (sin remapeo).
- `onSuccess`: invalida `QK.all` (lista) y abre el diálogo de éxito con la respuesta.
- Errores: el interceptor ya togglea toasts de red/5xx; los 4xx llegan al `onError`. Caso clave: **DPI duplicado** → el backend responde 400 *"Ya existe un empleado con ese número de identificación"*; se muestra en el campo `numero_identificacion_nacional` (paso 6) y se navega a ese paso.

## 8. Diálogo de éxito (`BiotimeCodeDialog`)

- Contenido: estado "Empleado creado ✓", **ID** (de la respuesta), **nombre completo** (compuesto de los nombres/apellidos), **puesto** y **departamento** (labels ya seleccionados en la cascada), y el **Código Biotime** (`codigoEmpleadoBio` de la respuesta) destacado.
- **Copy-to-close gate:** botón "Copiar código" usa `navigator.clipboard.writeText`. Mientras no se copie:
  - el botón "Cerrar" está deshabilitado;
  - se bloquean `onEscapeKeyDown`, `onInteractOutside` y `onOpenChange(false)` del `Dialog` de Radix (`e.preventDefault()`), de modo que no se puede cerrar por Esc, click afuera ni la X.
- Tras copiar: feedback ("¡Copiado!"), se habilita "Cerrar"; al cerrar → `navigate('/empleados')`.

## 9. Modelo de datos

Nuevo tipo en `src/types/index.ts`:
```ts
export interface CreateEmpleadoInput {
  // cascada
  PAIS: string; empresa_id: number; id_departamento: number;
  id_sub_departamento: number; id_puesto: number;
  // personales/documentos
  primer_nombre: string; segundo_nombre?: string; tercer_nombre?: string;
  primer_apellido: string; segundo_apellido?: string; apellido_casada?: string;
  numero_identificacion_nacional: string; id_tributario: string; id_seguro_social: string;
  fecha_nacimiento: string; sexo: string; estado_civil: string;
  cantidad_hijos: number; tipo_discapacidad: string;
  telefono?: string; correo?: string; direccion?: string; pasaporte?: string;
  // culturales
  pueblo_pertenencia: string; comunidad_linguistica: string; grupo_etnico?: string;
  lugar_nacimiento_municipio?: string; permiso_extranjero?: string;
  codigo_departamento_nacimiento?: string; codigo_municipio_nacimiento?: string;
  departamento_vecindad_abreviatura?: string; municipio_vecindad_abreviatura?: string;
  // contrato/pago
  jornada: string; temporalidad_contrato: string; tipo_contrato: string;
  fecha_contratacion: string; fecha_reingreso?: string; salario_base_contrato: number;
  profesion?: string; titulo?: string;
  forma_pago: string; codigo_banco?: string; numero_cuenta?: string; tipo_cuenta?: string;
  // biométrico
  departamento_biotime: number; ubicacion_biometrico: number;
}
```
El Zod schema (`empleadoCreateSchema`) en `src/lib/validators.ts` refleja estos campos con sus reglas; `superRefine` para los bancarios condicionados a `forma_pago`.

La creación devuelve el **registro creado del backend** (entidad en camelCase, incluye `id` y `codigoEmpleadoBio`); se tipa con un `CreateEmpleadoResponse` mínimo (`{ id: number; codigoEmpleadoBio: number | null }` + lo que se use) para alimentar el diálogo de éxito.

## 10. Archivos

**Nuevos:**
- `src/pages/empleados/EmpleadoCreateWizard.tsx` (orquesta pasos + RHF + submit)
- `src/pages/empleados/wizard/` → un componente por paso (Step1Pais … Step9Biotime) o secciones
- `src/pages/empleados/BiotimeCodeDialog.tsx`
- `src/components/ui/stepper.tsx`
- `src/api/company.ts`, `src/api/biotime.ts`
- `src/hooks/useCompanyCatalogos.ts`, `src/hooks/useBiotime.ts`

**Modificar:**
- `src/router.tsx` (ruta `/empleados/nuevo`)
- `src/pages/empleados/EmpleadosListPage.tsx` (botón → `navigate`)
- `src/types/index.ts` (`CreateEmpleadoInput`)
- `src/lib/validators.ts` (`empleadoCreateSchema`)
- `src/api/employees.ts` (`realApi.create` → `rrhhApi.post('/empleados', …)`)
- `src/hooks/useEmpleados.ts` (`useCreateEmpleado` tipado a `CreateEmpleadoInput`)

## 11. Supuestos y pendientes a confirmar en implementación

- **Forma exacta de la respuesta de los SP de company** (`SELECT *`): se asume `{ id, nombre }` para empresa/departamento/sub-depto/puesto y `{ codigo/PAIS, nombre }` para países. Confirmar nombres reales de columnas pegándole al endpoint o a la BD; el mapeo a `{ value, label }` del dropdown se ajusta ahí.
- **Campos de Biotime** (`dept_name`/`area_name`): confirmar contra la respuesta real; ajustar el label si difiere.
- **Gateway:** se asume que `http://localhost:3001/api/v2/rrhh/*` proxea al micro (`:4007`). Si no, ajustar `VITE_API_BASE_URL`.
- **`PAIS`** se envía como código (string). Confirmar si el backend espera el código del catálogo de países o ISO.
- **Codificación de campos MINTRAB:** confirmar si el backend espera el **código** MINTRAB (`codigoMintrab`, p.ej. sexo `1`/`2`, estado civil `1`-`5`) o el **valor** string (`'CASADO'`, `'DIURNA'`). Las constantes de `guatemala.ts` tienen ambos; enviar el que espera cada columna (las longitudes cortas de `tipo_discapacidad`/`pueblo_pertenencia`/`comunidad_linguistica`, varchar(5), sugieren código numérico).

## 12. Verificación

- `npm run typecheck` sin errores (TS strict, `noUnusedLocals`).
- `npm run dev`: recorrer el wizard — cada dropdown carga al seleccionar el padre; no se puede avanzar con requeridos vacíos/mal formateados; intentar avanzar con DPI de 12 dígitos bloquea con mensaje.
- Crear un empleado real → verificar 1) que se creó (aparece en lista), 2) que el diálogo muestra el código Biotime, 3) que **no se puede cerrar** el diálogo hasta copiar el código.
- Probar el camino de error: DPI duplicado → 400 mostrado en el paso 6.
