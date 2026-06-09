import { useQuery } from '@tanstack/react-query'
import { cargaTurnosApi } from '@/api/cargaTurnos'

export function useEmpleadosElegibles() {
  return useQuery({ queryKey: ['turnos-elegibles'], queryFn: () => cargaTurnosApi.elegibles() })
}
