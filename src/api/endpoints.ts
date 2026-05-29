import type {
  AsignacionTurno,
  AsignacionTurnoInput,
  Atraso,
  AtrasoInput,
  Ausencia,
  AusenciaInput,
  BajaInput,
  Bonificacion,
  BonificacionBatchInput,
  BonificacionInput,
  Empleado,
  EmpleadoInput,
  LineaInputManual,
  Planilla,
  RegistroAsistencia,
  RegistroAsistenciaInput,
  Turno,
  TurnoInput,
} from '@/types'
import type { ParamsGenerarPlanilla } from '@/lib/planilla'
import { empleadosApi } from './employees'
import { asignacionesTurnoApi, turnosApi } from './turnos'
import { atrasosApi, ausenciasApi } from './ausencias'
import { asistenciasApi } from './asistencias'
import { bonificacionesApi } from './bonificaciones'
import { planillaApi } from './planilla'

// ==================== Empleados ====================

export const getEmpleados = (): Promise<Empleado[]> => empleadosApi.list()
export const getEmpleado = (id: string): Promise<Empleado> => empleadosApi.get(id)
export const createEmpleado = (input: EmpleadoInput): Promise<Empleado> =>
  empleadosApi.create(input)
export const updateEmpleado = (id: string, input: EmpleadoInput): Promise<Empleado> =>
  empleadosApi.update(id, input)
export const darDeBajaEmpleado = (id: string, baja: BajaInput): Promise<Empleado> =>
  empleadosApi.darDeBaja(id, baja)
export const reactivarEmpleado = (id: string): Promise<Empleado> =>
  empleadosApi.reactivar(id)

// ==================== Turnos ====================

export const getTurnos = (): Promise<Turno[]> => turnosApi.list()
export const getTurno = (id: string): Promise<Turno> => turnosApi.get(id)
export const createTurno = (input: TurnoInput): Promise<Turno> => turnosApi.create(input)
export const updateTurno = (id: string, input: TurnoInput): Promise<Turno> =>
  turnosApi.update(id, input)
export const desactivarTurno = (id: string): Promise<Turno> => turnosApi.desactivar(id)
export const reactivarTurno = (id: string): Promise<Turno> => turnosApi.reactivar(id)

// ==================== Asignaciones de turno ====================

export const getAsignacionesTurno = (): Promise<AsignacionTurno[]> =>
  asignacionesTurnoApi.list()
export const getAsignacionesTurnoPorEmpleado = (
  empleadoId: string,
): Promise<AsignacionTurno[]> => asignacionesTurnoApi.listByEmpleado(empleadoId)
export const createAsignacionTurno = (
  input: AsignacionTurnoInput,
): Promise<AsignacionTurno> => asignacionesTurnoApi.create(input)

// ==================== Ausencias ====================

export const getAusencias = (): Promise<Ausencia[]> => ausenciasApi.list()
export const getAusenciasPorPeriodo = (
  desde: string,
  hasta: string,
): Promise<Ausencia[]> => ausenciasApi.listByPeriodo(desde, hasta)
export const getAusenciasPorEmpleado = (empleadoId: string): Promise<Ausencia[]> =>
  ausenciasApi.listByEmpleado(empleadoId)
export const createAusencia = (input: AusenciaInput): Promise<Ausencia> =>
  ausenciasApi.create(input)
export const updateAusencia = (id: string, input: AusenciaInput): Promise<Ausencia> =>
  ausenciasApi.update(id, input)
export const deleteAusencia = (id: string): Promise<void> => ausenciasApi.remove(id)

// ==================== Atrasos ====================

export const getAtrasos = (): Promise<Atraso[]> => atrasosApi.list()
export const getAtrasosPorPeriodo = (
  desde: string,
  hasta: string,
): Promise<Atraso[]> => atrasosApi.listByPeriodo(desde, hasta)
export const getAtrasosPorEmpleado = (empleadoId: string): Promise<Atraso[]> =>
  atrasosApi.listByEmpleado(empleadoId)
export const createAtraso = (input: AtrasoInput): Promise<Atraso> =>
  atrasosApi.create(input)
export const updateAtraso = (id: string, input: AtrasoInput): Promise<Atraso> =>
  atrasosApi.update(id, input)
export const deleteAtraso = (id: string): Promise<void> => atrasosApi.remove(id)

// ==================== Asistencias ====================

export const getAsistencias = (): Promise<RegistroAsistencia[]> =>
  asistenciasApi.list()
export const getAsistenciasPorPeriodo = (
  desde: string,
  hasta: string,
): Promise<RegistroAsistencia[]> => asistenciasApi.listByPeriodo(desde, hasta)
export const getAsistenciasPorEmpleadoPeriodo = (
  empleadoId: string,
  desde: string,
  hasta: string,
): Promise<RegistroAsistencia[]> =>
  asistenciasApi.listByEmpleadoPeriodo(empleadoId, desde, hasta)
export const upsertAsistencia = (
  input: RegistroAsistenciaInput,
): Promise<RegistroAsistencia> => asistenciasApi.upsert(input)
export const deleteAsistencia = (empleadoId: string, fecha: string): Promise<void> =>
  asistenciasApi.remove(empleadoId, fecha)

// ==================== Bonificaciones ====================

export const getBonificaciones = (): Promise<Bonificacion[]> =>
  bonificacionesApi.list()
export const getBonificacionesPorPeriodo = (periodo: string): Promise<Bonificacion[]> =>
  bonificacionesApi.listByPeriodo(periodo)
export const getBonificacionesPorEmpleado = (
  empleadoId: string,
): Promise<Bonificacion[]> => bonificacionesApi.listByEmpleado(empleadoId)
export const createBonificacion = (input: BonificacionInput): Promise<Bonificacion> =>
  bonificacionesApi.create(input)
export const createBonificacionesBatch = (
  input: BonificacionBatchInput,
): Promise<Bonificacion[]> => bonificacionesApi.createBatch(input)
export const updateBonificacion = (
  id: string,
  input: BonificacionInput,
): Promise<Bonificacion> => bonificacionesApi.update(id, input)
export const deleteBonificacion = (id: string): Promise<void> =>
  bonificacionesApi.remove(id)

// ==================== Planilla ====================

export const getPlanillas = (): Promise<Planilla[]> => planillaApi.list()
export const getPlanillaPorPeriodo = (periodo: string): Promise<Planilla | null> =>
  planillaApi.getByPeriodo(periodo)
export const generarPlanilla = (params: ParamsGenerarPlanilla): Promise<Planilla> =>
  planillaApi.generar(params)
export const updateLineaPlanilla = (
  periodo: string,
  empleadoId: string,
  parche: Partial<LineaInputManual>,
): Promise<Planilla> => planillaApi.updateLinea(periodo, empleadoId, parche)
export const cerrarPlanilla = (periodo: string): Promise<Planilla> =>
  planillaApi.cerrar(periodo)
