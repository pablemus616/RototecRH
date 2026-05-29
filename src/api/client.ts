import axios, { type AxiosError, isAxiosError } from 'axios'
import { toast } from '@/components/ui/sonner'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

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

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status
    const isNetwork = !err.response
    const is5xx = status !== undefined && status >= 500
    // Toast genérico solo para errores que las mutaciones no esperan manejar:
    // red caída o 5xx. Los 4xx llegan al onError del componente con su mensaje específico.
    if (isNetwork || is5xx) {
      toast.error(extractApiErrorMessage(err))
    }
    // TODO(auth): cuando exista login, en status === 401 redirigir a /login y limpiar token.
    if (import.meta.env.DEV) {
      console.error('API Error:', status ?? 'NETWORK', err.response?.data ?? err.message)
    }
    return Promise.reject(err)
  },
)

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
