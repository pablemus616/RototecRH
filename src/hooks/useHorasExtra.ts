import { useQuery } from '@tanstack/react-query'
import { horasExtraApi } from '@/api/horas-extra'

export function useHorasExtra(fechaInicial: string, fechaFinal: string) {
  return useQuery({
    queryKey: ['horas-extra', fechaInicial, fechaFinal],
    queryFn: () => horasExtraApi.calcular(fechaInicial, fechaFinal),
    enabled: Boolean(fechaInicial) && Boolean(fechaFinal),
  })
}

export function useHorasExtraExcluidos(fechaInicial: string, fechaFinal: string) {
  return useQuery({
    queryKey: ['horas-extra-excluidos', fechaInicial, fechaFinal],
    queryFn: () => horasExtraApi.excluidos(fechaInicial, fechaFinal),
    enabled: Boolean(fechaInicial) && Boolean(fechaFinal),
  })
}

export function useHorasExtraDetalle(
  fechaInicial: string,
  fechaFinal: string,
  idEmpleado: number | null,
) {
  return useQuery({
    queryKey: ['horas-extra-detalle', fechaInicial, fechaFinal, idEmpleado],
    queryFn: () => horasExtraApi.detalle(fechaInicial, fechaFinal, idEmpleado as number),
    enabled: Boolean(fechaInicial) && Boolean(fechaFinal) && idEmpleado != null,
  })
}

export function useHorasExtraDesglose(
  fechaInicial: string,
  fechaFinal: string,
  idEmpleado: number | null,
) {
  return useQuery({
    queryKey: ['horas-extra-desglose', fechaInicial, fechaFinal, idEmpleado],
    queryFn: () => horasExtraApi.desglose(fechaInicial, fechaFinal, idEmpleado as number),
    enabled: Boolean(fechaInicial) && Boolean(fechaFinal) && idEmpleado != null,
  })
}
