import { REGLA_POR_TIPO } from '@/constants/ausencias'
import type { Ausencia, TipoAusencia } from '@/types'

// =====================================================
// Hora decimal ↔ HH:mm (atrasos)
// El archivo del cliente guarda atrasos como decimal de horas:
// 0.36 = 0.36 h = 21.6 min ≈ 22 min ≈ "00:22"
// =====================================================
export function decimalHorasAMinutos(decimal: number): number {
  return Math.round(decimal * 60)
}

export function minutosADecimalHoras(min: number): number {
  return min / 60
}

export function minutosAHHMM(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  return `${String(h).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

// =====================================================
// Semana lunes-domingo (formato 'YYYY-MM-DD' del lunes)
// =====================================================
export function inicioDeSemana(fechaISO: string): string {
  const d = new Date(fechaISO + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return fechaISO
  // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const dow = d.getDay()
  const offsetADesdeLunes = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - offsetADesdeLunes)
  return d.toISOString().slice(0, 10)
}

// =====================================================
// Quincena (1ª: días 1-15, 2ª: días 16-fin del mes)
// =====================================================
export type Quincena = 1 | 2

export interface RangoQuincena {
  desde: string                   // YYYY-MM-DD
  hasta: string                   // YYYY-MM-DD (inclusivo)
}

export function rangoQuincena(year: number, monthIndex: number, num: Quincena): RangoQuincena {
  // monthIndex es 0-based como en JS Date
  if (num === 1) {
    const desde = new Date(year, monthIndex, 1)
    const hasta = new Date(year, monthIndex, 15)
    return { desde: toISODate(desde), hasta: toISODate(hasta) }
  }
  const desde = new Date(year, monthIndex, 16)
  const hasta = new Date(year, monthIndex + 1, 0) // último día del mes
  return { desde: toISODate(desde), hasta: toISODate(hasta) }
}

export function quincenaDeHoy(): { year: number; monthIndex: number; num: Quincena } {
  const now = new Date()
  const num: Quincena = now.getDate() <= 15 ? 1 : 2
  return { year: now.getFullYear(), monthIndex: now.getMonth(), num }
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// =====================================================
// Cálculo de descuento de una ausencia
// Aplica regla del séptimo: una sola vez por semana lunes-domingo,
// aunque haya múltiples ausencias injustificadas en esa semana.
// =====================================================
export interface CalculoAusencia {
  diasDescontados: number
  descontarSeptimo: boolean
  pagaIGSS: boolean
}

export function calcularAusencia(
  tipo: TipoAusencia,
  fechaISO: string,
  otrasAusenciasMismaSemana: Pick<Ausencia, 'fecha' | 'descontarSeptimo'>[],
): CalculoAusencia {
  const regla = REGLA_POR_TIPO.get(tipo)
  if (!regla) {
    return { diasDescontados: 0, descontarSeptimo: false, pagaIGSS: false }
  }
  let descontarSeptimo = regla.descontarSeptimo
  if (descontarSeptimo) {
    const lunes = inicioDeSemana(fechaISO)
    const yaDescontado = otrasAusenciasMismaSemana.some(
      (a) =>
        a.descontarSeptimo === true &&
        inicioDeSemana(a.fecha) === lunes,
    )
    if (yaDescontado) descontarSeptimo = false
  }
  return {
    diasDescontados: regla.diasDescontar,
    descontarSeptimo,
    pagaIGSS: regla.pagaIGSS,
  }
}

// Calcula minutos de retraso a partir de hora programada vs hora real.
// Si llegó antes de lo programado, retorna 0 (no negativo).
export function minutosDeRetraso(turnoEntradaHHMM: string, realEntradaHHMM: string): number {
  const t = parseHHMM(turnoEntradaHHMM)
  const r = parseHHMM(realEntradaHHMM)
  if (t == null || r == null) return 0
  return Math.max(0, r - t)
}

function parseHHMM(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}
