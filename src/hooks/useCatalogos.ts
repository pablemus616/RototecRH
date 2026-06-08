import { useQuery } from '@tanstack/react-query'
import { getCatalogos } from '@/api/endpoints'
import type { Catalogos } from '@/api/catalogos'

/** Catálogos de RH (sexos, pueblos, bancos, …). Cacheados largo: cambian poco. */
export function useCatalogos() {
  return useQuery<Catalogos>({
    queryKey: ['catalogos'],
    queryFn: getCatalogos,
    staleTime: 1000 * 60 * 60, // 1 hora
  })
}
