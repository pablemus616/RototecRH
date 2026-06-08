import { rrhhApi, USE_MOCK } from './client'
import type { CatalogoItem, PaisItem } from '@/types'

// El SP devuelve SELECT *; normalizamos a {id,nombre}/{codigo,nombre}. Ajustar aquí si difieren las columnas.
const mapCat = (r: Record<string, unknown>): CatalogoItem => ({
  id: Number(r.id ?? r.Id ?? r.ID),
  // El nombre viene con distinta columna según el SP: empresas=Nombre, departamentos=departamento,
  // sub-departamentos=nombre, puestos=puesto/nombre.
  nombre: String(r.nombre ?? r.Nombre ?? r.departamento ?? r.puesto ?? r.descripcion ?? r.NOMBRE ?? ''),
})
const mapPais = (r: Record<string, unknown>): PaisItem => ({
  // tPaises: { Id, displayName, keyName } → el empleado guarda el keyName (ej. 'GT');
  // el Id se usa para filtrar empresas por país.
  id: Number(r.Id ?? r.id ?? 0),
  codigo: String(r.keyName ?? r.codigo ?? r.Codigo ?? r.PAIS ?? r.id ?? ''),
  nombre: String(r.displayName ?? r.nombre ?? r.Nombre ?? r.NOMBRE ?? ''),
})

const realApi = {
  async paises(): Promise<PaisItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/company/paises')
    return data.map(mapPais)
  },
  async empresas(paisId?: number): Promise<CatalogoItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>('/company/empresas', {
      params: paisId != null ? { paisId } : undefined,
    })
    return data.map(mapCat)
  },
  async departamentos(empresaId: number): Promise<CatalogoItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>(`/company/departamentos/${empresaId}`)
    return data.map(mapCat)
  },
  async subDepartamentos(departamentoId: number): Promise<CatalogoItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>(`/company/sub-departamentos/${departamentoId}`)
    return data.map(mapCat)
  },
  async puestos(subDepartamentoId: number): Promise<CatalogoItem[]> {
    const { data } = await rrhhApi.get<Record<string, unknown>[]>(`/company/puestos/${subDepartamentoId}`)
    return data.map(mapCat)
  },
}

const mockApi: typeof realApi = {
  async paises() {
    return [
      { id: 1, codigo: 'GT', nombre: 'Guatemala' },
      { id: 2, codigo: 'SV', nombre: 'El Salvador' },
    ]
  },
  async empresas() {
    return [
      { id: 1, nombre: 'Rototec' },
      { id: 2, nombre: 'Rototec Comercial' },
    ]
  },
  async departamentos() {
    return [
      { id: 10, nombre: 'Producción' },
      { id: 11, nombre: 'Ventas' },
    ]
  },
  async subDepartamentos() {
    return [
      { id: 100, nombre: 'Acabados' },
      { id: 101, nombre: 'Rotomoldeo' },
    ]
  },
  async puestos() {
    return [
      { id: 1000, nombre: 'Operario de Máquina' },
      { id: 1001, nombre: 'Supervisor de Turno' },
    ]
  },
}

export const companyApi = USE_MOCK ? mockApi : realApi
