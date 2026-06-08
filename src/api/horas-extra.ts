import type { DesgloseSemanaHE, DetalleDiaHE, HorasExtraEmpleado } from '@/types'
import { rrhhApi } from './client'

export const horasExtraApi = {
  // GET /rrhh/horas-extra/calcular?fechaInicial=YYYY-MM-DD&fechaFinal=YYYY-MM-DD
  async calcular(fechaInicial: string, fechaFinal: string): Promise<HorasExtraEmpleado[]> {
    const { data } = await rrhhApi.get<HorasExtraEmpleado[]>('/horas-extra/calcular', {
      params: { fechaInicial, fechaFinal },
    })
    return data
  },

  // GET /rrhh/horas-extra/detalle?fechaInicial&fechaFinal&idEmpleado
  async detalle(fechaInicial: string, fechaFinal: string, idEmpleado: number): Promise<DetalleDiaHE[]> {
    const { data } = await rrhhApi.get<DetalleDiaHE[]>('/horas-extra/detalle', {
      params: { fechaInicial, fechaFinal, idEmpleado },
    })
    return data
  },

  // GET /rrhh/horas-extra/desglose?fechaInicial&fechaFinal&idEmpleado
  async desglose(fechaInicial: string, fechaFinal: string, idEmpleado: number): Promise<DesgloseSemanaHE[]> {
    const { data } = await rrhhApi.get<DesgloseSemanaHE[]>('/horas-extra/desglose', {
      params: { fechaInicial, fechaFinal, idEmpleado },
    })
    return data
  },
}
