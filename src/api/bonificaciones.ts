import type {
  Bonificacion,
  BonificacionBatchInput,
  BonificacionInput,
} from '@/types'
import { api, USE_MOCK } from './client'

const STORAGE_KEY = 'rototec.bonificaciones.v1'

function readStore(): Bonificacion[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Bonificacion[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(data: Bonificacion[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function genId(): string {
  const all = readStore()
  const max = all
    .map((b) => Number(b.id.replace('bon-', '')))
    .filter((n) => !Number.isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `bon-${String(max + 1).padStart(5, '0')}`
}

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------- Mock ----------

const mockApi = {
  async list(): Promise<Bonificacion[]> {
    await delay()
    return readStore()
  },
  async listByPeriodo(periodo: string): Promise<Bonificacion[]> {
    await delay()
    return readStore()
      .filter((b) => b.periodo === periodo)
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
  },
  async listByEmpleado(empleadoId: string): Promise<Bonificacion[]> {
    await delay()
    return readStore()
      .filter((b) => b.empleadoId === empleadoId)
      .sort((a, b) => b.periodo.localeCompare(a.periodo))
  },
  async create(input: BonificacionInput): Promise<Bonificacion> {
    await delay()
    const all = readStore()
    const nueva: Bonificacion = {
      ...input,
      id: genId(),
      fechaCreacion: new Date().toISOString(),
    }
    writeStore([nueva, ...all])
    return nueva
  },
  async createBatch(input: BonificacionBatchInput): Promise<Bonificacion[]> {
    await delay()
    if (input.empleadoIds.length === 0) return []
    const all = readStore()
    let counter = Number(
      (all[0]?.id?.replace('bon-', '') ?? '0'),
    )
    if (Number.isNaN(counter)) counter = 0
    const ahora = new Date().toISOString()
    const nuevas: Bonificacion[] = input.empleadoIds.map((empId, i) => ({
      id: `bon-${String(counter + i + 1).padStart(5, '0')}`,
      empleadoId: empId,
      periodo: input.periodo,
      tipo: input.tipo,
      monto: input.monto,
      descripcion: input.descripcion,
      fechaCreacion: ahora,
    }))
    writeStore([...nuevas, ...all])
    return nuevas
  },
  async update(id: string, input: BonificacionInput): Promise<Bonificacion> {
    await delay()
    const all = readStore()
    const idx = all.findIndex((b) => b.id === id)
    if (idx === -1) throw new Error('Bonificación no encontrada')
    const updated: Bonificacion = { ...all[idx], ...input }
    all[idx] = updated
    writeStore(all)
    return updated
  },
  async remove(id: string): Promise<void> {
    await delay()
    const all = readStore().filter((b) => b.id !== id)
    writeStore(all)
  },
}

// ---------- Real API ----------

const realApi = {
  async list(): Promise<Bonificacion[]> {
    const { data } = await api.get<Bonificacion[]>('/bonificaciones')
    return data
  },
  async listByPeriodo(periodo: string): Promise<Bonificacion[]> {
    const { data } = await api.get<Bonificacion[]>('/bonificaciones', {
      params: { periodo },
    })
    return data
  },
  async listByEmpleado(empleadoId: string): Promise<Bonificacion[]> {
    const { data } = await api.get<Bonificacion[]>(
      `/empleados/${empleadoId}/bonificaciones`,
    )
    return data
  },
  async create(input: BonificacionInput): Promise<Bonificacion> {
    const { data } = await api.post<Bonificacion>('/bonificaciones', input)
    return data
  },
  async createBatch(input: BonificacionBatchInput): Promise<Bonificacion[]> {
    const { data } = await api.post<Bonificacion[]>(
      '/bonificaciones/batch',
      input,
    )
    return data
  },
  async update(id: string, input: BonificacionInput): Promise<Bonificacion> {
    const { data } = await api.put<Bonificacion>(`/bonificaciones/${id}`, input)
    return data
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/bonificaciones/${id}`)
  },
}

export const bonificacionesApi = USE_MOCK ? mockApi : realApi
