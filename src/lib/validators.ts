import { z } from 'zod'
import {
  BANCOS_GUATEMALA,
  COMUNIDADES_LINGUISTICAS,
  DEPARTAMENTOS_ROTOTEC,
  ESTADOS_CIVILES,
  FORMAS_PAGO,
  JORNADAS,
  NIVELES_ACADEMICOS,
  PAISES,
  PUEBLOS_GUATEMALA,
  SALARIO_BASE_MINIMO_VALIDACION,
  SEXOS,
  TEMPORALIDAD_CONTRATO,
  TIPOS_BAJA,
  TIPOS_CONTRATO,
  TIPOS_CUENTA,
  TIPOS_DISCAPACIDAD,
  TIPOS_DOCUMENTO,
} from '@/constants/guatemala'

const dpiRegex = /^\d{13}$/
const nitRegex = /^(\d{1,8}|\d{1,7}K)$/i

const enumValues = <T extends { value: string }>(arr: readonly T[]) =>
  arr.map((x) => x.value) as [T['value'], ...T['value'][]]

const codigoValues = (arr: readonly { codigo: string }[]) =>
  arr.map((x) => x.codigo) as [string, ...string[]]

const isoDate = z
  .string()
  .min(1, 'Requerido')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Fecha inválida')

export const empleadoSchema = z
  .object({
    // -------- Identificación Personal --------
    primerNombre: z.string().min(1, 'Requerido').max(60),
    segundoNombre: z.string().max(60).optional().or(z.literal('')),
    tercerNombre: z.string().max(60).optional().or(z.literal('')),
    primerApellido: z.string().min(1, 'Requerido').max(60),
    segundoApellido: z.string().max(60).optional().or(z.literal('')),
    apellidoCasada: z.string().max(60).optional().or(z.literal('')),
    tipoDocumento: z.enum(enumValues(TIPOS_DOCUMENTO)),
    dpi: z.string().regex(dpiRegex, 'El DPI debe tener exactamente 13 dígitos'),
    nit: z
      .string()
      .min(1, 'Requerido')
      .regex(nitRegex, 'NIT inválido (sólo dígitos, opcionalmente K al final)'),
    igss: z.string().min(1, 'Requerido'),
    fechaNacimiento: isoDate,
    sexo: z.enum(enumValues(SEXOS)),
    estadoCivil: z.enum(enumValues(ESTADOS_CIVILES)),
    cantidadHijos: z.coerce.number().int().min(0).max(30),
    tipoDiscapacidad: z.enum(codigoValues(TIPOS_DISCAPACIDAD)),

    // -------- Datos Culturales (MINTRAB) --------
    nacionalidad: z.enum(codigoValues(PAISES)),
    paisOrigen: z.enum(codigoValues(PAISES)),
    puebloPertenencia: z.enum(codigoValues(PUEBLOS_GUATEMALA)),
    comunidadLinguistica: z.enum(codigoValues(COMUNIDADES_LINGUISTICAS)),
    lugarNacimientoMunicipio: z.string().max(80).optional().or(z.literal('')),
    permisoExtranjero: z.string().max(40).optional().or(z.literal('')),

    // -------- Datos Laborales --------
    puesto: z.string().min(1, 'Requerido').max(80),
    departamento: z.enum(enumValues(DEPARTAMENTOS_ROTOTEC)),
    jornada: z.enum(enumValues(JORNADAS)),
    temporalidadContrato: z.enum(enumValues(TEMPORALIDAD_CONTRATO)),
    tipoContrato: z.enum(enumValues(TIPOS_CONTRATO)),
    fechaIngreso: isoDate.refine(
      (v) => new Date(v).getTime() <= Date.now(),
      'La fecha de ingreso no puede ser futura',
    ),
    fechaReingreso: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => !v || !Number.isNaN(new Date(v).getTime()),
        'Fecha inválida',
      ),
    salarioMensual: z.coerce
      .number()
      .min(SALARIO_BASE_MINIMO_VALIDACION, `Mínimo Q${SALARIO_BASE_MINIMO_VALIDACION}`),
    sucursal: z.string().min(1, 'Requerido').max(120),
    nivelAcademico: z.enum(codigoValues(NIVELES_ACADEMICOS)),
    tituloProfesion: z.string().max(120).optional().or(z.literal('')),

    // -------- Datos Bancarios --------
    formaPago: z.enum(enumValues(FORMAS_PAGO)),
    codigoBanco: z.string().optional().or(z.literal('')),
    numeroCuenta: z.string().optional().or(z.literal('')),
    tipoCuenta: z.enum(enumValues(TIPOS_CUENTA)).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.formaPago === 'TRANSFERENCIA') {
      if (!data.codigoBanco) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['codigoBanco'],
          message: 'Requerido para pago por transferencia',
        })
      } else if (!BANCOS_GUATEMALA.some((b) => b.codigo === data.codigoBanco)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['codigoBanco'],
          message: 'Código de banco no válido',
        })
      }
      if (!data.numeroCuenta || data.numeroCuenta.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['numeroCuenta'],
          message: 'Número de cuenta requerido',
        })
      }
      if (!data.tipoCuenta) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tipoCuenta'],
          message: 'Selecciona tipo de cuenta',
        })
      }
    }
  })

export type EmpleadoFormValues = z.infer<typeof empleadoSchema>

export const bajaSchema = z.object({
  tipoBaja: z.enum(enumValues(TIPOS_BAJA)),
  fechaBaja: isoDate,
  motivoBaja: z.string().min(3, 'Indica el motivo'),
})

export type BajaFormValues = z.infer<typeof bajaSchema>

// =====================================================
// TURNOS
// =====================================================
const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const turnoSchema = z.object({
  nombre: z.string().min(1, 'Requerido').max(60),
  tipo: z.enum(['DIURNO', 'NOCTURNO']),
  horaEntrada: z.string().regex(horaRegex, 'Formato HH:mm'),
  horaSalida: z.string().regex(horaRegex, 'Formato HH:mm'),
  incluyeHoraAlmuerzo: z.boolean(),
})

export type TurnoFormValues = z.infer<typeof turnoSchema>

export const asignacionTurnoSchema = z.object({
  turnoId: z.string().min(1, 'Selecciona un turno'),
  fechaVigencia: isoDate,
  notas: z.string().max(200).optional().or(z.literal('')),
})

export type AsignacionTurnoFormValues = z.infer<typeof asignacionTurnoSchema>

// =====================================================
// AUSENCIAS Y ATRASOS
// =====================================================
const TIPOS_AUSENCIA_VALUES = [
  'AUSENCIA_INJUSTIFICADA',
  'AUSENCIA_ENFERMEDAD_SIN_IGSS',
  'AUSENCIA_POR_IGSS',
  'AUSENCIA_MEDIO_DIA_IGSS',
  'SUSPENSION_AMONESTACION',
  'SUSPENSION_2_DIAS',
  'VACACIONES',
  'VACACIONES_TURNO_SUSPENDIDO',
  'MUERTE_FAMILIAR',
  'PENDIENTE',
] as const

export const ausenciaSchema = z.object({
  empleadoId: z.string().min(1, 'Selecciona un empleado'),
  fecha: isoDate,
  tipoAusencia: z.enum(TIPOS_AUSENCIA_VALUES),
  presentoConstancia: z.boolean(),
  justificacion: z.string().max(500).optional().or(z.literal('')),
})

export type AusenciaFormValues = z.infer<typeof ausenciaSchema>

const TIPOS_REGISTRO_ASISTENCIA = [
  'MARCAJE',
  'DESCANSO',
  'SIN_SERVICIO',
  'ALTA_PERIODO',
  'AUSENCIA',
] as const

export const asistenciaSchema = z
  .object({
    empleadoId: z.string().min(1, 'Selecciona un empleado'),
    fecha: isoDate,
    tipoRegistro: z.enum(TIPOS_REGISTRO_ASISTENCIA),
    horaEntradaReal: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || horaRegex.test(v), 'Formato HH:mm'),
    horaSalidaReal: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || horaRegex.test(v), 'Formato HH:mm'),
    observaciones: z.string().max(200).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.tipoRegistro === 'MARCAJE') {
      if (!data.horaEntradaReal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['horaEntradaReal'],
          message: 'Requerido para marcaje',
        })
      }
      if (!data.horaSalidaReal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['horaSalidaReal'],
          message: 'Requerido para marcaje',
        })
      }
    }
  })

export type AsistenciaFormValues = z.infer<typeof asistenciaSchema>

export const atrasoSchema = z.object({
  empleadoId: z.string().min(1, 'Selecciona un empleado'),
  fecha: isoDate,
  horaEntradaReal: z.string().regex(horaRegex, 'Formato HH:mm'),
  horaSalidaReal: z.string().regex(horaRegex, 'Formato HH:mm'),
  turnoDescripcion: z.string().max(120).optional().or(z.literal('')),
  minutosRetraso: z.coerce.number().int().min(0).max(24 * 60),
})

export type AtrasoFormValues = z.infer<typeof atrasoSchema>

// =====================================================
// BONIFICACIONES
// =====================================================
const TIPOS_BONIFICACION_VALUES = [
  'PRODUCCION_ACABADOS',
  'EXTRAORDINARIO_37_2001',
  'OTROS_INGRESOS',
  'BOLSON_MAQUINAS',
  'RENDIMIENTO_ACABADOS',
  'OTRO',
] as const

const periodoRegex = /^\d{4}-\d{2}-[12]$/

export const bonificacionSchema = z.object({
  empleadoId: z.string().min(1, 'Selecciona un empleado'),
  periodo: z.string().regex(periodoRegex, 'Período inválido'),
  tipo: z.enum(TIPOS_BONIFICACION_VALUES),
  monto: z.coerce.number().min(0.01, 'Monto mayor a 0'),
  descripcion: z.string().max(200).optional().or(z.literal('')),
})

export type BonificacionFormValues = z.infer<typeof bonificacionSchema>

export const bonificacionBatchSchema = z.object({
  empleadoIds: z.array(z.string()).min(1, 'Selecciona al menos un empleado'),
  periodo: z.string().regex(periodoRegex, 'Período inválido'),
  tipo: z.enum(TIPOS_BONIFICACION_VALUES),
  monto: z.coerce.number().min(0.01, 'Monto mayor a 0'),
  descripcion: z.string().max(200).optional().or(z.literal('')),
})

export type BonificacionBatchFormValues = z.infer<typeof bonificacionBatchSchema>

export { BANCOS_GUATEMALA }
