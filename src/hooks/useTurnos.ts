import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { asignacionesTurnoApi, turnosApi } from '@/api/turnos'
import type { AsignacionTurnoInput, TurnoInput } from '@/types'

const QK = {
  turnos: ['turnos'] as const,
  turno: (id: string) => ['turnos', id] as const,
  asignacionesAll: ['asignaciones-turno'] as const,
  asignacionesByEmpleado: (empleadoId: string) =>
    ['asignaciones-turno', 'empleado', empleadoId] as const,
}

export function useTurnosList() {
  return useQuery({
    queryKey: QK.turnos,
    queryFn: () => turnosApi.list(),
  })
}

export function useTurno(id: string | undefined) {
  return useQuery({
    queryKey: QK.turno(id ?? ''),
    queryFn: () => turnosApi.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateTurno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TurnoInput) => turnosApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.turnos })
    },
  })
}

export function useUpdateTurno(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TurnoInput) => turnosApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData(QK.turno(id), updated)
      qc.invalidateQueries({ queryKey: QK.turnos })
    },
  })
}

export function useDesactivarTurno(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => turnosApi.desactivar(id),
    onSuccess: (updated) => {
      qc.setQueryData(QK.turno(id), updated)
      qc.invalidateQueries({ queryKey: QK.turnos })
    },
  })
}

export function useReactivarTurno(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => turnosApi.reactivar(id),
    onSuccess: (updated) => {
      qc.setQueryData(QK.turno(id), updated)
      qc.invalidateQueries({ queryKey: QK.turnos })
    },
  })
}

// =====================================================
// Asignaciones de turno
// =====================================================
export function useAsignacionesTurnoAll() {
  return useQuery({
    queryKey: QK.asignacionesAll,
    queryFn: () => asignacionesTurnoApi.list(),
  })
}

export function useAsignacionesByEmpleado(empleadoId: string | undefined) {
  return useQuery({
    queryKey: QK.asignacionesByEmpleado(empleadoId ?? ''),
    queryFn: () => asignacionesTurnoApi.listByEmpleado(empleadoId as string),
    enabled: Boolean(empleadoId),
  })
}

export function useCreateAsignacion(empleadoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AsignacionTurnoInput) => asignacionesTurnoApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.asignacionesByEmpleado(empleadoId) })
      qc.invalidateQueries({ queryKey: QK.asignacionesAll })
    },
  })
}
