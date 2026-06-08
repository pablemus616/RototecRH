import type {
  LineaInputManual,
  Planilla,
} from '@/types'
import {
  actualizarInputsLinea,
  calcularTotales,
  generarPlanilla,
  type ParamsGenerarPlanilla,
} from '@/lib/planilla'
import { rrhhApi as api, USE_MOCK } from './client'

const STORAGE_KEY = 'rototec.planillas.v1'

function readStore(): Planilla[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Planilla[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(data: Planilla[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function delay(ms = 150) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------- Mock ----------

const mockApi = {
  async list(): Promise<Planilla[]> {
    await delay()
    return readStore().sort((a, b) => b.periodo.localeCompare(a.periodo))
  },
  async getByPeriodo(periodo: string): Promise<Planilla | null> {
    await delay()
    return readStore().find((p) => p.periodo === periodo) ?? null
  },
  // Crea o regenera (si BORRADOR). Si CERRADA → error.
  async generar(params: ParamsGenerarPlanilla): Promise<Planilla> {
    await delay()
    const all = readStore()
    const existente = all.find((p) => p.periodo === params.periodo)
    if (existente?.estado === 'CERRADA') {
      throw new Error('La planilla de este período ya está cerrada y no se puede regenerar')
    }
    const nueva = generarPlanilla(params)
    const otros = all.filter((p) => p.periodo !== params.periodo)
    writeStore([nueva, ...otros])
    return nueva
  },
  async updateLinea(
    periodo: string,
    empleadoId: string,
    parche: Partial<LineaInputManual>,
  ): Promise<Planilla> {
    await delay()
    const all = readStore()
    const idx = all.findIndex((p) => p.periodo === periodo)
    if (idx === -1) throw new Error('Planilla no encontrada')
    const planilla = all[idx]
    if (planilla.estado === 'CERRADA') {
      throw new Error('No se puede editar una planilla cerrada')
    }
    const lineas = planilla.lineas.map((l) =>
      l.empleadoId === empleadoId ? actualizarInputsLinea(l, parche) : l,
    )
    const updated: Planilla = {
      ...planilla,
      lineas,
      totales: calcularTotales(lineas),
    }
    all[idx] = updated
    writeStore(all)
    return updated
  },
  async cerrar(periodo: string): Promise<Planilla> {
    await delay()
    const all = readStore()
    const idx = all.findIndex((p) => p.periodo === periodo)
    if (idx === -1) throw new Error('Planilla no encontrada')
    if (all[idx].estado === 'CERRADA') {
      throw new Error('La planilla ya estaba cerrada')
    }
    const updated: Planilla = {
      ...all[idx],
      estado: 'CERRADA',
      fechaCierre: new Date().toISOString(),
    }
    all[idx] = updated
    writeStore(all)
    return updated
  },
}

// ---------- Real API ----------

const realApi = {
  async list(): Promise<Planilla[]> {
    const { data } = await api.get<Planilla[]>('/planillas')
    return data
  },
  async getByPeriodo(periodo: string): Promise<Planilla | null> {
    try {
      const { data } = await api.get<Planilla>(`/planillas/${periodo}`)
      return data
    } catch {
      return null
    }
  },
  async generar(params: ParamsGenerarPlanilla): Promise<Planilla> {
    const { data } = await api.post<Planilla>(`/planillas/${params.periodo}/generar`, {
      desde: params.desde,
      hasta: params.hasta,
    })
    return data
  },
  async updateLinea(
    periodo: string,
    empleadoId: string,
    parche: Partial<LineaInputManual>,
  ): Promise<Planilla> {
    const { data } = await api.patch<Planilla>(
      `/planillas/${periodo}/lineas/${empleadoId}`,
      parche,
    )
    return data
  },
  async cerrar(periodo: string): Promise<Planilla> {
    const { data } = await api.post<Planilla>(`/planillas/${periodo}/cerrar`)
    return data
  },
}

export const planillaApi = USE_MOCK ? mockApi : realApi
