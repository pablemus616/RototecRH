import type { Atraso, AtrasoInput, Ausencia, AusenciaInput } from '@/types'
import { REGLA_POR_TIPO } from '@/constants/ausencias'
import { calcularAusencia, inicioDeSemana } from '@/lib/ausencias'
import { rrhhApi as api, USE_MOCK } from './client'

const STORAGE_AUSENCIAS = 'rototec.ausencias.v1'
const STORAGE_ATRASOS = 'rototec.atrasos.v1'

// ---------- Storage ----------

function readAusencias(): Ausencia[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_AUSENCIAS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Ausencia[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
function writeAusencias(data: Ausencia[]) {
  window.localStorage.setItem(STORAGE_AUSENCIAS, JSON.stringify(data))
}

function readAtrasos(): Atraso[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_ATRASOS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Atraso[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
function writeAtrasos(data: Atraso[]) {
  window.localStorage.setItem(STORAGE_ATRASOS, JSON.stringify(data))
}

function genAusenciaId(): string {
  const all = readAusencias()
  const max = all
    .map((a) => Number(a.id.replace('aus-', '')))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `aus-${String(max + 1).padStart(5, '0')}`
}
function genAtrasoId(): string {
  const all = readAtrasos()
  const max = all
    .map((a) => Number(a.id.replace('atr-', '')))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `atr-${String(max + 1).padStart(5, '0')}`
}

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms))
}

function calcularYAplicar(empleadoId: string, fecha: string, tipo: Ausencia['tipoAusencia'], todas: Ausencia[]) {
  const lunes = inicioDeSemana(fecha)
  const otras = todas.filter(
    (a) => a.empleadoId === empleadoId && inicioDeSemana(a.fecha) === lunes,
  )
  return calcularAusencia(tipo, fecha, otras)
}

// ---------- Mock Ausencias ----------

const mockAusencias = {
  async list(): Promise<Ausencia[]> {
    await delay()
    return readAusencias()
  },
  async listByPeriodo(desde: string, hasta: string): Promise<Ausencia[]> {
    await delay()
    return readAusencias().filter((a) => a.fecha >= desde && a.fecha <= hasta)
  },
  async listByEmpleado(empleadoId: string): Promise<Ausencia[]> {
    await delay()
    return readAusencias()
      .filter((a) => a.empleadoId === empleadoId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  },
  async create(input: AusenciaInput): Promise<Ausencia> {
    await delay()
    const all = readAusencias()
    const dup = all.find(
      (a) => a.empleadoId === input.empleadoId && a.fecha === input.fecha,
    )
    if (dup) {
      throw new Error('Ya existe una ausencia registrada para ese empleado en esa fecha')
    }
    const calc = calcularYAplicar(input.empleadoId, input.fecha, input.tipoAusencia, all)
    const regla = REGLA_POR_TIPO.get(input.tipoAusencia)
    const nueva: Ausencia = {
      ...input,
      id: genAusenciaId(),
      medidaDisciplinaria: regla?.medidaDefault ?? 'PENDIENTE',
      diasDescontados: calc.diasDescontados,
      descontarSeptimo: calc.descontarSeptimo,
      pagaIGSS: calc.pagaIGSS,
      fechaCreacion: new Date().toISOString(),
    }
    writeAusencias([nueva, ...all])
    return nueva
  },
  async update(id: string, input: AusenciaInput): Promise<Ausencia> {
    await delay()
    const all = readAusencias()
    const idx = all.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Ausencia no encontrada')
    const otras = all.filter((a) => a.id !== id)
    const calc = calcularYAplicar(input.empleadoId, input.fecha, input.tipoAusencia, otras)
    const regla = REGLA_POR_TIPO.get(input.tipoAusencia)
    const updated: Ausencia = {
      ...all[idx],
      ...input,
      medidaDisciplinaria: regla?.medidaDefault ?? 'PENDIENTE',
      diasDescontados: calc.diasDescontados,
      descontarSeptimo: calc.descontarSeptimo,
      pagaIGSS: calc.pagaIGSS,
    }
    all[idx] = updated
    writeAusencias(all)
    return updated
  },
  async remove(id: string): Promise<void> {
    await delay()
    const all = readAusencias().filter((a) => a.id !== id)
    writeAusencias(all)
  },
}

// ---------- Mock Atrasos ----------

const mockAtrasos = {
  async list(): Promise<Atraso[]> {
    await delay()
    return readAtrasos()
  },
  async listByPeriodo(desde: string, hasta: string): Promise<Atraso[]> {
    await delay()
    return readAtrasos().filter((a) => a.fecha >= desde && a.fecha <= hasta)
  },
  async listByEmpleado(empleadoId: string): Promise<Atraso[]> {
    await delay()
    return readAtrasos()
      .filter((a) => a.empleadoId === empleadoId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  },
  async create(input: AtrasoInput): Promise<Atraso> {
    await delay()
    const all = readAtrasos()
    const nuevo: Atraso = {
      ...input,
      id: genAtrasoId(),
      fechaCreacion: new Date().toISOString(),
    }
    writeAtrasos([nuevo, ...all])
    return nuevo
  },
  async update(id: string, input: AtrasoInput): Promise<Atraso> {
    await delay()
    const all = readAtrasos()
    const idx = all.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Atraso no encontrado')
    const updated: Atraso = { ...all[idx], ...input }
    all[idx] = updated
    writeAtrasos(all)
    return updated
  },
  async remove(id: string): Promise<void> {
    await delay()
    const all = readAtrasos().filter((a) => a.id !== id)
    writeAtrasos(all)
  },
}

// ---------- Real API ----------

const realAusencias = {
  async list(): Promise<Ausencia[]> {
    const { data } = await api.get<Ausencia[]>('/ausencias')
    return data
  },
  async listByPeriodo(desde: string, hasta: string): Promise<Ausencia[]> {
    const { data } = await api.get<Ausencia[]>('/ausencias', { params: { desde, hasta } })
    return data
  },
  async listByEmpleado(empleadoId: string): Promise<Ausencia[]> {
    const { data } = await api.get<Ausencia[]>(`/empleados/${empleadoId}/ausencias`)
    return data
  },
  async create(input: AusenciaInput): Promise<Ausencia> {
    const { data } = await api.post<Ausencia>('/ausencias', input)
    return data
  },
  async update(id: string, input: AusenciaInput): Promise<Ausencia> {
    const { data } = await api.put<Ausencia>(`/ausencias/${id}`, input)
    return data
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/ausencias/${id}`)
  },
}

const realAtrasos = {
  async list(): Promise<Atraso[]> {
    const { data } = await api.get<Atraso[]>('/atrasos')
    return data
  },
  async listByPeriodo(desde: string, hasta: string): Promise<Atraso[]> {
    const { data } = await api.get<Atraso[]>('/atrasos', { params: { desde, hasta } })
    return data
  },
  async listByEmpleado(empleadoId: string): Promise<Atraso[]> {
    const { data } = await api.get<Atraso[]>(`/empleados/${empleadoId}/atrasos`)
    return data
  },
  async create(input: AtrasoInput): Promise<Atraso> {
    const { data } = await api.post<Atraso>('/atrasos', input)
    return data
  },
  async update(id: string, input: AtrasoInput): Promise<Atraso> {
    const { data } = await api.put<Atraso>(`/atrasos/${id}`, input)
    return data
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/atrasos/${id}`)
  },
}

export const ausenciasApi = USE_MOCK ? mockAusencias : realAusencias
export const atrasosApi = USE_MOCK ? mockAtrasos : realAtrasos
