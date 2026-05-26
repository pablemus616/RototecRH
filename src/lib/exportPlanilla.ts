import * as XLSX from 'xlsx'
import type { Planilla } from '@/types'
import { formatDate } from './utils'

// Mapea LineaPlanilla a un objeto plano con los nombres de columna del Excel real
// (que usa Contabilidad).
function lineaARowExcel(l: Planilla['lineas'][number], i: number) {
  const snap = l.empleadoSnapshot
  return {
    '#': i + 1,
    'CODIGO BANCO': snap.codigoBanco ?? '',
    'FECHA INGRESO EMPRESA': formatDate(snap.fechaIngreso),
    'ESTADO ALTA': snap.estadoAlta,
    'ESTADO CONTRATO': snap.estadoContrato,
    'FECHA EGRESO': snap.fechaEgreso ? formatDate(snap.fechaEgreso) : '',
    'TIPO DE BAJA': snap.tipoBaja ?? '',
    'NOMBRE COMPLETO DEL EMPLEADO': snap.nombreCompleto,
    'PUESTO QUE DESEMPEÑA': snap.puesto,
    'DEPARTAMENTO': snap.departamento,
    'TIPO DE PAGO': snap.formaPago,
    'NO. DE CUENTA': snap.numeroCuenta ?? '',
    'TIPO CUENTA': snap.tipoCuenta ?? '',
    'NUMERO DE DPI': snap.dpi,
    'NO.AFILIACION IGSS': snap.igss,
    'NO.NIT': snap.nit,
    'SUELDO BASE': snap.salarioMensual,
    '# DIAS DEL MES': l.diasDelMes,
    'AUSENCIAS': l.ausenciasDias,
    'DIAS SUSPENSIÓN IGSS': l.diasSuspensionIGSS,
    'DIAS A PAGAR': l.diasAPagar,
    'SUELDO PERCIBIDO': l.sueldoPercibido,
    'BONIFICACIÓN INCENTIVO': l.bonificacionIncentivo,
    '# HE SIMPLES DIU': l.heSimplesDiurnas,
    '# HE SIMPLES MIX': l.heSimplesMixtas,
    '# HE SIMPLES NO': l.heSimplesNocturnas,
    '# HE DOBLES': l.heDobles,
    'HORAS SIMPLES DIU': l.ingresoHorasDiurnas,
    'HORAS SIMPLES MIX': l.ingresoHorasMixtas,
    'HORAS SIMPLES NO': l.ingresoHorasNocturnas,
    'HORAS DOBLES': l.ingresoHorasDobles,
    'BONO PRODUCTIVIDAD ACABADOS': l.bonoProductividadAcabados,
    'BONO DECRETO 37-2001': l.bonoExtraordinario,
    'OTROS INGRESOS': l.otrosIngresos,
    'BOLSÓN BONIFICACIONES MÁQUINAS': l.bolsonBonificacionesMaquinas,
    'BONO RENDIMIENTO ACABADOS': l.bonoRendimientoAcabados,
    'TOTAL INGRESOS': l.totalIngresos,
    'IGSS': l.igssLaboral,
    'ISR': l.isr,
    'ANTICIPO QUINCENAL': l.anticipoQuincenal,
    'Desc 1': l.descuento1,
    'DES 2': l.descuento2,
    'EMBARGOS': l.embargos,
    'TOTAL DESCUENTOS': l.totalDescuentos,
    'LÍQUIDO': l.liquidoRecibir,
    'IGSS PATRONAL': l.igssPatronal,
    'PROVISIÓN INTECAP': l.provisionIntecap,
    'PROVISIÓN IRTRA': l.provisionIrtra,
    'PROVISIÓN AGUINALDO': l.provisionAguinaldo,
  }
}

export function exportarPlanillaExcel(planilla: Planilla, nombreArchivo?: string) {
  const rows = planilla.lineas.map(lineaARowExcel)

  // Hoja
  const ws = XLSX.utils.json_to_sheet(rows)

  // Anchos de columna razonables
  const firstRow = rows[0] ?? {}
  ws['!cols'] = Object.keys(firstRow).map((k) => ({
    wch: Math.max(8, Math.min(28, k.length + 2)),
  }))

  // Libro
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Planilla ${planilla.periodo}`)

  const file =
    nombreArchivo ?? `Planilla_${planilla.periodo}_Rototec.xlsx`
  XLSX.writeFile(wb, file)
}
