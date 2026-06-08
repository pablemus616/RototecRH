import { rrhhApi, USE_MOCK } from './client'

// ── Árbol que devuelve GET /rrhh/organizacion/arbol/:empresaId ──
export interface PuestoNodo {
  id: number
  nombre: string
  codigoBiotime: number | null
}
export interface SubDepartamentoNodo {
  id: number
  nombre: string
  puestos: PuestoNodo[]
}
export interface DepartamentoNodo {
  id: number
  nombre: string
  codigo: string | null
  subdepartamentos: SubDepartamentoNodo[]
}

// ── Payloads ──
export interface DepartamentoInput {
  departamento: string
  codigo?: string
  empresaId: number
}
export interface DepartamentoUpdate {
  departamento?: string
  codigo?: string
}
export interface SubDepartamentoInput {
  nombre: string
  idDepartamento: number
}
export interface SubDepartamentoUpdate {
  nombre?: string
}
export interface PuestoInput {
  nombre: string
  idSubdepartamento: number
  codigoBiotime?: number
}
export interface PuestoUpdate {
  nombre?: string
  codigoBiotime?: number
}

type Ok = { id: number }

const realApi = {
  async arbol(empresaId: number): Promise<DepartamentoNodo[]> {
    const { data } = await rrhhApi.get<DepartamentoNodo[]>(`/organizacion/arbol/${empresaId}`)
    return data
  },
  async crearDepartamento(input: DepartamentoInput): Promise<Ok> {
    const { data } = await rrhhApi.post<Ok>('/organizacion/departamentos', input)
    return data
  },
  async actualizarDepartamento(id: number, input: DepartamentoUpdate): Promise<Ok> {
    const { data } = await rrhhApi.put<Ok>(`/organizacion/departamentos/${id}`, input)
    return data
  },
  async eliminarDepartamento(id: number): Promise<Ok> {
    const { data } = await rrhhApi.delete<Ok>(`/organizacion/departamentos/${id}`)
    return data
  },
  async crearSubDepartamento(input: SubDepartamentoInput): Promise<Ok> {
    const { data } = await rrhhApi.post<Ok>('/organizacion/sub-departamentos', input)
    return data
  },
  async actualizarSubDepartamento(id: number, input: SubDepartamentoUpdate): Promise<Ok> {
    const { data } = await rrhhApi.put<Ok>(`/organizacion/sub-departamentos/${id}`, input)
    return data
  },
  async eliminarSubDepartamento(id: number): Promise<Ok> {
    const { data } = await rrhhApi.delete<Ok>(`/organizacion/sub-departamentos/${id}`)
    return data
  },
  async crearPuesto(input: PuestoInput): Promise<Ok> {
    const { data } = await rrhhApi.post<Ok>('/organizacion/puestos', input)
    return data
  },
  async actualizarPuesto(id: number, input: PuestoUpdate): Promise<Ok> {
    const { data } = await rrhhApi.put<Ok>(`/organizacion/puestos/${id}`, input)
    return data
  },
  async eliminarPuesto(id: number): Promise<Ok> {
    const { data } = await rrhhApi.delete<Ok>(`/organizacion/puestos/${id}`)
    return data
  },
}

const mockApi: typeof realApi = {
  async arbol() {
    return []
  },
  async crearDepartamento() {
    return { id: 0 }
  },
  async actualizarDepartamento(id) {
    return { id }
  },
  async eliminarDepartamento(id) {
    return { id }
  },
  async crearSubDepartamento() {
    return { id: 0 }
  },
  async actualizarSubDepartamento(id) {
    return { id }
  },
  async eliminarSubDepartamento(id) {
    return { id }
  },
  async crearPuesto() {
    return { id: 0 }
  },
  async actualizarPuesto(id) {
    return { id }
  },
  async eliminarPuesto(id) {
    return { id }
  },
}

export const estructuraApi = USE_MOCK ? mockApi : realApi
