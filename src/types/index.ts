export type TipoDocumentoType = 'DPI' | 'PASAPORTE' | 'OTRO'
export type JornadaType = 'DIURNA' | 'NOCTURNA'
export type SexoType = 'M' | 'F'
export type EstadoCivilType = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO' | 'UNION_LIBRE'
export type FormaPagoType = 'TRANSFERENCIA' | 'CHEQUE'
export type TipoCuentaType = 'AHORRO' | 'MONETARIA'
export type TemporalidadContratoType = 'INDEFINIDO' | 'TEMPORAL'
export type TipoContratoType = 'PLANILLA' | 'SERVICIOS' | 'OTRO'
export type EstadoEmpleadoType = 'ACTIVO' | 'BAJA'
export type TipoBajaType = 'RENUNCIA' | 'DESPIDO' | 'ABANDONO'
export type TipoTurno = 'DIURNO' | 'NOCTURNO'
export type DepartamentoRototecType =
  | 'PRODUCCION'
  | 'BODEGA'
  | 'BODEGA_CEDIS'
  | 'BODEGA_ZACAPA'
  | 'VENTAS'

export interface Empleado {
  id: string

  // Identificación Personal
  primerNombre: string
  segundoNombre?: string
  tercerNombre?: string
  primerApellido: string
  segundoApellido?: string
  apellidoCasada?: string
  tipoDocumento: TipoDocumentoType
  dpi: string
  nit: string
  igss: string
  fechaNacimiento: string
  sexo: SexoType
  estadoCivil: EstadoCivilType
  cantidadHijos: number
  tipoDiscapacidad: string

  // Datos Culturales (MINTRAB)
  nacionalidad: string
  paisOrigen: string
  puebloPertenencia: string
  comunidadLinguistica: string
  lugarNacimientoMunicipio?: string
  permisoExtranjero?: string

  // Datos Laborales
  puesto: string
  departamento: DepartamentoRototecType
  jornada: JornadaType
  temporalidadContrato: TemporalidadContratoType
  tipoContrato: TipoContratoType
  fechaIngreso: string
  fechaReingreso?: string
  salarioMensual: number
  sucursal: string
  nivelAcademico: string
  tituloProfesion?: string

  // Datos Bancarios
  formaPago: FormaPagoType
  codigoBanco?: string
  numeroCuenta?: string
  tipoCuenta?: TipoCuentaType

  // Estado / baja
  estado: EstadoEmpleadoType
  tipoBaja?: TipoBajaType
  fechaBaja?: string
  motivoBaja?: string
}

export type EmpleadoInput = Omit<Empleado, 'id' | 'estado' | 'tipoBaja' | 'fechaBaja' | 'motivoBaja'>

export interface BajaInput {
  tipoBaja: TipoBajaType
  fechaBaja: string
  motivoBaja: string
}

// =====================================================
// TURNOS — Catálogo de turnos productivos (Diurno / Nocturno).
// Los "turnos especiales" SIN TURNO / DESCANSO / SS son ESTADOS
// del día en el módulo de asistencias, no entradas de este catálogo.
// =====================================================
export interface Turno {
  id: string
  nombre: string
  tipo: TipoTurno
  horaEntrada: string             // 'HH:mm'
  horaSalida: string              // 'HH:mm' — puede ser <entrada si cruza medianoche
  incluyeHoraAlmuerzo: boolean
  horasPlanificadas: number       // (salida - entrada en h) - (almuerzo ? 1 : 0)
  horasUmbralExtras: number       // 44 diurno, 36 nocturno
  activo: boolean
}

export type TurnoInput = Omit<Turno, 'id' | 'horasPlanificadas' | 'horasUmbralExtras' | 'activo'>

// =====================================================
// ASIGNACIONES — historial de turno por empleado.
// Cada cambio de turno crea una nueva entrada con fecha de vigencia.
// El turno vigente es el más reciente (fechaVigencia <= hoy).
// =====================================================
export interface AsignacionTurno {
  id: string
  empleadoId: string
  turnoId: string
  fechaVigencia: string           // ISO date
  notas?: string
  fechaCreacion: string           // ISO datetime
}

export type AsignacionTurnoInput = Omit<AsignacionTurno, 'id' | 'fechaCreacion'>

// =====================================================
// AUSENCIAS — tipos extraídos del archivo real del cliente
// (REPORTE_DE_AUSENCIAS_Y_ATRASOS_-_OE.xlsx)
// =====================================================
export type TipoAusencia =
  | 'AUSENCIA_INJUSTIFICADA'
  | 'AUSENCIA_ENFERMEDAD_SIN_IGSS'
  | 'AUSENCIA_POR_IGSS'
  | 'AUSENCIA_MEDIO_DIA_IGSS'
  | 'SUSPENSION_AMONESTACION'
  | 'SUSPENSION_2_DIAS'
  | 'VACACIONES'
  | 'VACACIONES_TURNO_SUSPENDIDO'
  | 'MUERTE_FAMILIAR'
  | 'PENDIENTE'

export type MedidaDisciplinaria =
  | 'DESCUENTO_DIA_Y_SEPTIMO'
  | 'DESCONTAR_DIA_PAGA_IGSS'
  | 'DESCONTAR_EL_DIA'
  | 'DESCUENTO_2_DIAS_Y_SEPTIMO'
  | 'SIN_DESCUENTO'
  | 'PENDIENTE'
  | 'DESCUENTO_EN_NOMINA'  // sólo para atrasos

export interface Ausencia {
  id: string
  empleadoId: string
  fecha: string                   // ISO date YYYY-MM-DD
  tipoAusencia: TipoAusencia
  medidaDisciplinaria: MedidaDisciplinaria
  justificacion?: string
  presentoConstancia: boolean
  // Calculados al guardar (snapshot del cálculo en el momento)
  diasDescontados: number         // 0, 0.5, 1, 2
  descontarSeptimo: boolean       // se aplica una sola vez por semana
  pagaIGSS: boolean               // sólo AUSENCIA_POR_IGSS
  fechaCreacion: string
}

export type AusenciaInput = Omit<Ausencia, 'id' | 'medidaDisciplinaria' | 'diasDescontados' | 'descontarSeptimo' | 'pagaIGSS' | 'fechaCreacion'>

export interface Atraso {
  id: string
  empleadoId: string
  fecha: string
  horaEntradaReal: string         // HH:mm
  horaSalidaReal: string          // HH:mm
  turnoDescripcion?: string       // ej: "TURNO PROGRAMADO DE 09:00 A 18:00"
  minutosRetraso: number          // en MINUTOS enteros
  medidaDisciplinaria: MedidaDisciplinaria  // por defecto DESCUENTO_EN_NOMINA
  fechaCreacion: string
}

export type AtrasoInput = Omit<Atraso, 'id' | 'fechaCreacion'>

// =====================================================
// ASISTENCIAS
// Cinco estados de un día. Los estados especiales no suman horas trabajadas.
// =====================================================
export type TipoRegistroAsistencia =
  | 'MARCAJE'
  | 'DESCANSO'
  | 'SIN_SERVICIO'    // SS en el archivo del cliente
  | 'ALTA_PERIODO'    // ALTA P. — empleado entró en el período, no calcular extras
  | 'AUSENCIA'        // cruce con módulo de ausencias

export interface RegistroAsistencia {
  id: string
  empleadoId: string
  fecha: string                   // ISO YYYY-MM-DD
  tipoRegistro: TipoRegistroAsistencia
  // Snapshot del turno asignado al momento de registrar (para que el cálculo
  // sea estable aunque el catálogo cambie después).
  turnoIdAsignado?: string
  turnoEntradaAsignado?: string   // HH:mm
  turnoSalidaAsignado?: string    // HH:mm
  tipoTurnoAsignado?: TipoTurno   // DIURNO | NOCTURNO
  incluyeHoraAlmuerzo?: boolean
  // Marcaje real (sólo si tipoRegistro = MARCAJE)
  horaEntradaReal?: string        // HH:mm
  horaSalidaReal?: string         // HH:mm
  // Calculados al guardar
  horasTrabajadas: number         // (salidaReal - entradaReal) - almuerzo
  horasComida: number             // 1 si incluyeHoraAlmuerzo, 0 si no
  observaciones?: string
  fechaCreacion: string
}

export type RegistroAsistenciaInput = Omit<
  RegistroAsistencia,
  'id' | 'horasTrabajadas' | 'horasComida' | 'fechaCreacion'
>

// Resumen semanal (lunes-domingo) por empleado.
export interface ResumenSemanal {
  empleadoId: string
  lunes: string                   // ISO YYYY-MM-DD
  horasTrabajadas: number
  horasExtrasDiurnas: number
  horasExtrasNocturnas: number
  calculoPorDia: boolean          // true si hubo mezcla de tipo de turno
}

// =====================================================
// PLANILLA — modelo consolidado (pre-planilla + planilla final)
// Una planilla por período (mes + quincena). Dos estados: BORRADOR / CERRADA.
// =====================================================
export type EstadoPlanilla = 'BORRADOR' | 'CERRADA'

export interface EmpleadoSnapshot {
  nombreCompleto: string          // formato APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2
  dpi: string
  nit: string
  igss: string
  puesto: string
  departamento: string            // string del enum (DEPARTAMENTOS_ROTOTEC)
  salarioMensual: number
  formaPago: FormaPagoType
  codigoBanco?: string
  numeroCuenta?: string
  tipoCuenta?: TipoCuentaType
  fechaIngreso: string
  estadoAlta: 'ACTIVO' | ''
  estadoContrato: 'ACTIVO' | ''
  fechaEgreso?: string
  tipoBaja?: TipoBajaType
}

// Campos que el usuario puede editar línea por línea cuando la planilla está en BORRADOR.
export interface LineaInputManual {
  // Horas extras (pre-llenadas desde Fase 4, editables)
  heSimplesDiurnas: number
  heSimplesMixtas: number
  heSimplesNocturnas: number
  heDobles: number
  // Descuentos manuales
  anticipoQuincenal: number
  descuento1: number
  descuento2: number
  embargos: number
  // Bonos manuales
  bonoProductividadAcabados: number
  bonoExtraordinario: number      // BONO DECRETO 37-2001 variable — NO es la bonificación de ley
  otrosIngresos: number
  bolsonBonificacionesMaquinas: number
  bonoRendimientoAcabados: number
  // ISR override (si está vacío usa la fórmula calculada)
  isrOverride?: number
}

export interface LineaPlanilla extends LineaInputManual {
  empleadoId: string
  empleadoSnapshot: EmpleadoSnapshot
  // Días e información del período
  diasDelMes: number              // 15 para quincena
  ausenciasDias: number           // suma diasDescontados + séptimos (del módulo de Ausencias)
  diasSuspensionIGSS: number      // count de AUSENCIA_POR_IGSS
  diasAPagar: number              // diasDelMes - ausenciasDias
  // Calculados
  sueldoPercibido: number
  bonificacionIncentivo: number   // Q125 quincenal fijo por ley
  valorHoraOrdinaria: number      // salario/30/8
  valorHoraExtraDiurna: number    // valorHoraOrdinaria × 1.5
  valorHoraExtraNocturna: number
  valorHoraExtraMixta: number
  valorHoraExtraDoble: number
  ingresoHorasDiurnas: number
  ingresoHorasNocturnas: number
  ingresoHorasMixtas: number
  ingresoHorasDobles: number
  totalIngresos: number
  igssLaboral: number             // sueldoPercibido × 4.83%
  isr: number
  totalDescuentos: number
  liquidoRecibir: number
  // Provisiones (para Contabilidad — no se descuentan del líquido)
  igssPatronal: number
  provisionIntecap: number
  provisionIrtra: number
  provisionAguinaldo: number
}

export interface TotalesPlanilla {
  cantidadEmpleados: number
  totalSueldoPercibido: number
  totalBonificacionIncentivo: number
  totalHorasExtras: number
  totalBonos: number
  totalIngresos: number
  totalIGSSLaboral: number
  totalISR: number
  totalDescuentos: number
  totalLiquido: number
  totalIGSSPatronal: number
  totalIntecap: number
  totalIrtra: number
  totalAguinaldo: number
}

export interface Planilla {
  id: string
  periodo: string                 // 'YYYY-MM-Q'  ej. '2026-05-1'
  desde: string                   // ISO date
  hasta: string                   // ISO date
  estado: EstadoPlanilla
  lineas: LineaPlanilla[]
  totales: TotalesPlanilla
  fechaGeneracion: string
  fechaCierre?: string
}

// =====================================================
// BONIFICACIONES — captura previa por empleado/período.
// Al generar planilla, las bonificaciones del período se suman al
// campo de LineaPlanilla correspondiente según su tipo.
// =====================================================
export type TipoBonificacion =
  | 'PRODUCCION_ACABADOS'
  | 'EXTRAORDINARIO_37_2001'
  | 'OTROS_INGRESOS'
  | 'BOLSON_MAQUINAS'
  | 'RENDIMIENTO_ACABADOS'
  | 'OTRO'

export interface Bonificacion {
  id: string
  empleadoId: string
  periodo: string                 // 'YYYY-MM-Q'
  tipo: TipoBonificacion
  monto: number
  descripcion?: string
  fechaCreacion: string
}

export type BonificacionInput = Omit<Bonificacion, 'id' | 'fechaCreacion'>

export interface BonificacionBatchInput {
  empleadoIds: string[]
  periodo: string
  tipo: TipoBonificacion
  monto: number
  descripcion?: string
}
