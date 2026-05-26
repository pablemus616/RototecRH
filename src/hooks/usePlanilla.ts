import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { planillaApi } from '@/api/planilla'
import type { LineaInputManual } from '@/types'
import type { ParamsGenerarPlanilla } from '@/lib/planilla'

const QK = {
  planilla: (periodo: string) => ['planilla', periodo] as const,
  all: ['planillas'] as const,
}

export function usePlanillaByPeriodo(periodo: string) {
  return useQuery({
    queryKey: QK.planilla(periodo),
    queryFn: () => planillaApi.getByPeriodo(periodo),
  })
}

export function useGenerarPlanilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: ParamsGenerarPlanilla) => planillaApi.generar(params),
    onSuccess: (planilla) => {
      qc.setQueryData(QK.planilla(planilla.periodo), planilla)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}

export function useUpdateLineaPlanilla(periodo: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      empleadoId,
      parche,
    }: {
      empleadoId: string
      parche: Partial<LineaInputManual>
    }) => planillaApi.updateLinea(periodo, empleadoId, parche),
    onSuccess: (planilla) => {
      qc.setQueryData(QK.planilla(planilla.periodo), planilla)
    },
  })
}

export function useCerrarPlanilla(periodo: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => planillaApi.cerrar(periodo),
    onSuccess: (planilla) => {
      qc.setQueryData(QK.planilla(planilla.periodo), planilla)
      qc.invalidateQueries({ queryKey: QK.all })
    },
  })
}
