import { useQuery } from '@tanstack/react-query'
import { getArbolOrganizacional } from '@/api/endpoints'
import type { ArbolOrganizacional } from '@/api/organizacion'

/** Árbol organizacional (empresa→depto→subdepto→puesto). Cacheado largo. */
export function useArbol() {
  return useQuery<ArbolOrganizacional>({
    queryKey: ['arbol-organizacional'],
    queryFn: getArbolOrganizacional,
    staleTime: 1000 * 60 * 60,
  })
}
