import { BONIFICACION_POR_TIPO } from '@/constants/bonificaciones'
import { BONIFICACION_INCENTIVO_LEY } from '@/constants/guatemala'
import type {
  AsignacionTurno,
  Atraso,
  Ausencia,
  Bonificacion,
  Empleado,
  EmpleadoSnapshot,
  LineaInputManual,
  LineaPlanilla,
  Planilla,
  RegistroAsistencia,
  TotalesPlanilla,
  Turno,
} from '@/types'
import {
  calcularResumenPeriodo,
  construirDiasEmpleado,
} from './asistencias'
import { nombreCompletoPlanilla } from './utils'

// =====================================================
// Tasas y constantes Guatemala 2025-2026
// =====================================================
const IGSS_LABORAL_RATE = 0.0483
const IGSS_PATRONAL_RATE = 0.1267
const INTECAP_RATE = 0.01
const IRTRA_RATE = 0.01
const HORAS_JORNADA_DIARIA = 8     // promedio diario para valor hora
const DIAS_MES_NOMINAL = 30
const HE_DIURNA_MULTIPLICADOR = 1.5
const HE_NOCTURNA_MULTIPLICADOR = 1.5
const HE_MIXTA_MULTIPLICADOR = 1.5
const HE_DOBLE_MULTIPLICADOR = 2.0
const BONIFICACION_QUINCENAL = BONIFICACION_INCENTIVO_LEY / 2  // Q125
const DIAS_QUINCENA = 15

// ISR régimen opcional simplificado para empleados (Guatemala)
// - Deducción personal: Q48,000 anual
// - 5% sobre renta imponible hasta Q300,000 anuales
// - 7% sobre el excedente
// La bonificación incentivo NO se incluye en la base ISR.
const ISR_EXENCION_ANUAL = 48000
const ISR_TRAMO_1_TOPE = 300000
const ISR_TASA_1 = 0.05
const ISR_TASA_2 = 0.07
const QUINCENAS_POR_ANIO = 24

function isrQuincenal(salarioMensual: number): number {
  const anualEstimado = salarioMensual * 12
  const rentaImponible = Math.max(0, anualEstimado - ISR_EXENCION_ANUAL)
  if (rentaImponible === 0) return 0
  if (rentaImponible <= ISR_TRAMO_1_TOPE) {
    return (rentaImponible * ISR_TASA_1) / QUINCENAS_POR_ANIO
  }
  const isrAnual =
    ISR_TRAMO_1_TOPE * ISR_TASA_1 + (rentaImponible - ISR_TRAMO_1_TOPE) * ISR_TASA_2
  return isrAnual / QUINCENAS_POR_ANIO
}

function snapshotEmpleado(e: Empleado): EmpleadoSnapshot {
  return {
    nombreCompleto: nombreCompletoPlanilla(e),
    dpi: e.dpi,
    nit: e.nit,
    igss: e.igss,
    puesto: e.puesto,
    departamento: e.departamento,
    salarioMensual: e.salarioMensual,
    formaPago: e.formaPago,
    codigoBanco: e.codigoBanco,
    numeroCuenta: e.numeroCuenta,
    tipoCuenta: e.tipoCuenta,
    fechaIngreso: e.fechaIngreso,
    estadoAlta: e.estado === 'ACTIVO' ? 'ACTIVO' : '',
    estadoContrato: e.estado === 'ACTIVO' ? 'ACTIVO' : '',
    fechaEgreso: e.fechaBaja,
    tipoBaja: e.tipoBaja,
  }
}

function diasDescontadosDeAusencia(a: Ausencia): number {
  return a.diasDescontados + (a.descontarSeptimo ? 1 : 0)
}

function sumarMinutosRetraso(atrasos: Atraso[]): number {
  return atrasos.reduce((acc, a) => acc + a.minutosRetraso, 0)
}

// =====================================================
// Recalcular toda la línea aplicando los inputs manuales actuales.
// Se llama tanto al generar inicialmente como al editar un campo manual.
// =====================================================
export function recalcularLinea(
  linea: LineaPlanilla,
): LineaPlanilla {
  const snap = linea.empleadoSnapshot
  const salarioMensual = snap.salarioMensual

  // Días a pagar
  const diasAPagar = Math.max(0, linea.diasDelMes - linea.ausenciasDias)

  // Sueldo percibido
  const sueldoPercibido = (salarioMensual / DIAS_MES_NOMINAL) * diasAPagar

  // Valor hora
  const valorHoraOrdinaria = salarioMensual / DIAS_MES_NOMINAL / HORAS_JORNADA_DIARIA
  const valorHoraExtraDiurna = valorHoraOrdinaria * HE_DIURNA_MULTIPLICADOR
  const valorHoraExtraNocturna = valorHoraOrdinaria * HE_NOCTURNA_MULTIPLICADOR
  const valorHoraExtraMixta = valorHoraOrdinaria * HE_MIXTA_MULTIPLICADOR
  const valorHoraExtraDoble = valorHoraOrdinaria * HE_DOBLE_MULTIPLICADOR

  // Ingreso horas extras
  const ingresoHorasDiurnas = linea.heSimplesDiurnas * valorHoraExtraDiurna
  const ingresoHorasNocturnas = linea.heSimplesNocturnas * valorHoraExtraNocturna
  const ingresoHorasMixtas = linea.heSimplesMixtas * valorHoraExtraMixta
  const ingresoHorasDobles = linea.heDobles * valorHoraExtraDoble

  // Bonificación incentivo (fija por ley)
  const bonificacionIncentivo = BONIFICACION_QUINCENAL

  // Total ingresos
  const totalIngresos =
    sueldoPercibido +
    bonificacionIncentivo +
    ingresoHorasDiurnas +
    ingresoHorasNocturnas +
    ingresoHorasMixtas +
    ingresoHorasDobles +
    linea.bonoProductividadAcabados +
    linea.bonoExtraordinario +
    linea.otrosIngresos +
    linea.bolsonBonificacionesMaquinas +
    linea.bonoRendimientoAcabados

  // IGSS laboral (sólo sobre salario ordinario / sueldo percibido)
  const igssLaboral = sueldoPercibido * IGSS_LABORAL_RATE

  // ISR (fórmula simple, con override editable)
  const isr =
    linea.isrOverride !== undefined && linea.isrOverride >= 0
      ? linea.isrOverride
      : isrQuincenal(salarioMensual)

  // Descuentos
  const totalDescuentos =
    igssLaboral +
    isr +
    linea.anticipoQuincenal +
    linea.descuento1 +
    linea.descuento2 +
    linea.embargos

  const liquidoRecibir = totalIngresos - totalDescuentos

  // Provisiones
  const igssPatronal = sueldoPercibido * IGSS_PATRONAL_RATE
  const provisionIntecap = sueldoPercibido * INTECAP_RATE
  const provisionIrtra = sueldoPercibido * IRTRA_RATE
  const provisionAguinaldo = sueldoPercibido / 12

  return {
    ...linea,
    diasAPagar,
    sueldoPercibido: redondear(sueldoPercibido),
    bonificacionIncentivo: redondear(bonificacionIncentivo),
    valorHoraOrdinaria: redondear(valorHoraOrdinaria, 4),
    valorHoraExtraDiurna: redondear(valorHoraExtraDiurna, 4),
    valorHoraExtraNocturna: redondear(valorHoraExtraNocturna, 4),
    valorHoraExtraMixta: redondear(valorHoraExtraMixta, 4),
    valorHoraExtraDoble: redondear(valorHoraExtraDoble, 4),
    ingresoHorasDiurnas: redondear(ingresoHorasDiurnas),
    ingresoHorasNocturnas: redondear(ingresoHorasNocturnas),
    ingresoHorasMixtas: redondear(ingresoHorasMixtas),
    ingresoHorasDobles: redondear(ingresoHorasDobles),
    totalIngresos: redondear(totalIngresos),
    igssLaboral: redondear(igssLaboral),
    isr: redondear(isr),
    totalDescuentos: redondear(totalDescuentos),
    liquidoRecibir: redondear(liquidoRecibir),
    igssPatronal: redondear(igssPatronal),
    provisionIntecap: redondear(provisionIntecap),
    provisionIrtra: redondear(provisionIrtra),
    provisionAguinaldo: redondear(provisionAguinaldo),
  }
}

function redondear(n: number, decimales = 2): number {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

// =====================================================
// Aplicar nuevos inputs manuales a una línea y recalcular
// =====================================================
export function actualizarInputsLinea(
  linea: LineaPlanilla,
  parche: Partial<LineaInputManual>,
): LineaPlanilla {
  const merged: LineaPlanilla = { ...linea, ...parche }
  return recalcularLinea(merged)
}

// =====================================================
// Calcular totales sumando todas las líneas
// =====================================================
export function calcularTotales(lineas: LineaPlanilla[]): TotalesPlanilla {
  const t: TotalesPlanilla = {
    cantidadEmpleados: lineas.length,
    totalSueldoPercibido: 0,
    totalBonificacionIncentivo: 0,
    totalHorasExtras: 0,
    totalBonos: 0,
    totalIngresos: 0,
    totalIGSSLaboral: 0,
    totalISR: 0,
    totalDescuentos: 0,
    totalLiquido: 0,
    totalIGSSPatronal: 0,
    totalIntecap: 0,
    totalIrtra: 0,
    totalAguinaldo: 0,
  }
  for (const l of lineas) {
    t.totalSueldoPercibido += l.sueldoPercibido
    t.totalBonificacionIncentivo += l.bonificacionIncentivo
    t.totalHorasExtras +=
      l.ingresoHorasDiurnas +
      l.ingresoHorasNocturnas +
      l.ingresoHorasMixtas +
      l.ingresoHorasDobles
    t.totalBonos +=
      l.bonoProductividadAcabados +
      l.bonoExtraordinario +
      l.otrosIngresos +
      l.bolsonBonificacionesMaquinas +
      l.bonoRendimientoAcabados
    t.totalIngresos += l.totalIngresos
    t.totalIGSSLaboral += l.igssLaboral
    t.totalISR += l.isr
    t.totalDescuentos += l.totalDescuentos
    t.totalLiquido += l.liquidoRecibir
    t.totalIGSSPatronal += l.igssPatronal
    t.totalIntecap += l.provisionIntecap
    t.totalIrtra += l.provisionIrtra
    t.totalAguinaldo += l.provisionAguinaldo
  }
  // Redondear los totales
  for (const k of Object.keys(t) as (keyof TotalesPlanilla)[]) {
    if (typeof t[k] === 'number' && k !== 'cantidadEmpleados') {
      ;(t[k] as number) = redondear(t[k] as number)
    }
  }
  return t
}

// =====================================================
// Generar planilla completa para un período
// =====================================================
export interface ParamsGenerarPlanilla {
  empleados: Empleado[]
  turnos: Turno[]
  asignaciones: AsignacionTurno[]
  asistencias: RegistroAsistencia[]
  ausencias: Ausencia[]
  atrasos: Atraso[]
  bonificaciones: Bonificacion[]
  desde: string
  hasta: string
  periodo: string
}

export function generarPlanilla(p: ParamsGenerarPlanilla): Planilla {
  const empleadosActivos = p.empleados.filter((e) => e.estado === 'ACTIVO')
  const lineas: LineaPlanilla[] = empleadosActivos.map((e) =>
    construirLineaInicial(e, p),
  )
  const lineasCalculadas = lineas.map(recalcularLinea)
  const totales = calcularTotales(lineasCalculadas)

  return {
    id: `pln-${p.periodo}`,
    periodo: p.periodo,
    desde: p.desde,
    hasta: p.hasta,
    estado: 'BORRADOR',
    lineas: lineasCalculadas,
    totales,
    fechaGeneracion: new Date().toISOString(),
  }
}

function construirLineaInicial(
  e: Empleado,
  p: ParamsGenerarPlanilla,
): LineaPlanilla {
  // Días de ausencia del empleado en el período
  const ausenciasEmp = p.ausencias.filter(
    (a) => a.empleadoId === e.id && a.fecha >= p.desde && a.fecha <= p.hasta,
  )
  const ausenciasDias = ausenciasEmp.reduce(
    (acc, a) => acc + diasDescontadosDeAusencia(a),
    0,
  )
  const diasSuspensionIGSS = ausenciasEmp.filter(
    (a) => a.tipoAusencia === 'AUSENCIA_POR_IGSS',
  ).length

  // Horas extras del período (auto desde Fase 4)
  const diasAsistencia = construirDiasEmpleado({
    empleadoId: e.id,
    desde: p.desde,
    hasta: p.hasta,
    turnos: p.turnos,
    asignaciones: p.asignaciones,
    registros: p.asistencias,
    ausencias: p.ausencias,
  })
  const resumen = calcularResumenPeriodo(e.id, diasAsistencia)

  // Restar atrasos del sueldo? Los atrasos en Rototec se descuentan en nómina
  // (medidaDisciplinaria DESCUENTO_EN_NOMINA). Los traduzco a un valor que va a "descuento1".
  const atrasosEmp = p.atrasos.filter(
    (a) => a.empleadoId === e.id && a.fecha >= p.desde && a.fecha <= p.hasta,
  )
  const minutosAtrasoTotales = sumarMinutosRetraso(atrasosEmp)
  const valorMinutoOrdinario =
    e.salarioMensual / DIAS_MES_NOMINAL / HORAS_JORNADA_DIARIA / 60
  const descuentoAtrasos = redondear(minutosAtrasoTotales * valorMinutoOrdinario)

  // Sumar bonificaciones pre-capturadas del catálogo (Fase 6) por tipo de bono.
  const bonosEmp = p.bonificaciones.filter(
    (b) => b.empleadoId === e.id && b.periodo === p.periodo,
  )
  const sumasBonos: Record<string, number> = {
    bonoProductividadAcabados: 0,
    bonoExtraordinario: 0,
    bolsonBonificacionesMaquinas: 0,
    bonoRendimientoAcabados: 0,
    otrosIngresos: 0,
  }
  for (const b of bonosEmp) {
    const def = BONIFICACION_POR_TIPO.get(b.tipo)
    if (!def) continue
    sumasBonos[def.campoDestino] = (sumasBonos[def.campoDestino] ?? 0) + b.monto
  }

  const inputManual: LineaInputManual = {
    heSimplesDiurnas: redondear(resumen.horasExtrasDiurnas, 2),
    heSimplesMixtas: 0,
    heSimplesNocturnas: redondear(resumen.horasExtrasNocturnas, 2),
    heDobles: 0,
    anticipoQuincenal: 0,
    descuento1: descuentoAtrasos,
    descuento2: 0,
    embargos: 0,
    bonoProductividadAcabados: redondear(sumasBonos.bonoProductividadAcabados),
    bonoExtraordinario: redondear(sumasBonos.bonoExtraordinario),
    otrosIngresos: redondear(sumasBonos.otrosIngresos),
    bolsonBonificacionesMaquinas: redondear(sumasBonos.bolsonBonificacionesMaquinas),
    bonoRendimientoAcabados: redondear(sumasBonos.bonoRendimientoAcabados),
  }

  const linea: LineaPlanilla = {
    empleadoId: e.id,
    empleadoSnapshot: snapshotEmpleado(e),
    diasDelMes: DIAS_QUINCENA,
    ausenciasDias,
    diasSuspensionIGSS,
    diasAPagar: 0, // se recalcula
    sueldoPercibido: 0,
    bonificacionIncentivo: 0,
    valorHoraOrdinaria: 0,
    valorHoraExtraDiurna: 0,
    valorHoraExtraNocturna: 0,
    valorHoraExtraMixta: 0,
    valorHoraExtraDoble: 0,
    ingresoHorasDiurnas: 0,
    ingresoHorasNocturnas: 0,
    ingresoHorasMixtas: 0,
    ingresoHorasDobles: 0,
    totalIngresos: 0,
    igssLaboral: 0,
    isr: 0,
    totalDescuentos: 0,
    liquidoRecibir: 0,
    igssPatronal: 0,
    provisionIntecap: 0,
    provisionIrtra: 0,
    provisionAguinaldo: 0,
    ...inputManual,
  }

  return linea
}

// =====================================================
// Helper periodo
// =====================================================
export function periodoKey(year: number, monthIndex: number, num: 1 | 2): string {
  const mes = String(monthIndex + 1).padStart(2, '0')
  return `${year}-${mes}-${num}`
}
