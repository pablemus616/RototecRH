import { useMemo } from 'react'
import { useArbol } from '@/hooks/useArbol'
import type { NameOption } from '@/components/ui/name-combobox'

/**
 * Aplana el árbol organizacional completo (sin empresaId) a lista de puestos únicos
 * ordenados alfabéticamente.
 */
export function usePuestoOptions(): { options: NameOption[]; isLoading: boolean } {
  const { data, isLoading } = useArbol()

  const options = useMemo<NameOption[]>(() => {
    if (!data) return []
    const seen = new Set<number>()
    const all: NameOption[] = []
    for (const empresa of data) {
      for (const depto of empresa.departamentos) {
        for (const sub of depto.subdepartamentos) {
          for (const puesto of sub.puestos) {
            if (!seen.has(puesto.id)) {
              seen.add(puesto.id)
              all.push({ id: puesto.id, nombre: puesto.nombre })
            }
          }
        }
      }
    }
    return all.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [data])

  return { options, isLoading }
}

/**
 * Aplana el árbol organizacional completo a lista de departamentos únicos
 * ordenados alfabéticamente.
 */
export function useDepartamentoOptions(): { options: NameOption[]; isLoading: boolean } {
  const { data, isLoading } = useArbol()

  const options = useMemo<NameOption[]>(() => {
    if (!data) return []
    const seen = new Set<number>()
    const all: NameOption[] = []
    for (const empresa of data) {
      for (const depto of empresa.departamentos) {
        if (!seen.has(depto.id)) {
          seen.add(depto.id)
          all.push({ id: depto.id, nombre: depto.nombre })
        }
      }
    }
    return all.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [data])

  return { options, isLoading }
}
