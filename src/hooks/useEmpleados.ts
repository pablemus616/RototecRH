import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { empleadosApi } from '@/api/employees'
import type { BajaInput, EmpleadoInput } from '@/types'

const QK = {
  all: ['empleados'] as const,
  one: (id: string) => ['empleados', id] as const,
}

export function useEmpleadosList() {
  return useQuery({
    queryKey: QK.all,
    queryFn: () => empleadosApi.list(),
  })
}

export function useEmpleado(id: string | undefined) {
  return useQuery({
    queryKey: QK.one(id ?? ''),
    queryFn: () => empleadosApi.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EmpleadoInput) => empleadosApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useUpdateEmpleado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EmpleadoInput) => empleadosApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData(QK.one(id), updated)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useDarDeBaja(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (baja: BajaInput) => empleadosApi.darDeBaja(id, baja),
    onSuccess: (updated) => {
      qc.setQueryData(QK.one(id), updated)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useReactivar(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => empleadosApi.reactivar(id),
    onSuccess: (updated) => {
      qc.setQueryData(QK.one(id), updated)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}
