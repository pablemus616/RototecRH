import type { LineaInputManual, TipoBonificacion } from '@/types'

// Cada tipo de bonificación mapea 1:1 a un campo editable de LineaPlanilla.
// Al generar planilla, el monto se suma al campo destino.
export interface TipoBonificacionDef {
  value: TipoBonificacion
  label: string
  campoDestino: keyof LineaInputManual
}

export const TIPOS_BONIFICACION: TipoBonificacionDef[] = [
  {
    value: 'PRODUCCION_ACABADOS',
    label: 'Bono Productividad Acabados',
    campoDestino: 'bonoProductividadAcabados',
  },
  {
    value: 'EXTRAORDINARIO_37_2001',
    label: 'Bono Decreto 37-2001 (extraordinario)',
    campoDestino: 'bonoExtraordinario',
  },
  {
    value: 'BOLSON_MAQUINAS',
    label: 'Bolsón de Bonificaciones Máquinas',
    campoDestino: 'bolsonBonificacionesMaquinas',
  },
  {
    value: 'RENDIMIENTO_ACABADOS',
    label: 'Bono por Rendimiento Acabados',
    campoDestino: 'bonoRendimientoAcabados',
  },
  {
    value: 'OTROS_INGRESOS',
    label: 'Otros ingresos',
    campoDestino: 'otrosIngresos',
  },
  {
    value: 'OTRO',
    label: 'Otro (va a otros ingresos)',
    campoDestino: 'otrosIngresos',
  },
]

export const BONIFICACION_POR_TIPO = new Map(
  TIPOS_BONIFICACION.map((t) => [t.value, t]),
)
