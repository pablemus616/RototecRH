import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { estructuraApi } from '@/api/estructura'
import type {
  DepartamentoInput,
  DepartamentoUpdate,
  PuestoInput,
  PuestoUpdate,
  SubDepartamentoInput,
  SubDepartamentoUpdate,
} from '@/api/estructura'

const QK = ['estructura'] as const

export const useArbolEmpresa = (empresaId?: number) =>
  useQuery({
    queryKey: [...QK, empresaId] as const,
    queryFn: () => estructuraApi.arbol(empresaId as number),
    enabled: Boolean(empresaId),
  })

function useInvalidar() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: QK })
}

// ── Departamentos ──
export function useCrearDepartamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (input: DepartamentoInput) => estructuraApi.crearDepartamento(input),
    onSuccess: invalidar,
  })
}
export function useActualizarDepartamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: DepartamentoUpdate }) =>
      estructuraApi.actualizarDepartamento(id, input),
    onSuccess: invalidar,
  })
}
export function useEliminarDepartamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (id: number) => estructuraApi.eliminarDepartamento(id),
    onSuccess: invalidar,
  })
}

// ── Sub-departamentos ──
export function useCrearSubDepartamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (input: SubDepartamentoInput) => estructuraApi.crearSubDepartamento(input),
    onSuccess: invalidar,
  })
}
export function useActualizarSubDepartamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SubDepartamentoUpdate }) =>
      estructuraApi.actualizarSubDepartamento(id, input),
    onSuccess: invalidar,
  })
}
export function useEliminarSubDepartamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (id: number) => estructuraApi.eliminarSubDepartamento(id),
    onSuccess: invalidar,
  })
}

// ── Puestos ──
export function useCrearPuesto() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (input: PuestoInput) => estructuraApi.crearPuesto(input),
    onSuccess: invalidar,
  })
}
export function useActualizarPuesto() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: PuestoUpdate }) =>
      estructuraApi.actualizarPuesto(id, input),
    onSuccess: invalidar,
  })
}
export function useEliminarPuesto() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: (id: number) => estructuraApi.eliminarPuesto(id),
    onSuccess: invalidar,
  })
}
