import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { login as apiLogin, getMe, logout as apiLogout } from '@/api/endpoints'
import type { AuthUser, LoginInput } from '@/api/auth'
import {
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '@/lib/auth-storage'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // El token vive en localStorage (lectura síncrona), así que el estado inicial
  // es inmediato — no hay fase "loading" que bloquee el render.
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser<AuthUser>())
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(getToken()))

  // Si arrancamos con token, refrescamos el perfil desde el backend (best-effort).
  // Si el token ya no sirve, el interceptor 401 (client.ts) limpia y redirige.
  useEffect(() => {
    if (!getToken()) return
    let cancelado = false
    getMe()
      .then((u) => {
        if (cancelado) return
        setUser(u)
        setStoredUser(u)
      })
      .catch(() => {
        /* errores de red: no cerramos sesión; el 401 sí lo maneja el interceptor */
      })
    return () => {
      cancelado = true
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const { token } = await apiLogin(input)
    setToken(token)
    let perfil: AuthUser | null = null
    try {
      perfil = await getMe()
    } catch {
      perfil = null
    }
    if (perfil) setStoredUser(perfil)
    setUser(perfil)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      /* best-effort: aunque falle, limpiamos local */
    }
    clearAuth()
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated, login, logout }),
    [user, isAuthenticated, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
