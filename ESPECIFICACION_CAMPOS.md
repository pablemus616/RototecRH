# Campos por Acción — Sistema HR Rototec

> **Fuente:** archivos reales del cliente
> - `Formato_Empleados_ROTOTEC_2025.xlsx`
> - `04_Planilla_No__08_del_16_al_30_de_abril_2026_ROTOTEC-PRODUCCION.xlsx`
> - `horas_extras_1Q_abril_completo_Ing__Kyra.xlsx`
> - `REPORTE_DE_AUSENCIAS_Y_ATRASOS_-_OE.xlsx`
>
> Este documento manda sobre el `PLAN_HR_ROTOTEC.md` en todo lo relativo a nombres de campos, catálogos y formularios.

---

## CORRECCIONES IMPORTANTES (confirmadas con el cliente)

1. **Bonificación Incentivo (Decreto 78-89 / 37-2001) = Q250 SIEMPRE.** Es un valor fijo por ley, no editable. En la planilla aparece como Q125 quincenal (Q250 / 2).
2. Los montos variables que se ven en la planilla como Q850 o Q1650 **NO** son la bonificación de ley. Son un bono adicional distinto que debe nombrarse con otro identificador (p. ej. `bonoDecretoEspecial` o `bonoExtraordinario`) para no confundirlos con la bonificación incentivo.
3. **Turno mixto se elimina** — sólo Diurno y Nocturno.
4. El nombre del empleado se guarda **en partes separadas** (`primerNombre`, `segundoNombre`, `tercerNombre`, `primerApellido`, `segundoApellido`, `apellidoCasada`) y se muestra en la planilla como: `APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2` (mayúsculas).
5. `ESTADO ALTA` y `ESTADO CONTRATO` son **dos campos separados** en la planilla.

---

## MÓDULO 1 — ALTA DE EMPLEADO

> **Fuente:** `Formato_Empleados_ROTOTEC_2025.xlsx`

El formulario de alta debe capturar exactamente estos campos. Se organizan en tabs.

### Tab 1: Identificación Personal

| Campo en sistema | Nombre en archivo | Tipo | Requerido | Notas |
|---|---|---|---|---|
| `primerNombre` | Primer nombre | texto | ✅ | |
| `segundoNombre` | Segundo nombre | texto | ❌ | |
| `tercerNombre` | Tercer nombre | texto | ❌ | Algunos empleados tienen |
| `primerApellido` | Primer apellido | texto | ✅ | |
| `segundoApellido` | Segundo apellido | texto | ❌ | |
| `apellidoCasada` | Apellido de casada | texto | ❌ | Solo mujeres casadas |
| `dpi` | Número de documento (DPI) | texto | ✅ | 13 dígitos |
| `tipoDocumento` | Documento identificación | select | ✅ | DPI / Pasaporte / Otro |
| `nit` | Número de Identificación Tributaria (NIT) | texto | ✅ | Formato GT: números + K |
| `igss` | Número de afiliación IGSS | texto | ✅ | |
| `fechaNacimiento` | Fecha de nacimiento | fecha | ✅ | |
| `sexo` | Sexo | select | ✅ | 1=Masculino, 2=Femenino |
| `estadoCivil` | Estado civil | select | ✅ | 1=Soltero, 2=Casado, 3=Divorciado (ver catálogo) |
| `cantidadHijos` | Cantidad de hijos | número | ✅ | Default 0 |
| `tipoDiscapacidad` | Tipo de discapacidad | select | ✅ | 1=Ninguna (ver catálogo MINTRAB) |

### Tab 2: Datos Culturales (Ministerio de Trabajo)

| Campo en sistema | Nombre en archivo | Tipo | Requerido | Notas |
|---|---|---|---|---|
| `nacionalidad` | Nacionalidad | select | ✅ | Default: GTM |
| `paisOrigen` | País de origen | select | ✅ | Default: GTM |
| `puebloPertenencia` | Pueblo de pertenencia | select | ✅ | 5=Mestizo/Ladino (ver catálogo) |
| `comunidadLinguistica` | Comunidad Lingüística | select | ✅ | 99=No aplica / Español (ver catálogo) |
| `lugarNacimientoMunicipio` | Lugar de nacimiento (municipio) | texto/select | ❌ | Código de municipio GT |
| `permisoExtranjero` | Número de expediente permiso extranjero | texto | ❌ | Solo extranjeros |

### Tab 3: Datos Laborales

| Campo en sistema | Nombre en archivo | Tipo | Requerido | Notas |
|---|---|---|---|---|
| `puesto` | Ocupación (puesto) | texto | ✅ | Ej: "OPERARIO DE MAQUINA" |
| `departamento` | — | select | ✅ | PRODUCCION, BODEGA, VENTAS, etc. (no está en este archivo pero sí en planilla) |
| `jornada` | Jornada de trabajo | select | ✅ | 2=Diurna (ver catálogo MINTRAB). **Sólo Diurna y Nocturna** |
| `temporalidadContrato` | Temporalidad del contrato | select | ✅ | 1=Indefinido, 2=Temporal |
| `tipoContrato` | Tipo de contrato | select | ✅ | 2=Planilla (ver catálogo MINTRAB) |
| `fechaIngreso` | Fecha de inicio de labores | fecha | ✅ | |
| `fechaReingreso` | Fecha de reinicio de labores | fecha | ❌ | Solo si es reingreso |
| `salarioMensual` | Salario mensual nominal | decimal | ✅ | Mínimo Q2,500 (validación anti-error) |
| `sucursal` | Sucursal | texto | ✅ | Default: "KM 26.6 CARRETERA A EL SALVADOR" |
| `nivelAcademico` | Nivel académico más alto alcanzado | select | ✅ | 7=Diversificado completo |
| `tituloProfesion` | Título o diploma (profesión) | texto | ❌ | |

### Tab 4: Datos Bancarios

| Campo en sistema | Nombre en archivo | Tipo | Requerido | Notas |
|---|---|---|---|---|
| `formaPago` | Tipo de pago | select | ✅ | TRANSFERENCIA / CHEQUE |
| `codigoBanco` | Código Banco | select | ✅ (si transferencia) | Catálogo de bancos (ver planilla: 520, 618, 781, etc.) |
| `numeroCuenta` | No. de Cuenta | texto | ✅ (si transferencia) | |
| `tipoCuenta` | Tipo Cuenta | select | ✅ (si transferencia) | Ahorro / Monetaria |

### Campos calculados automáticamente (NO pedir al usuario)

| Campo | Cómo se genera |
|---|---|
| `numeroEmpleado` | Auto-incremental |
| `salarioAnual` | salarioMensual × 12 |
| `bonificacionDecretoMensual` | **Fijo Q250 (por ley, no editable)** |
| `valorHoraExtra` | salarioMensual / 30 / 8 × 1.5 |
| `fechaFinalizacion` | Se llena al dar de baja |
| `diasLaboradosEnAnio` | Calculado del sistema |
| `totalHorasExtrasAnuales` | Acumulado del sistema |

---

## MÓDULO 2 — BAJA DE EMPLEADO

> Acción secundaria desde el perfil del empleado

| Campo | Tipo | Valores | Notas |
|---|---|---|---|
| `fechaBaja` | fecha | — | Último día trabajado |
| `tipoBaja` | select | RENUNCIA / DESPIDO / ABANDONO | |
| `motivoBaja` | texto | — | Opcional |

**Lógica en planilla:** la baja aparece como `ESTADO ALTA = vacío` y se llena `FECHA EGRESO` + `TIPO DE BAJA`. El empleado sigue en la planilla hasta su último período trabajado.

---

## MÓDULO 3 — REGISTRO DE AUSENCIAS

> **Fuente:** `REPORTE_DE_AUSENCIAS_Y_ATRASOS_-_OE.xlsx`
> El archivo tiene DOS secciones: AUSENCIAS y ATRASOS

### 3A — Sección Ausencias

| Campo | Nombre en archivo | Tipo | Notas |
|---|---|---|---|
| `empleadoId` | NOMBRE | select/búsqueda | Buscar por nombre |
| `puesto` | — | auto | Se llena del perfil del empleado |
| `diaSemana` | Día de la semana | auto | Calculado de la fecha |
| `fecha` | FECHA | fecha | |
| `tipoAusencia` | RAZÓN DE AUSENCIA / Tipo de ausencia | select | Ver catálogo abajo |
| `medidaDisciplinaria` | MEDIDA DISCIPLINARIA | select/auto | Se sugiere automáticamente según tipo |
| `justificacion` | COMENTARIOS / Justificación | texto | Libre |

#### Catálogo de Tipos de Ausencia (extraído del archivo real)

| Valor | Label | Medida automática |
|---|---|---|
| `AUSENCIA_INJUSTIFICADA` | Ausencia Injustificada | DESCUENTO DÍA + SÉPTIMO |
| `AUSENCIA_ENFERMEDAD_SIN_IGSS` | Ausencia por Enfermedad (sin constancia IGSS) | DESCUENTO DÍA + SÉPTIMO |
| `AUSENCIA_POR_IGSS` | Ausencia por IGSS / Suspensión IGSS | DESCONTAR DÍA PAGA IGSS |
| `AUSENCIA_MEDIO_DIA_IGSS` | Ausencia Medio Día por IGSS | N/A (proporcional) |
| `SUSPENSION_AMONESTACION` | Suspensión por Amonestación | DESCONTAR EL DÍA |
| `SUSPENSION_2_DIAS` | Suspensión 2 días por Amonestación | DESCUENTO DE 2 DÍAS + SÉPTIMO |
| `VACACIONES` | Vacaciones | N/A |
| `VACACIONES_TURNO_SUSPENDIDO` | Vacaciones por Turno Suspendido | N/A |
| `MUERTE_FAMILIAR` | Muerte de un Familiar | DESCUENTO DÍA + SÉPTIMO (ver política) |
| `BAJA` | Baja | BAJA |
| `PENDIENTE` | Pendiente de resolución | PENDIENTE |

**Nota importante del archivo:** Hay casos "PENDIENTE" donde se presentó constancia pero solo indica atención de minutos y la persona se ausentó todo el día — el sistema debe permitir dejar en estado PENDIENTE para resolver manualmente.

### 3B — Sección Atrasos

| Campo | Nombre en archivo | Tipo | Notas |
|---|---|---|---|
| `empleadoId` | NOMBRE | select/búsqueda | |
| `fecha` | FECHA | fecha | |
| `horaEntradaReal` | HORA ENTRADA | hora | HH:MM:SS |
| `horaSalidaReal` | HORA SALIDA | hora | HH:MM:SS |
| `turnoDescripcion` | COMENTARIOS | texto | Ej: "TURNO PROGRAMADO DE 09:00 A 18:00" |
| `minutosRetraso` | MIN / HOR DE RETRASO | decimal | En horas decimales (0.5 = 30 min) |
| `medidaDisciplinaria` | MEDIDA DISCIPLINARIA | select/auto | Default: DESCUENTO EN NOMINA |

**Nota:** Los atrasos se descuentan en nómina. Los minutos están en formato decimal de horas (0.36 = 21.6 minutos). El sistema debe mostrarlos como HH:MM.

---

## MÓDULO 4 — REGISTRO DE ASISTENCIAS / HORAS EXTRAS

> **Fuente:** `horas_extras_1Q_abril_completo_Ing__Kyra.xlsx`

### Estructura de la tabla de asistencias (por empleado, por día)

| Campo | Nombre en archivo | Tipo | Notas |
|---|---|---|---|
| `empleadoId` | No. + Nombre completo | — | |
| `puesto` | Puesto | texto | Del perfil |
| `fecha` | Fecha | fecha | Excel serial → fecha real |
| `diaSemana` | Día Semanal | auto | lunes, martes, etc. |
| `horaEntradaReal` | Marcaje Ingreso | hora | HH:MM:SS o texto especial |
| `horaSalidaReal` | Marcaje Salida | hora | HH:MM:SS o texto especial |
| `turnoEntradaAsignado` | Turno Ingreso | hora | Hora decimal del turno |
| `turnoSalidaAsignado` | Turno Salida | hora | Hora decimal del turno |
| `tipoTurno` | Tipo de Turno | select | Diurno / Nocturno / SIN TURNO / DESCANSO / SS |

### Estados especiales en marcaje (textos que reemplazan hora)

| Texto en archivo | Significado | Acción en sistema |
|---|---|---|
| `ALTA P.` | Alta en período — empleado entró este período | No calcular extras para esos días |
| `SS` | Sin semana — período anterior, primera semana no aplica | Ignorar en cálculo |
| `descanso` | Día de descanso programado | No calcular, marcar como descanso |
| `ausencia` | Ausente ese día | Cruzar con módulo de ausencias |
| (vacío) | Sin marcaje | Marcar como pendiente de revisar |

### Campos calculados por el sistema (mostrar en tabla, no ingresar)

| Campo | Nombre en archivo | Fórmula / Descripción |
|---|---|---|
| `horasTrabajadas` | Trabajado Planificado | Salida - Entrada (en decimal de horas) |
| `jornadaAutorizada` | Jornada autorizada | Horas del turno asignado (8h diurno, 8h nocturno) |
| `horaComida` | Hora de comida | 1h si el turno la incluye, 0 si no |
| `horasExtrasMixtas` | MIX / MIXTAS DECIMAL | Horas extras en turno mixto |
| `horasExtrasDiurnas` | HED / DIURNA DECIMAL | Horas extras diurnas |
| `horasExtrasNocturnas` | HEN / NOCTURNA DECIMAL | Horas extras nocturnas |

### Regla de cálculo de horas extras (extraída del archivo)

```
Umbrales semanales:
- Diurno:   extras después de 44h trabajadas
- Nocturno: extras después de 36h trabajadas
- Mixto:    extras después de 42h trabajadas

Descontar 1h de comida POR DÍA si el turno la incluye.

Si el empleado cambia de turno durante la semana → calcular por DÍA, no acumulado semanal.

El turno 6x3 (6 días trabajo, 3 de descanso) usa el mismo turno los 6 días.
```

---

## MÓDULO 5 — PLANILLA / NÓMINA

> **Fuente:** `04_Planilla_No__08_del_16_al_30_de_abril_2026_ROTOTEC-PRODUCCION.xlsx`

### Campos que se ingresan manualmente en planilla (el resto se calcula)

| Campo | Nombre en planilla | Tipo | Notas |
|---|---|---|---|
| `ausencias` | AUSENCIAS | número | Días a descontar (viene del módulo de ausencias) |
| `diasSuspensionIGSS` | DIAS SUSPENSIÓN IGSS | número | Del módulo de ausencias tipo IGSS |
| `heSimplesDiurnas` | # HE SIMPLES DIU | decimal | Del cálculo de horas extras |
| `heSimplesMixtas` | # HE SIMPLES MIX | decimal | Del cálculo de horas extras |
| `heNocturnas` | # HE SIMPLES NO | decimal | Del cálculo de horas extras |
| `heDobles` | # HE DOBLES | decimal | Del cálculo de horas extras |
| `anticipoQuincenal` | ANTICIPO QUINCENAL | decimal | Ingreso manual |
| `descuento1` | Desc 1 | decimal | Ingreso manual |
| `descuento2` | DES 2 | decimal | Ingreso manual |
| `embargos` | EMBARGOS | decimal | Ingreso manual |
| `bonoProductividadAcabados` | BONO DE PRODUCTIVIDAD % ACABADOS | decimal | Ingreso manual |
| `bonoExtraordinario` | BONO DECRETO 37-2001 (etiqueta engañosa en la planilla — NO es la bonificación de ley) | decimal | Varía por empleado (ej: Q850, Q1650). **NO confundir con la bonificación incentivo de Q250.** |
| `otrosIngresos` | OTROS INGRESOS | decimal | Ingreso manual |
| `bolsonBonificacionesMaquinas` | BOLSÓN DE BONIFICACIONES MÁQUINAS | decimal | Ingreso manual |
| `bonoRendimientoAcabados` | BONO POR RENDIMIENTO ACABADOS | decimal | Ingreso manual |

### Campos de cabecera del empleado en planilla

| Campo | Nombre en planilla | Notas |
|---|---|---|
| `codigoBanco` | CODIGO BANCO | Número corto del banco (ej: 520, 618) |
| `fechaIngreso` | FECHA INGRESO EMPRESA | Del perfil |
| `estadoAlta` | ESTADO ALTA | ACTIVO / vacío |
| `estadoContrato` | ESTADO CONTRATO | ACTIVO / vacío |
| `fechaEgreso` | FECHA EGRESO | Solo si hay baja |
| `tipoBaja` | TIPO DE BAJA | Solo si hay baja |
| `nombreCompleto` | NOMBRE COMPLETO DEL EMPLEADO | Apellidos primero |
| `puesto` | PUESTO QUE DESEMPEÑA | |
| `departamento` | DEPARTAMENTO | PRODUCCION, BODEGA/CEDIS, VENTAS, etc. |
| `tipoPago` | TIPO DE PAGO | TRANSFERENCIA / CHEQUE |
| `numeroCuenta` | NO. DE CUENTA | |
| `tipoCuenta` | TIPO CUENTA | Ahorro / Monetaria |
| `numeroDpi` | NUMERO DE DPI | |
| `noAfiliacionIGSS` | NO.AFILIACION IGSS | |
| `noNit` | NO.NIT | |
| `sueldoBase` | SUELDO BASE (contrato) | Salario mensual completo |
| `diasDelMes` | # DIAS DEL MES | 15 para quincena |
| `diasAPagar` | DIAS A PAGAR | Días menos ausencias |

### Campos calculados por el sistema (NO ingresar)

| Campo | Nombre en planilla | Fórmula |
|---|---|---|
| `sueldoPercibido` | SUELDO PERCIBIDO | sueldoBase/30 × diasAPagar |
| `bonificacionIncentivo` | BONIFICACIÓN INCENTIVO DECRETO 78-89/37-2001 | **Q125 quincenal (Q250/2) — FIJO, no editable** |
| `horasSimplesDiu` | HORAS SIMPLES DIU | heSimplesDiurnas × valorHoraDiurna |
| `horasSimplesMix` | HORAS SIMPLES MIX | heSimplesMixtas × valorHoraMixta |
| `horasNocturnas` | HORAS SIMPLES NO | heNocturnas × valorHoraNocturna |
| `horasDobles` | HORAS DOBLES | heDobles × valorHoraDoble |
| `totalIngresos` | TOTAL INGRESOS | Suma de todos los ingresos |
| `igss` | IGSS | totalIngresos base × 4.83% |
| `isr` | ISR | Según tabla de retención anual |
| `totalDescuentos` | TOTAL DESCUENTOS | IGSS + ISR + anticipos + embargos + otros |
| `liquidoRecibir` | (columna líquido) | totalIngresos - totalDescuentos |

### Campos de provisiones (para Contabilidad, no para nómina operativa)

| Campo | Nombre en planilla | Fórmula |
|---|---|---|
| `igssPatronal` | Instituto Guatemalteco de Seguridad Social PATRONAL | sueldoBase × 12.67% |
| `provisionSeguroLaboralAjuste` | PROVISIÓN SEGURO SOCIAL LABORAL AJUSTE PATRONAL | |
| `provisionIntecap` | PROVISIÓN INTECAP | sueldoBase × 1% |
| `provisionIrtra` | PROVISIÓN IRTRA | sueldoBase × 1% |
| `provisionAguinaldo` | PROVISIÓN AGUINALDO | sueldoBase / 12 |

### Departamentos reales en Rototec

```
PRODUCCION
BODEGA
BODEGA/CEDIS
BODEGA/ZACAPA
VENTAS
```

### Centro de Costo (campo en planilla)

El campo `CENTRO DE COSTO` aparece en la planilla pero está vacío para todos. Confirmar con contabilidad si se usa.

---

## MÓDULO 6 — CATÁLOGOS REALES

### Códigos de banco (extraídos de la planilla)

| Código | Banco | Tipos de cuenta vistos |
|---|---|---|
| 520, 696, 745... | Banco Industrial (inferido) | Ahorro |
| 618 | — | Ahorro |
| 781, 788... | — | Ahorro |
| 105, 107, 108... | — | Monetaria |
| CHEQUE | Sin cuenta bancaria | — |

> **⚠️ Pendiente:** Steven enviará archivo con códigos de banco completos.

### Tipos de cuenta

- **Ahorro** (monetaria de ahorro)
- **Monetaria** (cuenta monetaria/corriente)

### Catálogo de Estado Civil (MINTRAB)

| Código | Valor |
|---|---|
| 1 | Soltero/a |
| 2 | Casado/a |
| 3 | Divorciado/a |
| Otros | Viudo/a, Unión de hecho |

### Catálogo de Sexo

| Código | Valor |
|---|---|
| 1 | Masculino |
| 2 | Femenino |

### Catálogo de Pueblo de Pertenencia (MINTRAB)

| Código | Valor |
|---|---|
| 5 | Mestizo/Ladino (más común en el archivo) |
| Otros | Maya, Garífuna, Xinka, Afrodescendiente |

### Catálogo de Jornada (MINTRAB)

| Código | Valor |
|---|---|
| 2 | Diurna |
| Otros | Nocturna |

> **Mixta eliminada por decisión del cliente.**

### Catálogo de Tipo de Contrato (MINTRAB)

| Código | Valor más común |
|---|---|
| 2 | Indefinido (todos en el archivo usan este) |

### Catálogo de Ocupación/Puesto (inferido del archivo)

Puestos reales que aparecen en la planilla:
```
OPERARIO DE MAQUINA
JEFE DE MAQUINA
OPERARIO DE ACABADOS Y ENSAMBLAJE
SUPERVISOR DE TURNO
AUXILIAR DE BODEGA
AUXILIAR DE BODEGA/CEDIS
SUB ENCARGADO DE BODEGA CDIS
SUPERVISOR DE BODEGA
AUXILIAR DE RUTA
AUXILIAR DE MANTENIMIENTO
TECNICO DE MANTENIMIENTO
JEFE DE MANTENIMIENTO REACTIVO
SUPERVISOR DE MATERIA PRIMA
OPERARIO DE PULVERIZADOR
CONTROL DE CALIDAD
ACARREADOR
PESADO
MOLDISTA
OPERARIO DE MONTACARGAS
SUPERVISOR DE ACABADOS
ENCARGADA DE LIMPIEZA Y COCINA
MENSAJERO
CONSERJE
ASESOR COMERCIAL [ZONA]
JEFE REGIONAL DE VENTAS DEPARTAMENTALES
KAM CONSTRUCCION
ANALISTA DE RECLUTAMIENTO
JEFE DE PRODUCCIÓN/SOPORTE DE PROCESOS
```

---

## AJUSTES AL PLAN ORIGINAL (PLAN_HR_ROTOTEC.md)

Estos campos del plan original **NO existen** en los archivos reales y deben eliminarse o ajustarse:

| Campo en plan | Realidad |
|---|---|
| `lugarTrabajo` | En la planilla es `DEPARTAMENTO` (PRODUCCION, BODEGA, VENTAS) |
| `bonificacionIncentivo` editable en alta | No se captura — se genera automáticamente en planilla como Q125/quincena (Q250 fijos por ley) |
| `profesion` como campo del alta | En el archivo es `Título o diploma` — casi todos dicen "Diversificado completo" |
| `puebloPertenencia` libre | Es un catálogo con códigos numéricos del MINTRAB |
| Turno mixto | Eliminado — sólo Diurno y Nocturno |

Estos campos del plan original **SÍ existen** y deben respetarse exactamente:

- El nombre se guarda en partes separadas: `primerNombre`, `segundoNombre`, `tercerNombre`, `primerApellido`, `segundoApellido`, `apellidoCasada`
- En la planilla el nombre se muestra como: `APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2`
- `ESTADO ALTA` y `ESTADO CONTRATO` son dos campos separados
- El `BONO DECRETO 37-2001` que aparece variando por empleado (Q850, Q1650) NO es la bonificación de ley — es un bono adicional con otro nombre interno (`bonoExtraordinario`)

---

## INSTRUCCIÓN PARA CLAUDE CODE

Al implementar/ajustar módulos:

1. **Formulario de alta** — usar exactamente los campos del Módulo 1
2. **Formulario de ausencias** — usar el catálogo real del Módulo 3A con los textos exactos
3. **Formulario de atrasos** — agregar como sub-sección dentro de ausencias (Módulo 3B)
4. **Tabla de asistencias/horas extras** — los estados especiales (ALTA P., SS, descanso, ausencia) deben manejarse como texto, no como hora
5. **Planilla** — los campos calculados NO deben ser editables; sólo los del listado "campos que se ingresan manualmente"
6. **Formato de nombre en planilla**: `APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2` (todo mayúsculas)
7. **Código de banco**: número corto (520, 618, etc.) — no el nombre completo del banco
8. **Bonificación de ley**: Q250/mes SIEMPRE (Q125/quincena). No editable, no se pide en el alta.
