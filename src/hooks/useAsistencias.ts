import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { asistenciasApi } from '@/api/asistencias'
import type { RegistroAsistenciaInput } from '@/types'

const QK = {
  periodo: (desde: string, hasta: string) =>
    ['asistencias', 'periodo', desde, hasta] as const,
  empleadoPeriodo: (id: string, desde: string, hasta: string) =>
    ['asistencias', 'empleado', id, desde, hasta] as const,
}

export function useAsistenciasPeriodo(desde: string, hasta: string) {
  return useQuery({
    queryKey: QK.periodo(desde, hasta),
    queryFn: () => asistenciasApi.listByPeriodo(desde, hasta),
  })
}

export function useAsistenciasEmpleadoPeriodo(
  empleadoId: string | undefined,
  desde: string,
  hasta: string,
) {
  return useQuery({
    queryKey: QK.empleadoPeriodo(empleadoId ?? '', desde, hasta),
    queryFn: () =>
      asistenciasApi.listByEmpleadoPeriodo(empleadoId as string, desde, hasta),
    enabled: Boolean(empleadoId),
  })
}

export function useUpsertAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RegistroAsistenciaInput) => asistenciasApi.upsert(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asistencias'] })
    },
  })
}

export function useDeleteAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ empleadoId, fecha }: { empleadoId: string; fecha: string }) =>
      asistenciasApi.remove(empleadoId, fecha),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asistencias'] })
    },
  })
}
