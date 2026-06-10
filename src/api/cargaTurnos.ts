import { rrhhApi } from './client'
import type { EmpleadoElegible, PreviewTurnos } from '@/types'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// El backend (Fastify, sin multipart) intercambia el Excel como base64 dentro del JSON.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '') // quita el prefijo "data:...;base64,"
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export const cargaTurnosApi = {
  // GET /rrhh/programacion-turnos/empleados-elegibles
  async elegibles(): Promise<EmpleadoElegible[]> {
    const { data } = await rrhhApi.get<EmpleadoElegible[]>('/programacion-turnos/empleados-elegibles')
    return data
  },

  // GET /rrhh/programacion-turnos/plantilla?fechaInicial&fechaFinal&area → { archivoBase64, nombre }
  async descargarPlantilla(fechaInicial: string, fechaFinal: string, area: number): Promise<Blob> {
    const { data } = await rrhhApi.get<{ archivoBase64: string; nombre: string }>('/programacion-turnos/plantilla', {
      params: { fechaInicial, fechaFinal, area },
    })
    return base64ToBlob(data.archivoBase64, XLSX_MIME)
  },

  // POST /rrhh/programacion-turnos/preview — JSON { fechaInicial, fechaFinal, area, archivoBase64 }
  async preview(archivo: File, fechaInicial: string, fechaFinal: string, area: number): Promise<PreviewTurnos> {
    const archivoBase64 = await fileToBase64(archivo)
    const { data } = await rrhhApi.post<PreviewTurnos>('/programacion-turnos/preview', {
      fechaInicial,
      fechaFinal,
      area: String(area),
      archivoBase64,
    })
    return data
  },

  // POST /rrhh/programacion-turnos/aplicar — JSON con archivoBase64
  async aplicar(
    archivo: File,
    fechaInicial: string,
    fechaFinal: string,
    area: number,
  ): Promise<{ acabados: number; maquinas: number; avisos: number }> {
    const archivoBase64 = await fileToBase64(archivo)
    const { data } = await rrhhApi.post('/programacion-turnos/aplicar', {
      fechaInicial,
      fechaFinal,
      area: String(area),
      archivoBase64,
    })
    return data
  },
}
