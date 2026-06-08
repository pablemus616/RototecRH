import { api, USE_MOCK } from './client'

export interface AuthUser {
  idEmpleado: number
  username: string
  nombre: string
  apellido: string
  rol: number
  departamento?: string
  puesto?: string
  permissions?: unknown
}

export interface SesionInfo {
  id: string
  createdAt: string
  expiresAt: string | null
}

export interface LoginInput {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  session: SesionInfo | null
}

/** El MS auth envuelve todas las respuestas en { ok, message, data }. */
interface ApiEnvelope<T> {
  ok: boolean
  message: string
  data: T
}

function delay(ms = 200) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------- Mock ----------

const mockApi = {
  async login(input: LoginInput): Promise<LoginResult> {
    await delay()
    if (!input.username.trim() || !input.password.trim()) {
      throw new Error('Usuario y contraseña son requeridos')
    }
    return {
      token: `mock.${btoa(input.username)}.token`,
      session: {
        id: 'mock-session',
        createdAt: new Date().toISOString(),
        expiresAt: null,
      },
    }
  },
  async me(): Promise<AuthUser> {
    await delay()
    return {
      idEmpleado: 1,
      username: 'demo',
      nombre: 'Usuario',
      apellido: 'Demo',
      rol: 1,
      departamento: 'PRODUCCION',
      puesto: 'Administrador',
    }
  },
  async logout(): Promise<void> {
    await delay()
  },
}

// ---------- Real API ----------

const realApi = {
  async login(input: LoginInput): Promise<LoginResult> {
    // ?session=true → el backend crea la sesión revocable y devuelve { token, session }.
    const { data } = await api.post<ApiEnvelope<{ token: string; session: SesionInfo | null }>>(
      '/auth/user/login',
      { loginType: 'USERNAME', username: input.username, password: input.password },
      { params: { session: true } },
    )
    return { token: data.data.token, session: data.data.session ?? null }
  },
  async me(): Promise<AuthUser> {
    const { data } = await api.get<ApiEnvelope<{ user: AuthUser }>>('/auth/me')
    return data.data.user
  },
  async logout(): Promise<void> {
    await api.post('/auth/session/logout')
  },
}

export const authApi = USE_MOCK ? mockApi : realApi
