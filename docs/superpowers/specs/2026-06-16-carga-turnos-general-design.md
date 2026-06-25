# Carga de turnos "General" (por departamento) — Diseño

**Fecha:** 2026-06-16
**Estado:** Aprobado (pendiente de plan de implementación)
**Repos afectados:** `RototecRH` (frontend) + `Microservicios` (MS `recursos-humanos`) + BD `INTRA_ROTOTEC`

## 1. Contexto y problema

Hoy *Carga de turnos* maneja dos áreas, cada una con su tabla destino:

- **Acabados** (área 1, puesto 33) → `tTurnosAcabados` (tabla plana: una fila por empleado-día).
- **Máquinas** (área 2, puestos 23/33/35) → `tTurnosProduccion` (cabecera por fecha) + `tTurnosProduccionDetalle` (detalle con `NumTurno`, `Maquina`, `IdEquipo`).

Las áreas son **lógicas**: `programacion-turnos/lib/validacion.ts` define `PUESTOS_POR_AREA = { 1: {33}, 2: {23,33,35} }`. No existe catálogo de áreas.

Aguas abajo, `horas-extra` (`grano.service.cargarTurnosYMarcas`) y `asistencias` (`asistencias.service.verificarAsistencias`) **leen** esas tablas, las normalizan a una lista única de turnos etiquetada con una `fuente` (`ACABADOS | MAQUINAS | PVC`) y corren los motores sobre esa lista.

**Falta** una vía para programar turnos de **todos los demás puestos** (administrativos, bodega, etc.), que no encajan en Acabados/Máquinas. Esos empleados pertenecen a distintos **departamentos** (`tEmpleados.id_departamento → tDepartamentos`).

## 2. Objetivo

Agregar una **3ª vía "General"** en *Carga de turnos* que:

1. Escriba a una **tabla nueva** con molde de `tTurnosAcabados` + columna de departamento.
2. Use el **departamento del empleado** como "área", mostrado en la plantilla.
3. Se **enchufe a asistencias y a horas extra** como una 4ª fuente, igual que las existentes.

Es un cambio **aditivo**: no toca Acabados ni Máquinas ni sus tablas.

## 3. Decisiones confirmadas

- **Área = departamento del empleado** (`id_departamento`), no sub-departamento ni puesto ni catálogo nuevo.
- **Elegibles** = empleados activos con `id_puesto ∉ {23, 33, 35}` (complemento de Acabados/Máquinas).
- **Alcance completo**: la tabla alimenta asistencias **y** horas extra.
- **Departamento autoritativo desde el empleado** (resuelto en el backend al aplicar), no editable en el Excel; en la plantilla aparece pre-llenado de solo lectura.
- **Tabla *lean*** (sin `MetaDia`/`Acumulado`/`FinDeSemana`/`FueReabierto`, específicos de producción de acabados).
- **Nombre de tabla:** `tTurnosGeneral`.
- **DESCANSO/ASUETO no se materializan** (igual que Acabados/Máquinas hoy).

## 4. BD — nueva tabla `tTurnosGeneral`

Molde de `tTurnosAcabados` sin lo específico de producción:

| Columna | Tipo | Default | Nota |
|---|---|---|---|
| `ID` | int IDENTITY | PK | |
| `IdEmpleado` | int NULL | | |
| `FechaDia` | date NULL | | |
| `HoraInicio` | time NULL | | |
| `HoraFin` | time NULL | | |
| `HoraAlmuero` | bit NULL | 1 | 1h almuerzo, igual que acabados (nombre real sin 'z') |
| `IdDepartamento` | int NULL | | **el "área"** |
| `Turno` | int NULL | 1 | |
| `Estado` | tinyint | 1 | |

Índice `IX_TG_IdEmpleado_FechaDia (IdEmpleado, FechaDia)` (paralelo a `IX_TA_IdEmpleado_FechaDia`).

Se entrega como **DDL `CREATE TABLE`** (la BD usa `synchronize:false`) + entidad TypeORM `turno-general.entity.ts` espejo de `turno-acabado.entity.ts`.

## 5. Backend MS — carga (`programacion-turnos`)

### 5.1 Elegibles (`programacion.repo.ts`)
Nuevo método `empleadosElegiblesGeneral()`: activos con puesto no-producción, devolviendo `id, codigo, nombre, idPuesto, idDepartamento` + nombre del departamento (JOIN `tDepartamentos`).

Predicado: `(id_puesto IS NULL OR id_puesto NOT IN (23,33,35))` — incluir explícitamente el puesto NULL (un `NOT IN` solo lo excluiría por la lógica de tres valores de SQL). El mismo predicado se usa en la validación de área 3 (5.4) para que plantilla y aplicar coincidan.

### 5.2 Plantilla (`plantilla.service.ts`)
Mismo formato largo (una fila por empleado-día). Diferencias para general:
- Columna 4 "Área" → **"Departamento"**, pre-llenada con el nombre del departamento del empleado, de solo lectura (gris).
- **Sin** columnas Meta (acabados) ni Turno/Máquina (máquinas).
- Columnas de entrada Inicio/Fin y automáticas Tipo/Hora inicio/Hora fin: se reutilizan las fórmulas existentes sin cambios.

### 5.3 Detección de modo (`programacion-turnos.controller.ts` + DTOs)
- El front envía `area` en el body de `preview`/`aplicar` y como query en `plantilla` (ya lo manda; hoy el backend lo ignora en preview/aplicar y auto-detecta por la columna "Área").
- `CargaArchivoDto` incluye `area`. El controller **honra `area`**: si `area === 3` → modo general (no se auto-detecta por texto, porque esa columna ahora trae nombres de departamento).
- `RangoAreaDto` y el `plantilla` admiten `area=3`; el nombre del archivo descargado pasa a `plantilla_turnos_general_<desde>_a_<hasta>.xlsx`.

### 5.4 Parse y validación (`carga.service.ts` + `lib/validacion.ts`)
- `parseFilas(matriz, 3)`: sin Meta/Turno/Máquina; arma la fila base (empleado, fecha, celda Tipo/horas).
- `validacion.ts`: rama `idArea === 3` → exige empleado **activo** y `id_puesto ∉ {23,33,35}`; **sin** requisitos de máquina/cuadrilla. (Se generaliza el chequeo de puesto: para área 3 el predicado es "no es puesto de producción" en vez de una whitelist.)
- `IdDepartamento` se resuelve **del empleado** (contexto del repo), no del Excel.

### 5.5 Aplicar (`carga.service.aplicar`)
- Upsert por (empleado, fecha): `DELETE FROM tTurnosGeneral WHERE IdEmpleado=@0 AND FechaDia=@1` + `INSERT` de los días trabajados.
- DESCANSO/ASUETO no se insertan.
- El contador de retorno se extiende a `{ acabados, maquinas, general, avisos }`.

## 6. Backend MS — lectores (asistencias + horas extra)

Patrón idéntico al de PVC ya existente (un query extra unido a la lista normalizada). Los **motores de cálculo no cambian**.

### 6.1 horas-extra (`grano.service.cargarTurnosYMarcas` + `lib/grano.ts`)
- `FuenteTurno` extendido a `'ACABADOS' | 'MAQUINAS' | 'PVC' | 'GENERAL'`.
- Nuevo query a `tTurnosGeneral` (mismo `CONVERT` de fecha/horas a string que los demás) entre `desde..hasta`.
- Push a `turnos[]` con `fuente: 'GENERAL'`.
- `conteos` incluye `general`.

### 6.2 asistencias (`asistencias.service.verificarAsistencias`)
- `TipoTurno` extendido con `'general'`.
- Nuevo query a `tTurnosGeneral`; `generalPorClave: Map<clave, TurnoNorm>` con `tipo: 'general'`.
- Se agrega a la unión `turnos = [...acabados, ...produccion, ...general]`.

> Nota: ambos lectores hoy leen acabados vía repo TypeORM y producción/PVC vía query crudo. `tTurnosGeneral` puede leerse por query crudo (más simple) o por entidad; el plan elegirá uno por consistencia local de cada archivo.

## 7. Frontend (`RototecRH`)

- `pages/carga-turnos/CargaTurnosPage.tsx`: 3er botón **"General"**; estado `area: 1 | 2 | 3`; descarga/preview/aplicar pasan `area=3`; mensaje de resultado incluye conteo `general`.
- `api/cargaTurnos.ts`: firmas admiten `area: 1 | 2 | 3`; tipo de retorno de `aplicar` incluye `general`.
- `pages/carga-turnos/PreviewTurnosDialog.tsx`: para `area=3`, columna **"Departamento"** en lugar de Meta/Máquina; el encabezado de grupo muestra el departamento; `cols` ajustado.
- `types/index.ts`: `PreviewFilaTurno` + `departamento: string | null` (y/o `idDepartamento`); `FuenteTurno` + `'GENERAL'`; `EmpleadoElegible` + `idDepartamento` si se reutiliza.

## 8. Fuera de alcance (no-goals)

- No se unifican ni migran `tTurnosAcabados` / `tTurnosProduccion*`.
- No se migran datos históricos a `tTurnosGeneral`.
- No hay catálogo nuevo de áreas ni edición del departamento por fila en el Excel.
- No cambian los motores de cálculo de horas extra ni la lógica de apareo de marcas.

## 9. Pruebas

- **validacion.spec.ts**: casos área 3 — acepta puesto no-producción activo; rechaza puesto de producción (23/33/35), inactivo e inexistente.
- **carga**: `parseFilas` modo general (sin Meta/Máquina); `aplicar` hace DELETE+INSERT en `tTurnosGeneral` y omite DESCANSO/ASUETO.
- **grano.spec.ts / asistencias**: un turno general entra al grano con `fuente:'GENERAL'` / `tipo:'general'` y produce día calculado igual que acabados con el mismo horario.
- **Frontend**: typecheck (`tsc -b`) verde; preview con columna Departamento.

## 10. Mapa de archivos

**Microservicios** (`apps/domains/global/recursos-humanos/src/`)
- `models/entities/turno-general.entity.ts` *(nuevo)*
- `programacion-turnos/programacion.repo.ts`
- `programacion-turnos/plantilla.service.ts`
- `programacion-turnos/carga.service.ts`
- `programacion-turnos/lib/validacion.ts`
- `programacion-turnos/programacion-turnos.controller.ts`
- `programacion-turnos/dto/rango-area.dto.ts`, `dto/carga-archivo.dto.ts`
- `horas-extra/lib/grano.ts`, `horas-extra/grano.service.ts`
- `asistencias/asistencias.service.ts`
- DDL `CREATE TABLE tTurnosGeneral` (script de migración)

**RototecRH** (`src/`)
- `api/cargaTurnos.ts`
- `pages/carga-turnos/CargaTurnosPage.tsx`
- `pages/carga-turnos/PreviewTurnosDialog.tsx`
- `types/index.ts`
