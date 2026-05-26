import type { MedidaDisciplinaria, TipoAusencia } from '@/types'

export interface ReglaAusencia {
  tipo: TipoAusencia
  label: string
  medidaDefault: MedidaDisciplinaria
  diasDescontar: number          // 0, 0.5, 1, 2
  descontarSeptimo: boolean
  pagaIGSS: boolean
  descripcion: string
  requiereConstancia: boolean
}

// Catálogo extraído del archivo real del cliente
// (REPORTE_DE_AUSENCIAS_Y_ATRASOS_-_OE.xlsx)
export const REGLAS_AUSENCIA: ReglaAusencia[] = [
  {
    tipo: 'AUSENCIA_INJUSTIFICADA',
    label: 'Ausencia Injustificada',
    medidaDefault: 'DESCUENTO_DIA_Y_SEPTIMO',
    diasDescontar: 1,
    descontarSeptimo: true,
    pagaIGSS: false,
    descripcion: 'Se descuenta el día y el séptimo (una sola vez por semana).',
    requiereConstancia: false,
  },
  {
    tipo: 'AUSENCIA_ENFERMEDAD_SIN_IGSS',
    label: 'Ausencia por Enfermedad (sin constancia IGSS)',
    medidaDefault: 'DESCUENTO_DIA_Y_SEPTIMO',
    diasDescontar: 1,
    descontarSeptimo: true,
    pagaIGSS: false,
    descripcion:
      'Sin constancia del IGSS se trata como injustificada: descuenta día y séptimo.',
    requiereConstancia: false,
  },
  {
    tipo: 'AUSENCIA_POR_IGSS',
    label: 'Ausencia por IGSS / Suspensión IGSS',
    medidaDefault: 'DESCONTAR_DIA_PAGA_IGSS',
    diasDescontar: 1,
    descontarSeptimo: false,
    pagaIGSS: true,
    descripcion: 'Con incapacidad del IGSS válida. El día lo paga el IGSS.',
    requiereConstancia: true,
  },
  {
    tipo: 'AUSENCIA_MEDIO_DIA_IGSS',
    label: 'Ausencia Medio Día por IGSS',
    medidaDefault: 'DESCONTAR_EL_DIA',
    diasDescontar: 0.5,
    descontarSeptimo: false,
    pagaIGSS: false,
    descripcion: 'Atención IGSS por medio día. Se descuenta proporcional.',
    requiereConstancia: true,
  },
  {
    tipo: 'SUSPENSION_AMONESTACION',
    label: 'Suspensión por Amonestación',
    medidaDefault: 'DESCONTAR_EL_DIA',
    diasDescontar: 1,
    descontarSeptimo: false,
    pagaIGSS: false,
    descripcion: 'Suspensión disciplinaria de un día.',
    requiereConstancia: false,
  },
  {
    tipo: 'SUSPENSION_2_DIAS',
    label: 'Suspensión 2 días por Amonestación',
    medidaDefault: 'DESCUENTO_2_DIAS_Y_SEPTIMO',
    diasDescontar: 2,
    descontarSeptimo: true,
    pagaIGSS: false,
    descripcion: 'Suspensión disciplinaria de dos días + séptimo.',
    requiereConstancia: false,
  },
  {
    tipo: 'VACACIONES',
    label: 'Vacaciones',
    medidaDefault: 'SIN_DESCUENTO',
    diasDescontar: 0,
    descontarSeptimo: false,
    pagaIGSS: false,
    descripcion: 'Días de vacaciones aprobados.',
    requiereConstancia: false,
  },
  {
    tipo: 'VACACIONES_TURNO_SUSPENDIDO',
    label: 'Vacaciones por Turno Suspendido',
    medidaDefault: 'SIN_DESCUENTO',
    diasDescontar: 0,
    descontarSeptimo: false,
    pagaIGSS: false,
    descripcion: 'Vacaciones otorgadas por suspensión de turno.',
    requiereConstancia: false,
  },
  {
    tipo: 'MUERTE_FAMILIAR',
    label: 'Muerte de un Familiar',
    medidaDefault: 'DESCUENTO_DIA_Y_SEPTIMO',
    diasDescontar: 1,
    descontarSeptimo: true,
    pagaIGSS: false,
    descripcion:
      'Por política actual: descuenta día y séptimo. Revisar según vínculo familiar.',
    requiereConstancia: true,
  },
  {
    tipo: 'PENDIENTE',
    label: 'Pendiente de resolución',
    medidaDefault: 'PENDIENTE',
    diasDescontar: 0,
    descontarSeptimo: false,
    pagaIGSS: false,
    descripcion:
      'Falta resolver el caso. No se calcula descuento hasta cambiar de tipo.',
    requiereConstancia: false,
  },
]

export const REGLA_POR_TIPO = new Map<TipoAusencia, ReglaAusencia>(
  REGLAS_AUSENCIA.map((r) => [r.tipo, r]),
)

export const MEDIDAS_DISCIPLINARIAS: { value: MedidaDisciplinaria; label: string }[] = [
  { value: 'DESCUENTO_DIA_Y_SEPTIMO', label: 'Descuento día + séptimo' },
  { value: 'DESCUENTO_2_DIAS_Y_SEPTIMO', label: 'Descuento 2 días + séptimo' },
  { value: 'DESCONTAR_DIA_PAGA_IGSS', label: 'Descontar día (paga IGSS)' },
  { value: 'DESCONTAR_EL_DIA', label: 'Descontar el día' },
  { value: 'DESCUENTO_EN_NOMINA', label: 'Descuento en nómina' },
  { value: 'SIN_DESCUENTO', label: 'Sin descuento' },
  { value: 'PENDIENTE', label: 'Pendiente' },
]
