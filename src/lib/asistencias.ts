import type {
  AsignacionTurno,
  Ausencia,
  RegistroAsistencia,
  ResumenSemanal,
  Turno,
} from '@/types'
import { calcularHorasPlanificadas } from './utils'
import { inicioDeSemana } from './ausencias'

// =====================================================
// Turno vigente en una fecha
// La asignación vigente es la más reciente con fechaVigencia <= fecha.
// =====================================================
export function turnoVigenteEn(
  asignaciones: AsignacionTurno[] | undefined,
  empleadoId: string,
  fechaISO: string,
): AsignacionTurno | undefined {
  if (!asignaciones) return undefined
  return asignaciones
    .filter((a) => a.empleadoId === empleadoId && a.fechaVigencia <= fechaISO)
    .sort((a, b) => b.fechaVigencia.localeCompare(a.fechaVigencia))[0]
}

// =====================================================
// Días del período (inclusive ambos extremos)
// =====================================================
export function diasDelPeriodo(desde: string, hasta: string): string[] {
  const out: string[] = []
  const d = new Date(desde + 'T00:00:00')
  const h = new Date(hasta + 'T00:00:00')
  if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) return out
  for (let cur = d; cur <= h; cur.setDate(cur.getDate() + 1)) {
    out.push(cur.toISOString().slice(0, 10))
  }
  return out
}

const DIAS_SEMANA_LARGO = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
]

export function nombreDiaSemana(fechaISO: string): string {
  const d = new Date(fechaISO + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return DIAS_SEMANA_LARGO[d.getDay()]
}

// =====================================================
// Día de asistencia "renderizado" — combina registro, turno vigente y ausencia
// =====================================================
export interface DiaAsistencia {
  fecha: string
  diaSemana: string
  turnoVigente?: Turno
  registro?: RegistroAsistencia
  ausenciaId?: string             // si hay ausencia en Fase 3 ese día
  // calculados de la celda
  horasPlanificadas: number       // 0 si descanso/SS/ausencia/alta
  horasTrabajadas: number         // 0 si no es MARCAJE
  deltaExtras: number             // horasTrabajadas - horasPlanificadas (puede ser negativo)
  tipoEfectivo: 'MARCAJE' | 'DESCANSO' | 'SIN_SERVICIO' | 'ALTA_PERIODO' | 'AUSENCIA' | 'PENDIENTE'
}

export interface BuildDiasParams {
  empleadoId: string
  desde: string
  hasta: string
  turnos: Turno[]
  asignaciones: AsignacionTurno[]
  registros: RegistroAsistencia[]
  ausencias: Ausencia[]
}

export function construirDiasEmpleado(p: BuildDiasParams): DiaAsistencia[] {
  const fechas = diasDelPeriodo(p.desde, p.hasta)
  const turnosById = new Map(p.turnos.map((t) => [t.id, t]))
  const registrosByFecha = new Map(
    p.registros.filter((r) => r.empleadoId === p.empleadoId).map((r) => [r.fecha, r]),
  )
  const ausenciasByFecha = new Map(
    p.ausencias.filter((a) => a.empleadoId === p.empleadoId).map((a) => [a.fecha, a]),
  )

  return fechas.map((fecha) => {
    const asg = turnoVigenteEn(p.asignaciones, p.empleadoId, fecha)
    const turnoVigente = asg ? turnosById.get(asg.turnoId) : undefined
    const registro = registrosByFecha.get(fecha)
    const ausencia = ausenciasByFecha.get(fecha)

    let tipoEfectivo: DiaAsistencia['tipoEfectivo']
    if (ausencia) tipoEfectivo = 'AUSENCIA'
    else if (registro) tipoEfectivo = registro.tipoRegistro
    else tipoEfectivo = 'PENDIENTE'

    const horasPlanificadas =
      tipoEfectivo === 'MARCAJE' && turnoVigente ? turnoVigente.horasPlanificadas : 0
    const horasTrabajadas = registro?.horasTrabajadas ?? 0
    const deltaExtras = tipoEfectivo === 'MARCAJE' ? horasTrabajadas - horasPlanificadas : 0

    return {
      fecha,
      diaSemana: nombreDiaSemana(fecha),
      turnoVigente,
      registro,
      ausenciaId: ausencia?.id,
      horasPlanificadas,
      horasTrabajadas,
      deltaExtras,
      tipoEfectivo,
    }
  })
}

// =====================================================
// Resumen semanal (lunes-domingo)
// Si todos los días con marcaje tienen el mismo tipo de turno → extras semanal vs umbral.
// Si hay mezcla DIURNO+NOCTURNO → extras por día (suma de excedentes diarios).
// =====================================================
export function calcularResumenSemanal(
  empleadoId: string,
  diasSemana: DiaAsistencia[],
): ResumenSemanal {
  const dias = diasSemana.filter((d) => d.tipoEfectivo === 'MARCAJE')
  const lunes = diasSemana.length > 0 ? inicioDeSemana(diasSemana[0].fecha) : ''
  if (dias.length === 0) {
    return {
      empleadoId,
      lunes,
      horasTrabajadas: 0,
      horasExtrasDiurnas: 0,
      horasExtrasNocturnas: 0,
      calculoPorDia: false,
    }
  }

  const tipos = new Set(dias.map((d) => d.registro?.tipoTurnoAsignado).filter(Boolean))
  const horasTrab = dias.reduce((acc, d) => acc + d.horasTrabajadas, 0)

  if (tipos.size === 1) {
    // Cálculo semanal acumulado
    const tipo = [...tipos][0] as 'DIURNO' | 'NOCTURNO'
    const umbral = tipo === 'DIURNO' ? 44 : 36
    const extras = Math.max(0, horasTrab - umbral)
    return {
      empleadoId,
      lunes,
      horasTrabajadas: horasTrab,
      horasExtrasDiurnas: tipo === 'DIURNO' ? extras : 0,
      horasExtrasNocturnas: tipo === 'NOCTURNO' ? extras : 0,
      calculoPorDia: false,
    }
  }

  // Cálculo por día (mezcla de turnos)
  let extrasD = 0
  let extrasN = 0
  for (const d of dias) {
    const exc = Math.max(0, d.horasTrabajadas - d.horasPlanificadas)
    if (d.registro?.tipoTurnoAsignado === 'DIURNO') extrasD += exc
    else if (d.registro?.tipoTurnoAsignado === 'NOCTURNO') extrasN += exc
  }
  return {
    empleadoId,
    lunes,
    horasTrabajadas: horasTrab,
    horasExtrasDiurnas: extrasD,
    horasExtrasNocturnas: extrasN,
    calculoPorDia: true,
  }
}

export function agruparPorSemana(dias: DiaAsistencia[]): Map<string, DiaAsistencia[]> {
  const m = new Map<string, DiaAsistencia[]>()
  for (const d of dias) {
    const lunes = inicioDeSemana(d.fecha)
    const list = m.get(lunes) ?? []
    list.push(d)
    m.set(lunes, list)
  }
  return m
}

// Resumen consolidado de todo el período (suma de todas las semanas).
export interface ResumenPeriodo {
  horasTrabajadas: number
  horasExtrasDiurnas: number
  horasExtrasNocturnas: number
  algunaSemanaPorDia: boolean
}

export function calcularResumenPeriodo(
  empleadoId: string,
  dias: DiaAsistencia[],
): ResumenPeriodo {
  const porSemana = agruparPorSemana(dias)
  let trabajadas = 0
  let extrasD = 0
  let extrasN = 0
  let algunaPorDia = false
  for (const [, semana] of porSemana) {
    const r = calcularResumenSemanal(empleadoId, semana)
    trabajadas += r.horasTrabajadas
    extrasD += r.horasExtrasDiurnas
    extrasN += r.horasExtrasNocturnas
    if (r.calculoPorDia) algunaPorDia = true
  }
  return {
    horasTrabajadas: trabajadas,
    horasExtrasDiurnas: extrasD,
    horasExtrasNocturnas: extrasN,
    algunaSemanaPorDia: algunaPorDia,
  }
}

// =====================================================
// Cálculo de horasTrabajadas para un registro (al hacer upsert)
// =====================================================
export function calcularHorasTrabajadasDeMarcaje(
  horaEntradaReal: string | undefined,
  horaSalidaReal: string | undefined,
  incluyeAlmuerzo: boolean,
): number {
  if (!horaEntradaReal || !horaSalidaReal) return 0
  return calcularHorasPlanificadas(horaEntradaReal, horaSalidaReal, incluyeAlmuerzo)
}
