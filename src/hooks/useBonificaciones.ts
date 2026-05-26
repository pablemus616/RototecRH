import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bonificacionesApi } from '@/api/bonificaciones'
import type { BonificacionBatchInput, BonificacionInput } from '@/types'

const QK = {
  all: ['bonificaciones'] as const,
  periodo: (periodo: string) => ['bonificaciones', 'periodo', periodo] as const,
  empleado: (id: string) => ['bonificaciones', 'empleado', id] as const,
}

export function useBonificacionesPeriodo(periodo: string) {
  return useQuery({
    queryKey: QK.periodo(periodo),
    queryFn: () => bonificacionesApi.listByPeriodo(periodo),
  })
}

export function useBonificacionesByEmpleado(empleadoId: string | undefined) {
  return useQuery({
    queryKey: QK.empleado(empleadoId ?? ''),
    queryFn: () => bonificacionesApi.listByEmpleado(empleadoId as string),
    enabled: Boolean(empleadoId),
  })
}

export function useCreateBonificacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BonificacionInput) => bonificacionesApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useCreateBonificacionesBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BonificacionBatchInput) =>
      bonificacionesApi.createBatch(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useUpdateBonificacion(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BonificacionInput) => bonificacionesApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useDeleteBonificacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => bonificacionesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}
