import { rrhhApi, USE_MOCK } from './client'
import { DEPARTAMENTOS_ROTOTEC } from '@/constants/guatemala'

// Forma del árbol que devuelve GET /rrhh/obtener-empresas-departamentos-puestos.
// OJO la inconsistencia de casing: empresa usa Id/Nombre; el resto id/nombre.
export interface PuestoArbol {
  id: number
  nombre: string
}
export interface SubdepartamentoArbol {
  id: number
  nombre: string
  puestos: PuestoArbol[]
}
export interface DepartamentoArbol {
  id: number
  nombre: string
  subdepartamentos: SubdepartamentoArbol[]
}
export interface EmpresaArbol {
  Id: number
  Nombre: string
  departamentos: DepartamentoArbol[]
}
export type ArbolOrganizacional = EmpresaArbol[]

// ---------- Mock (árbol de demo para dev offline) ----------

const mockApi = {
  async obtenerArbol(): Promise<ArbolOrganizacional> {
    return [
      {
        Id: 1,
        Nombre: 'ROTOTEC',
        departamentos: DEPARTAMENTOS_ROTOTEC.map((d, i) => ({
          id: i + 1,
          nombre: d.label,
          subdepartamentos: [
            {
              id: (i + 1) * 100 + 1,
              nombre: 'General',
              puestos: [
                { id: (i + 1) * 1000 + 1, nombre: 'Operario' },
                { id: (i + 1) * 1000 + 2, nombre: 'Supervisor' },
              ],
            },
          ],
        })),
      },
    ]
  },
}

// ---------- Real ----------

const realApi = {
  async obtenerArbol(): Promise<ArbolOrganizacional> {
    const { data } = await rrhhApi.get<ArbolOrganizacional>(
      '/obtener-empresas-departamentos-puestos',
    )
    return data
  },
}

export const organizacionApi = USE_MOCK ? mockApi : realApi
