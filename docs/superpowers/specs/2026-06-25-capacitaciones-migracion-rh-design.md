# Migración de Capacitaciones al sistema de RH — Diseño

**Fecha:** 2026-06-25
**Estado:** Aprobado (diseño) — pendiente confirmar regla del trigger antes del plan de implementación.

## 1. Contexto y objetivo

El módulo de **capacitaciones** vive hoy en la **Intranet** (Next.js Pages Router + PrimeReact) y se apoya en el backend legacy **ApiRototec** (Node/Express, "api v1" en `api.rototec.com.gt:3001`, SQL crudo contra `INTRA_ROTOTEC`, sin auth). Quedó medio deprecado porque toda la data transaccional se identifica por `codigo` / `ID_FH` (un `NVARCHAR(30)` = `String(tEmpleados.id)` sin FK ni integridad), un esquema que ya no se quiere usar.

**Objetivo:** reescribir capacitaciones desde cero dentro del ecosistema de RH:
- **Backend:** nuevo módulo `capacitaciones` en el MS NestJS `recursos-humanos` (`apps/domains/global/recursos-humanos`, prefijo `/rrhh`, TypeORM `synchronize:false`, MSSQL `INTRA_ROTOTEC`).
- **Frontend:** nuevo módulo en `RototecRH` (React 18 + Vite + shadcn/ui + TanStack Query/Table + RHF + Zod), consolidando las 5 pantallas legacy en una vista agrupada.

La Intranet deja de escribir capacitaciones: el MS de RH pasa a ser el **único escritor**.

## 2. Decisiones tomadas

1. **Estrategia de datos — reusar autoría + transaccional nuevo.** Se conservan las tablas de pensums y banco de preguntas (agregándoles un FK real a puesto) y se reconstruyen desde cero las tablas transaccionales (asignación, intentos, notas, licencias) keyeadas por `empleado_id INT → tEmpleados.id`. Se migran solo las filas vigentes. Un solo escritor; la calificación pasa al código de la app; el trigger oculto se retira.
2. **Examen — link tokenizado público.** El empleado abre el examen por un link con token único, sin login (la planta no tiene cuentas). La calificación es **server-side** y **no se manda la respuesta correcta al browser** (se corrige la falla de integridad del legacy).
3. **Alcance MVP.** Incluye: CRUD de pensums (módulos/temas), CRUD de evaluaciones/preguntas/respuestas, asignación primaria + secundaria, calificaciones/notas, licencias activas, **reasignación** (vencidos/reprobados), **diploma DOCX** y **bonos por capacitador**. **Fuera:** notificaciones (WhatsApp/correo), registro de capacitadores como ABM (el capacitador es un dropdown de empleados), y todo lo de onboarding/equipo del legacy.
4. **Estructura UI — una sección con pestañas, detalle por empleado.** Un solo item de menú `Capacitaciones` con pestañas **Pensums / Empleados / Reasignación**. Asignación, notas, intentos, examen y licencias viven dentro del detalle de cada empleado.

## 3. Arquitectura

```
RototecRH (front)                MS recursos-humanos (NestJS)
  /capacitaciones  ── rrhhApi ──►  /rrhh/capacitaciones/...   ──► INTRA_ROTOTEC
  /examen/:token   (público)  ──►  /rrhh/capacitaciones/examen/:token (sin auth)
        │                                    │
   gateway data-driven (gateway_rutas)  el /rrhh ya está ruteado → sin cambios de gateway
```

- El `realApi` del front pega por `rrhhApi` (agrega base `/rrhh` y desenvuelve `{ok,message,data}`). El mock (`USE_MOCK`) usa localStorage como en los demás módulos.
- Controllers NestJS con `@Controller('capacitaciones')` (el prefijo `/rrhh` lo agrega el bootstrap global). Respuestas auto-envueltas; nunca envolver a mano.
- Auth: el MS hoy no tiene guards (gateway es proxy ciego). Las rutas admin se protegen en el front con `RequireAuth`; las rutas de examen tokenizado son públicas por diseño. El gating fino por permiso (`@RequiereAcceso` / claim `accesos`) se decora después, cuando aterrice el RBAC nuevo (ver `PLAN_AUTH_SESIONES_PERMISOS.md`).

## 4. Modelo de datos

### 4.1 Tablas reusadas (autoría) — entidades TypeORM mapeadas a las legacy

| Tabla | Rol | Columnas clave | Cambio |
|---|---|---|---|
| `tPensum` | Currículo (capacitación) | `ID`, `Nombre`, `Puesto`, `Vigencia` | **+ `id_puesto INT FK→tPuestos.id`** (se llena en migración resolviendo el string `Puesto`) |
| `tPensumDetalle` | Módulos | `ID`, `ID_Pensum`, `Modulo`, `Objetivo`, `DuracionHoras`, `Capacitador`, `TipoEvaluacion`, `Instrumentos`, `PorcentajeAprobacion`, `Vigencia`, `Bono` | sin cambio |
| `tModulosPensum` | Temas | `ID`, `ID_Detalle`, `Tema`, `Modalidad`, `Recursos` | sin cambio |
| `tEvaluaciones` | Examen por módulo | `ID`, `Id_Capacitacion`, `Id_Modulo` | sin cambio |
| `tEvaluacionesDetalle` | Preguntas | `ID`, `Id_Evaluacion`, `Id_Tema`, texto, puntos | sin cambio |
| `tEvaluacionesDetalleRespuestas` | Opciones | `ID`, `Id_Pregunta`, texto, `RespuestaCorrecta` | sin cambio; `RespuestaCorrecta` **nunca** se serializa al examen público |

### 4.2 Tablas nuevas (transaccional) — `empleado_id INT FK→tEmpleados.id`

- **`tCapAsignacion`** — `Id` (PK), `empleado_id`, `id_pensum`, `tipo` (`primaria`|`secundaria`), `fecha_inicio`, `estado`, `creado_en`.
- **`tCapAsignacionDetalle`** — `Id` (PK), `id_asignacion`, `id_modulo`, `puntuacion`, `estado` (`Pendiente`|`Aprobado`|`No aprobado`), `intentos`, `licencia_activa BIT`, `vence_licencia DATE`, `bono`, `aprobado_en`.
- **`tCapIntento`** — `Id` (PK), `id_asignacion_detalle`, `id_evaluacion`, `puntaje`, `aprobado BIT`, `tomado_en`.
- **`tCapIntentoDetalle`** — `Id` (PK), `id_intento`, `id_pregunta`, `id_respuesta_elegida`, `correcta BIT`, `puntos`.
- **`tCapExamenToken`** — `token` (PK, GUID/string), `id_asignacion_detalle`, `id_evaluacion`, `expira_en`, `usado_en NULL`, `creado_en`.

Todas las tablas nuevas se crean por SQL idempotente (`IF NOT EXISTS ... CREATE TABLE`) con constraints nombrados, en `src/capacitaciones/sql/`.

### 4.3 Regla de aprobación / licencia / bono (a confirmar contra el trigger)

Regla definida a partir del esquema observado, **a validar** contra la salida del query de triggers/SP antes de implementar:

- **Aprobado:** un módulo se aprueba cuando `puntuacion >= tPensumDetalle.PorcentajeAprobacion`. Al aprobar: `estado='Aprobado'`, `aprobado_en=hoy`.
- **Licencia:** al aprobar el módulo, `licencia_activa=1` y `vence_licencia = aprobado_en + tPensumDetalle.Vigencia` (meses). Una licencia se considera **vencida** cuando `vence_licencia < hoy` → candidata a reasignación.
- **Bono:** al aprobar, `bono = tPensumDetalle.Bono`. (El cálculo agregado por capacitador del legacy vivía en `tBonosPorCapacitador` vía trigger; se reimplementa en el código según la regla confirmada.)

> **Acción pendiente (bloquea el plan):** correr el query de `sys.triggers`/`sys.sql_modules` sobre `tCapacitados`, `tCapacitadosDetalle`, `tEvaluados`, `tEvaluadosDetalle`, `tBonosPorCapacitador` y ajustar esta sección con la regla exacta (umbral, redondeos, base del bono, cómo se acumula por capacitador).

## 5. Endpoints (`/rrhh/capacitaciones`)

**Pensums (autoría):**
- `GET /pensums` · `GET /pensums/:id` (árbol completo) · `POST /pensums` · `PUT /pensums/:id` · `DELETE /pensums/:id`
- `POST /pensums/:id/modulos` · `PUT /modulos/:id` · `DELETE /modulos/:id`
- `POST /modulos/:id/temas` · `DELETE /temas/:id`

**Evaluaciones (banco de preguntas):**
- `GET /modulos/:id/evaluacion` · `POST /evaluaciones` · `PUT /evaluaciones/:id` · `DELETE /evaluaciones/:id`
- `POST /evaluaciones/:id/preguntas` · `DELETE /preguntas/:id` · `POST /preguntas/:id/respuestas` · `DELETE /respuestas/:id`

**Operación por empleado:**
- `GET /empleados?puesto=&departamento=&estado=` (lista con resumen: módulos aprobados/total, licencia)
- `GET /empleados/:empleadoId` (detalle: asignaciones, notas por módulo, intentos, licencias)
- `POST /asignaciones` (primaria por puesto, batch) · `POST /asignaciones/secundaria` (pensum extra que no tiene)
- `POST /reasignaciones` (vencidos/reprobados, entera o por módulo)
- `GET /empleados/:empleadoId/diploma` (DOCX, solo si todos los módulos aprobados)

**Examen tokenizado (público, sin auth):**
- `POST /examenes` (admin genera token para empleado+módulo → devuelve link)
- `GET /examen/:token` (devuelve preguntas/opciones **sin** `RespuestaCorrecta`; valida no usado/no expirado)
- `POST /examen/:token` (recibe respuestas → califica server-side → guarda intento, actualiza nota/estado/licencia/bono, marca token usado)

## 6. Flujo de examen tokenizado

1. Admin abre el detalle del empleado → "generar/mandar examen" para un módulo → `POST /examenes` crea `tCapExamenToken` (token único, expira en N horas) y devuelve `/examen/:token`.
2. El empleado abre el link (sin login) → `GET /examen/:token` valida vigencia y devuelve la evaluación **sin respuestas correctas**.
3. El empleado responde (opción única) y envía → `POST /examen/:token`:
   - El server corrige contra `tEvaluacionesDetalleRespuestas.RespuestaCorrecta`, suma puntos, decide aprobado vs `PorcentajeAprobacion`.
   - Inserta `tCapIntento` + `tCapIntentoDetalle`, actualiza `tCapAsignacionDetalle` (puntuacion, estado, intentos, licencia, bono), marca el token como usado.
4. La UI admin (Calificaciones / detalle empleado) refleja el resultado.

## 7. Frontend (`RototecRH`)

Clonando el patrón del módulo `turnos`:
- `src/types/index.ts` — `Pensum`, `Modulo`, `Tema`, `Evaluacion`, `Pregunta`, `Respuesta`, `AsignacionCap`, `IntentoCap`, enums de estado.
- `src/lib/validators.ts` — schemas Zod de los formularios.
- `src/api/capacitaciones.ts` — `mockApi` (localStorage) + `realApi` (vía `rrhhApi`), exportado `capacitacionesApi = USE_MOCK ? mockApi : realApi`.
- `src/hooks/useCapacitaciones.ts` — `QK` + queries/mutations (invalidación en `onSuccess`).
- `src/pages/capacitaciones/`:
  - `CapacitacionesPage.tsx` — contenedor con pestañas Pensums / Empleados / Reasignación.
  - `PensumsTab.tsx` + `PensumEditor.tsx` — editor maestro-detalle del árbol Pensum→Módulos→Temas (dialogs incrementales) y autoría de preguntas.
  - `EmpleadosTab.tsx` + `EmpleadoCapDetailSheet.tsx` — lista filtrable por puesto/depto y Sheet con asignación primaria/secundaria, notas por módulo, intentos, generar/mandar examen, licencias.
  - `ReasignacionTab.tsx` — recapacitar activos/vencidos/reprobados (entera o por módulo).
- **Ruta pública** `/examen/:token` — página standalone **fuera** de `RequireAuth` (confirmar → examen con countdown → enviado), reemplaza a `evaluacion/[id]` del legacy.
- Registro: agregar la ruta protegida en `src/router.tsx` (hijo de `AppShell`), la ruta pública como hermana fuera del wrapper de auth, y un item en el `NAV` de `AppShell.tsx`.

Mapeo desde el legacy: PrimeReact → shadcn + TanStack Table/Query; forms `useState` imperativos → RHF + Zod; `Toast` → sonner; `Swal`/`confirm` → `AlertDialog`; `xlsx`/`docxtemplater` se conservan para Excel/diploma.

## 8. Migración (script único)

1. `ALTER TABLE tPensum ADD id_puesto INT NULL` y poblarlo resolviendo `tPensum.Puesto` (string) contra `tPuestos` (por nombre/`codigoBiotime`); reportar los que no casen para resolución manual.
2. Migrar **solo vigentes** de `tCapacitados`/`tCapacitadosDetalle` → `tCapAsignacion`/`tCapAsignacionDetalle` con `empleado_id = CAST(ID_FH AS INT)`, conservando estado/nota/licencia/vencimiento actuales.
3. (Opcional) migrar histórico de intentos `tEvaluados`/`tEvaluadosDetalle` → `tCapIntento(+Detalle)` si se quiere conservar el historial; si no, arrancar limpio.
4. Verificar que la suma de aprobados/licencias coincida con el legacy antes de apagar la Intranet.

## 9. Riesgos y acciones pendientes

- **Trigger/SP oculto (bloqueante):** confirmar la regla de aprobación/licencia/bono (§4.3) antes de implementar la calificación.
- **Match `Puesto`→`tPuestos`:** el string libre puede no casar 1:1; requiere pasada de limpieza/manual.
- **Coexistencia durante el corte:** mientras se valida, la Intranet podría quedar en solo-lectura; definir ventana de cutover para evitar doble escritura.
- **Ruta pública de examen:** confirmar que `createBrowserRouter` permite la ruta fuera de `RequireAuth` sin romper el layout (esperado, a verificar al implementar).

## 10. Fases sugeridas

1. **Backend base:** SQL (nuevas tablas + `id_puesto`), entidades, módulo, CRUD de pensums y evaluaciones, asignación primaria/secundaria.
2. **Examen + calificación:** tokens, examen público, corrección server-side, licencias y bono (con la regla confirmada).
3. **Frontend:** módulo completo (pestañas + detalle empleado + ruta pública de examen).
4. **Extras + corte:** reasignación, diploma DOCX, script de migración de vigentes, apagado del módulo legacy.
