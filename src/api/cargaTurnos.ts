import { rrhhApi } from './client'
import type { EmpleadoElegible, PreviewTurnos } from '@/types'

export const cargaTurnosApi = {
  // GET /rrhh/programacion-turnos/empleados-elegibles
  async elegibles(): Promise<EmpleadoElegible[]> {
    const { data } = await rrhhApi.get<EmpleadoElegible[]>('/programacion-turnos/empleados-elegibles')
    return data
  },

  // GET /rrhh/programacion-turnos/plantilla?fechaInicial&fechaFinal&area → .xlsx (blob)
  async descargarPlantilla(fechaInicial: string, fechaFinal: string, area: number): Promise<Blob> {
    const { data } = await rrhhApi.get('/programacion-turnos/plantilla', {
      params: { fechaInicial, fechaFinal, area },
      responseType: 'blob',
    })
    return data as Blob
  },

  // POST /rrhh/programacion-turnos/preview — multipart (archivo + rango/area)
  async preview(archivo: File, fechaInicial: string, fechaFinal: string, area: number): Promise<PreviewTurnos> {
    const fd = new FormData()
    fd.append('archivo', archivo)
    fd.append('fechaInicial', fechaInicial)
    fd.append('fechaFinal', fechaFinal)
    fd.append('area', String(area))
    const { data } = await rrhhApi.post<PreviewTurnos>('/programacion-turnos/preview', fd)
    return data
  },

  // POST /rrhh/programacion-turnos/aplicar — multipart
  async aplicar(
    archivo: File,
    fechaInicial: string,
    fechaFinal: string,
    area: number,
  ): Promise<{ acabados: number; maquinas: number; avisos: number }> {
    const fd = new FormData()
    fd.append('archivo', archivo)
    fd.append('fechaInicial', fechaInicial)
    fd.append('fechaFinal', fechaFinal)
    fd.append('area', String(area))
    const { data } = await rrhhApi.post('/programacion-turnos/aplicar', fd)
    return data
  },
}
