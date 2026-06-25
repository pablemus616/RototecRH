import axios, { type AxiosError, type AxiosInstance, isAxiosError } from 'axios'
import { toast } from '@/components/ui/sonner'
import { clearAuth, getToken } from '@/lib/auth-storage'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

export function extractApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown; error?: unknown } | undefined
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string' && data.message.trim()) return data.message
      if (typeof data.error === 'string' && data.error.trim()) return data.error
    }
    const status = err.response?.status
    if (status !== undefined) return `Error ${status}: ${err.message}`
    return err.message || 'Sin respuesta del servidor'
  }
  if (err instanceof Error) return err.message
  return 'Error desconocido'
}

function attachInterceptors(
  instance: AxiosInstance,
  opts: { unwrapEnvelope?: boolean; skipAuth?: boolean } = {},
) {
  // Inyecta el token de sesión en cada request (esquema Bearer, igual que el resto de MS).
  if (!opts.skipAuth) {
    instance.interceptors.request.use((config) => {
      const token = getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }

  instance.interceptors.response.use(
    (res) => {
      // El MS de RRHH envuelve toda respuesta en { ok, message, data }. Desenvolvemos
      // para que los consumidores reciban el payload crudo (array/objeto) como esperan.
      if (opts.unwrapEnvelope) {
        const d: unknown = res.data
        if (d !== null && typeof d === 'object' && 'ok' in d && 'data' in d) {
          res.data = (d as { data: unknown }).data
        }
      }
      return res
    },
    (err: AxiosError) => {
      const status = err.response?.status
      const isNetwork = !err.response
      const is5xx = status !== undefined && status >= 500
      // Toast genérico solo para errores que las mutaciones no esperan manejar:
      // red caída o 5xx. Los 4xx llegan al onError del componente con su mensaje específico.
      if (isNetwork || is5xx) {
        toast.error(extractApiErrorMessage(err))
      }
      // Sesión inválida/expirada/revocada: limpia el token y manda a /login.
      // Solo si había token (un 401 del propio login lleva token nulo) y no estamos ya en /login.
      if (
        status === 401 &&
        getToken() &&
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        clearAuth()
        window.location.assign('/login')
      }
      if (import.meta.env.DEV) {
        console.error('API Error:', status ?? 'NETWORK', err.response?.data ?? err.message)
      }
      return Promise.reject(err)
    },
  )
}

// Instancia base del gateway. Úsala para servicios que cuelgan directo de /api/v2
// (p.ej. auth → /auth/...). El gateway rutea por prefijo de servicio.
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})
attachInterceptors(api)

// Instancia para el MS de Recursos Humanos. El gateway rutea /api/v2/rrhh → MS rrhh
// (que tiene prefijo global /rrhh). Los módulos de RRHH usan esta instancia y mantienen
// sus paths relativos (/empleados, /turnos, …) → /api/v2/rrhh/empleados, etc.
export const rrhhApi = axios.create({
  baseURL: `${BASE_URL}/rrhh`,
  headers: { 'Content-Type': 'application/json' },
})
attachInterceptors(rrhhApi, { unwrapEnvelope: true })

// Instancia PÚBLICA para el examen por token (sin Bearer). El empleado que abre
// /examen/:token NO está autenticado; el backend marca GET/POST /examen/:token
// como públicos. Reusa baseURL y el unwrap de { ok, message, data } pero NO
// inyecta Authorization. Si el gateway exigiera auth a nivel de ruteo, este es el
// único punto a ajustar (p.ej. un prefijo público dedicado).
export const rrhhPublicApi = axios.create({
  baseURL: `${BASE_URL}/rrhh`,
  headers: { 'Content-Type': 'application/json' },
})
attachInterceptors(rrhhPublicApi, { unwrapEnvelope: true, skipAuth: true })

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
