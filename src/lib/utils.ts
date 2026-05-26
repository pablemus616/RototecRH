import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatQ(value: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export interface PartesNombre {
  primerNombre: string
  segundoNombre?: string
  tercerNombre?: string
  primerApellido: string
  segundoApellido?: string
  apellidoCasada?: string
}

// Formato de planilla Rototec: APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2 (mayúsculas)
// Incluye apellidoCasada después de los apellidos si existe.
export function nombreCompletoPlanilla(p: PartesNombre): string {
  const partes = [
    p.primerApellido,
    p.segundoApellido,
    p.apellidoCasada,
    p.primerNombre,
    p.segundoNombre,
    p.tercerNombre,
  ]
  return partes
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(' ')
    .toUpperCase()
}

// Formato legible para UI (orden natural, casing original)
export function nombreParaMostrar(p: PartesNombre): string {
  const nombres = [p.primerNombre, p.segundoNombre, p.tercerNombre]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(' ')
  const apellidos = [p.primerApellido, p.segundoApellido, p.apellidoCasada]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(' ')
  return `${nombres} ${apellidos}`.trim()
}

// =====================================================
// Helpers de hora (turnos)
// =====================================================
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export function parseHora(hhmm: string): number {
  const m = HORA_REGEX.exec(hhmm)
  if (!m) return NaN
  return Number(m[1]) * 60 + Number(m[2])
}

export function formatHora(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// Devuelve horas planificadas de un turno. Si la salida es <= entrada, asume
// que cruza medianoche y suma 24h. Descuenta 1h si incluye hora de almuerzo.
export function calcularHorasPlanificadas(
  horaEntrada: string,
  horaSalida: string,
  incluyeAlmuerzo: boolean,
): number {
  const entrada = parseHora(horaEntrada)
  const salida = parseHora(horaSalida)
  if (Number.isNaN(entrada) || Number.isNaN(salida)) return 0
  let diffMin = salida - entrada
  if (diffMin <= 0) diffMin += 24 * 60
  const horas = diffMin / 60
  return Math.max(0, horas - (incluyeAlmuerzo ? 1 : 0))
}

export function umbralHorasExtras(tipo: 'DIURNO' | 'NOCTURNO'): number {
  return tipo === 'DIURNO' ? 44 : 36
}
