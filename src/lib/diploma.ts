import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export interface DiplomaDatos {
  nombreCorto: string // "Primer Apellido, Primer Nombre" o "Primer Nombre Primer Apellido"
  nombreCompleto: string // nombre completo del empleado
  codigoEmpleado: string // ID_FH / código
  puesto: string // nombre del puesto
  fecha?: Date // por defecto: hoy
}

export async function generarDiplomaDocx(d: DiplomaDatos): Promise<void> {
  const fecha = d.fecha ?? new Date()
  const dia = String(fecha.getDate())
  const mes = MESES[fecha.getMonth()]
  const anio = String(fecha.getFullYear())

  const response = await fetch('/templates/diploma_operario.docx')
  if (!response.ok) throw new Error('No se pudo cargar la plantilla del diploma')
  const arrayBuffer = await response.arrayBuffer()

  const zip = new PizZip(arrayBuffer)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  doc.render({
    NOMBRE_EMPLEADO: d.nombreCorto,
    NOMBRE_COMPLETO: d.nombreCompleto,
    CODIGO_EMPLEADO: d.codigoEmpleado,
    PUESTO: d.puesto,
    DIA: dia,
    MES: mes,
    ANIO: anio,
    FECHA_COMPLETA: `${dia} de ${mes} de ${anio}`,
  })

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  saveAs(
    blob,
    `Diploma_${d.nombreCorto.replace(/\s+/g, '_')}_${d.codigoEmpleado || 'SC'}.docx`,
  )
}
