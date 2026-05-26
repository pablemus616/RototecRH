import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { atrasosApi, ausenciasApi } from '@/api/ausencias'
import type { AtrasoInput, AusenciaInput } from '@/types'

const QK = {
  ausenciasPeriodo: (desde: string, hasta: string) =>
    ['ausencias', 'periodo', desde, hasta] as const,
  ausenciasEmpleado: (id: string) => ['ausencias', 'empleado', id] as const,
  atrasosPeriodo: (desde: string, hasta: string) =>
    ['atrasos', 'periodo', desde, hasta] as const,
  atrasosEmpleado: (id: string) => ['atrasos', 'empleado', id] as const,
}

// ---------- Ausencias ----------

export function useAusenciasPeriodo(desde: string, hasta: string) {
  return useQuery({
    queryKey: QK.ausenciasPeriodo(desde, hasta),
    queryFn: () => ausenciasApi.listByPeriodo(desde, hasta),
  })
}

export function useAusenciasByEmpleado(empleadoId: string | undefined) {
  return useQuery({
    queryKey: QK.ausenciasEmpleado(empleadoId ?? ''),
    queryFn: () => ausenciasApi.listByEmpleado(empleadoId as string),
    enabled: Boolean(empleadoId),
  })
}

export function useCreateAusencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AusenciaInput) => ausenciasApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ausencias'] })
    },
  })
}

export function useUpdateAusencia(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AusenciaInput) => ausenciasApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ausencias'] })
    },
  })
}

export function useDeleteAusencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ausenciasApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ausencias'] })
    },
  })
}

// ---------- Atrasos ----------

export function useAtrasosPeriodo(desde: string, hasta: string) {
  return useQuery({
    queryKey: QK.atrasosPeriodo(desde, hasta),
    queryFn: () => atrasosApi.listByPeriodo(desde, hasta),
  })
}

export function useAtrasosByEmpleado(empleadoId: string | undefined) {
  return useQuery({
    queryKey: QK.atrasosEmpleado(empleadoId ?? ''),
    queryFn: () => atrasosApi.listByEmpleado(empleadoId as string),
    enabled: Boolean(empleadoId),
  })
}

export function useCreateAtraso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AtrasoInput) => atrasosApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atrasos'] })
    },
  })
}

export function useDeleteAtraso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => atrasosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atrasos'] })
    },
  })
}
