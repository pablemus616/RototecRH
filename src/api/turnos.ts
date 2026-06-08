import type {
  AsignacionTurno,
  AsignacionTurnoInput,
  Turno,
  TurnoInput,
} from '@/types'
import { calcularHorasPlanificadas, umbralHorasExtras } from '@/lib/utils'
import { rrhhApi as api, USE_MOCK } from './client'

const STORAGE_TURNOS = 'rototec.turnos.v1'
const STORAGE_ASIGNACIONES = 'rototec.asignaciones_turno.v1'

// ---------- Storage helpers ----------

function readTurnos(): Turno[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_TURNOS)
    if (!raw) return seedTurnos()
    const parsed = JSON.parse(raw) as Turno[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeTurnos(data: Turno[]) {
  window.localStorage.setItem(STORAGE_TURNOS, JSON.stringify(data))
}

function readAsignaciones(): AsignacionTurno[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_ASIGNACIONES)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AsignacionTurno[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAsignaciones(data: AsignacionTurno[]) {
  window.localStorage.setItem(STORAGE_ASIGNACIONES, JSON.stringify(data))
}

function seedTurnos(): Turno[] {
  const seed: Turno[] = [
    buildTurno('tur-0001', {
      nombre: 'Diurno con almuerzo',
      tipo: 'DIURNO',
      horaEntrada: '06:00',
      horaSalida: '15:00',
      incluyeHoraAlmuerzo: true,
    }),
    buildTurno('tur-0002', {
      nombre: 'Diurno sin almuerzo',
      tipo: 'DIURNO',
      horaEntrada: '06:00',
      horaSalida: '14:00',
      incluyeHoraAlmuerzo: false,
    }),
    buildTurno('tur-0003', {
      nombre: 'Nocturno con almuerzo',
      tipo: 'NOCTURNO',
      horaEntrada: '18:00',
      horaSalida: '03:00',
      incluyeHoraAlmuerzo: true,
    }),
    buildTurno('tur-0004', {
      nombre: 'Nocturno sin almuerzo',
      tipo: 'NOCTURNO',
      horaEntrada: '18:00',
      horaSalida: '02:00',
      incluyeHoraAlmuerzo: false,
    }),
  ]
  writeTurnos(seed)
  return seed
}

function buildTurno(id: string, input: TurnoInput, activo = true): Turno {
  return {
    id,
    ...input,
    horasPlanificadas: calcularHorasPlanificadas(
      input.horaEntrada,
      input.horaSalida,
      input.incluyeHoraAlmuerzo,
    ),
    horasUmbralExtras: umbralHorasExtras(input.tipo),
    activo,
  }
}

function genTurnoId(): string {
  const all = readTurnos()
  const max = all
    .map((t) => Number(t.id.replace('tur-', '')))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `tur-${String(max + 1).padStart(4, '0')}`
}

function genAsignacionId(): string {
  const all = readAsignaciones()
  const max = all
    .map((a) => Number(a.id.replace('asg-', '')))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `asg-${String(max + 1).padStart(4, '0')}`
}

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------- Mock Turnos API ----------

const mockTurnos = {
  async list(): Promise<Turno[]> {
    await delay()
    return readTurnos()
  },
  async get(id: string): Promise<Turno> {
    await delay()
    const found = readTurnos().find((t) => t.id === id)
    if (!found) throw new Error('Turno no encontrado')
    return found
  },
  async create(input: TurnoInput): Promise<Turno> {
    await delay()
    const all = readTurnos()
    if (all.some((t) => t.nombre.trim().toLowerCase() === input.nombre.trim().toLowerCase())) {
      throw new Error('Ya existe un turno con ese nombre')
    }
    const nuevo = buildTurno(genTurnoId(), input)
    writeTurnos([nuevo, ...all])
    return nuevo
  },
  async update(id: string, input: TurnoInput): Promise<Turno> {
    await delay()
    const all = readTurnos()
    const idx = all.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Turno no encontrado')
    const nombreDup = all.some(
      (t) =>
        t.id !== id &&
        t.nombre.trim().toLowerCase() === input.nombre.trim().toLowerCase(),
    )
    if (nombreDup) throw new Error('Ya existe un turno con ese nombre')
    const updated = buildTurno(id, input, all[idx].activo)
    all[idx] = updated
    writeTurnos(all)
    return updated
  },
  async desactivar(id: string): Promise<Turno> {
    await delay()
    const enUsoIds = empleadosConTurnoVigente(id)
    if (enUsoIds.length > 0) {
      throw new Error(
        `No se puede desactivar: ${enUsoIds.length} empleado${
          enUsoIds.length === 1 ? '' : 's'
        } tienen este turno como vigente.`,
      )
    }
    const all = readTurnos()
    const idx = all.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Turno no encontrado')
    const updated: Turno = { ...all[idx], activo: false }
    all[idx] = updated
    writeTurnos(all)
    return updated
  },
  async reactivar(id: string): Promise<Turno> {
    await delay()
    const all = readTurnos()
    const idx = all.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Turno no encontrado')
    const updated: Turno = { ...all[idx], activo: true }
    all[idx] = updated
    writeTurnos(all)
    return updated
  },
}

// ---------- Mock Asignaciones API ----------

const mockAsignaciones = {
  async list(): Promise<AsignacionTurno[]> {
    await delay()
    return readAsignaciones()
  },
  async listByEmpleado(empleadoId: string): Promise<AsignacionTurno[]> {
    await delay()
    return readAsignaciones()
      .filter((a) => a.empleadoId === empleadoId)
      .sort((a, b) => b.fechaVigencia.localeCompare(a.fechaVigencia))
  },
  async create(input: AsignacionTurnoInput): Promise<AsignacionTurno> {
    await delay()
    const turno = readTurnos().find((t) => t.id === input.turnoId)
    if (!turno) throw new Error('Turno no encontrado')
    if (!turno.activo) throw new Error('No se puede asignar un turno desactivado')
    const all = readAsignaciones()
    const nueva: AsignacionTurno = {
      id: genAsignacionId(),
      ...input,
      fechaCreacion: new Date().toISOString(),
    }
    writeAsignaciones([nueva, ...all])
    return nueva
  },
}

// Empleados que tienen este turno como su asignación más reciente con fechaVigencia <= hoy.
function empleadosConTurnoVigente(turnoId: string): string[] {
  const hoy = new Date().toISOString().slice(0, 10)
  const porEmpleado = new Map<string, AsignacionTurno>()
  for (const a of readAsignaciones()) {
    if (a.fechaVigencia > hoy) continue
    const prev = porEmpleado.get(a.empleadoId)
    if (!prev || a.fechaVigencia > prev.fechaVigencia) {
      porEmpleado.set(a.empleadoId, a)
    }
  }
  return [...porEmpleado.values()]
    .filter((a) => a.turnoId === turnoId)
    .map((a) => a.empleadoId)
}

// ---------- Real API ----------

const realTurnos = {
  async list(): Promise<Turno[]> {
    const { data } = await api.get<Turno[]>('/turnos')
    return data
  },
  async get(id: string): Promise<Turno> {
    const { data } = await api.get<Turno>(`/turnos/${id}`)
    return data
  },
  async create(input: TurnoInput): Promise<Turno> {
    const { data } = await api.post<Turno>('/turnos', input)
    return data
  },
  async update(id: string, input: TurnoInput): Promise<Turno> {
    const { data } = await api.put<Turno>(`/turnos/${id}`, input)
    return data
  },
  async desactivar(id: string): Promise<Turno> {
    const { data } = await api.post<Turno>(`/turnos/${id}/desactivar`)
    return data
  },
  async reactivar(id: string): Promise<Turno> {
    const { data } = await api.post<Turno>(`/turnos/${id}/reactivar`)
    return data
  },
}

const realAsignaciones = {
  async list(): Promise<AsignacionTurno[]> {
    const { data } = await api.get<AsignacionTurno[]>('/asignaciones-turno')
    return data
  },
  async listByEmpleado(empleadoId: string): Promise<AsignacionTurno[]> {
    const { data } = await api.get<AsignacionTurno[]>(
      `/empleados/${empleadoId}/asignaciones-turno`,
    )
    return data
  },
  async create(input: AsignacionTurnoInput): Promise<AsignacionTurno> {
    const { data } = await api.post<AsignacionTurno>('/asignaciones-turno', input)
    return data
  },
}

export const turnosApi = USE_MOCK ? mockTurnos : realTurnos
export const asignacionesTurnoApi = USE_MOCK ? mockAsignaciones : realAsignaciones
