import {
  rrhhApi as api,
  rrhhPublicApi as publicApi,
  USE_MOCK,
} from './client'
import type {
  Pensum, PensumArbol, PensumInput, ModuloInput, TemaInput,
  PensumModuloArbol, PensumTemaArbol,
  Evaluacion, EvaluacionDetalle, EvaluacionInput,
  Pregunta, PreguntaInput, Respuesta, RespuestaInput,
  EmpleadoCapResumen, EmpleadoCapDetalle,
  GenerarExamenInput, GenerarExamenResult,
  ExamenPublico, EnviarRespuestasInput, ResultadoExamen, EstadoModulo,
} from '@/types'

// ============ Storage (mock) ============
const K = {
  pensums: 'rototec.cap.pensums.v1',
  modulos: 'rototec.cap.modulos.v1',
  temas: 'rototec.cap.temas.v1',
  evals: 'rototec.cap.evaluaciones.v1',
  preguntas: 'rototec.cap.preguntas.v1',
  respuestas: 'rototec.cap.respuestas.v1',
  empleados: 'rototec.cap.empleados.v1',
  tokens: 'rototec.cap.tokens.v1',
}
function read<T>(key: string, seed: () => T[] = () => []): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) { const s = seed(); if (s.length) window.localStorage.setItem(key, JSON.stringify(s)); return s }
    const p = JSON.parse(raw) as T[]
    return Array.isArray(p) ? p : []
  } catch { return [] }
}
function write<T>(key: string, data: T[]) { window.localStorage.setItem(key, JSON.stringify(data)) }
function nextId<T extends { id: number }>(rows: T[]): number {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1
}
function delay(ms = 120) { return new Promise((r) => setTimeout(r, ms)) }

// Mock raw rows
interface ModuloRow extends ModuloInput { id: number; idPensum: number }
interface TemaRow extends TemaInput { id: number; idModulo: number }

function seedPensums(): Pensum[] {
  return [{ id: 1, nombre: 'Inducción Operario', puesto: 'Operario', idPuesto: null }]
}
function seedModulos(): ModuloRow[] {
  return [{ id: 1, idPensum: 1, modulo: 'Seguridad básica', objetivo: 'Conocer EPP', porcentajeAprobacion: 70, bono: false }]
}

// ============ Mock helpers to build trees ============
function buildPensumArbol(p: Pensum): PensumArbol {
  const modulos = read<ModuloRow>(K.modulos, seedModulos).filter((m) => m.idPensum === p.id)
  const temas = read<TemaRow>(K.temas)
  const modulosArbol: PensumModuloArbol[] = modulos.map((m) => ({
    id: m.id, modulo: m.modulo, objetivo: m.objetivo ?? null,
    duracionHoras: m.duracionHoras ?? null, capacitador: m.capacitador ?? null,
    tipoEvaluacion: m.tipoEvaluacion ?? null, instrumentos: m.instrumentos ?? null,
    porcentajeAprobacion: m.porcentajeAprobacion ?? null, vigencia: m.vigencia ?? null,
    bono: m.bono ?? null,
    temas: temas.filter((t) => t.idModulo === m.id).map<PensumTemaArbol>((t) => ({
      id: t.id, tema: t.tema ?? null, modalidad: t.modalidad ?? null, recursos: t.recursos ?? null,
    })),
  }))
  return { id: p.id, nombre: p.nombre, puesto: p.puesto, idPuesto: p.idPuesto, modulos: modulosArbol }
}

// ============ MOCK API ============
const mockApi = {
  // -- Pensums --
  async listPensums(): Promise<Pensum[]> { await delay(); return read<Pensum>(K.pensums, seedPensums) },
  async getPensum(id: number): Promise<PensumArbol> {
    await delay()
    const p = read<Pensum>(K.pensums, seedPensums).find((x) => x.id === id)
    if (!p) throw new Error('Pensum no encontrado')
    return buildPensumArbol(p)
  },
  async createPensum(input: PensumInput): Promise<Pensum> {
    await delay()
    const rows = read<Pensum>(K.pensums, seedPensums)
    const nuevo: Pensum = { id: nextId(rows), nombre: input.nombre, puesto: input.puesto ?? null, idPuesto: input.idPuesto ?? null }
    write(K.pensums, [nuevo, ...rows]); return nuevo
  },
  async updatePensum(id: number, input: PensumInput): Promise<Pensum> {
    await delay()
    const rows = read<Pensum>(K.pensums, seedPensums)
    const i = rows.findIndex((x) => x.id === id); if (i === -1) throw new Error('Pensum no encontrado')
    rows[i] = { ...rows[i], nombre: input.nombre, puesto: input.puesto ?? rows[i].puesto, idPuesto: input.idPuesto ?? rows[i].idPuesto }
    write(K.pensums, rows); return rows[i]
  },
  async deletePensum(id: number): Promise<{ id: number }> {
    await delay(); write(K.pensums, read<Pensum>(K.pensums, seedPensums).filter((x) => x.id !== id)); return { id }
  },
  // -- Módulos --
  async createModulo(idPensum: number, input: ModuloInput): Promise<PensumModuloArbol> {
    await delay()
    const rows = read<ModuloRow>(K.modulos, seedModulos)
    const row: ModuloRow = { ...input, id: nextId(rows), idPensum }
    write(K.modulos, [...rows, row])
    return { id: row.id, modulo: row.modulo, objetivo: row.objetivo ?? null, duracionHoras: row.duracionHoras ?? null, capacitador: row.capacitador ?? null, tipoEvaluacion: row.tipoEvaluacion ?? null, instrumentos: row.instrumentos ?? null, porcentajeAprobacion: row.porcentajeAprobacion ?? null, vigencia: row.vigencia ?? null, bono: row.bono ?? null, temas: [] }
  },
  async updateModulo(id: number, input: ModuloInput): Promise<{ id: number }> {
    await delay()
    const rows = read<ModuloRow>(K.modulos, seedModulos)
    const i = rows.findIndex((x) => x.id === id); if (i === -1) throw new Error('Módulo no encontrado')
    rows[i] = { ...rows[i], ...input }; write(K.modulos, rows); return { id }
  },
  async deleteModulo(id: number): Promise<{ id: number }> {
    await delay(); write(K.modulos, read<ModuloRow>(K.modulos, seedModulos).filter((x) => x.id !== id)); return { id }
  },
  // -- Temas --
  async createTema(idModulo: number, input: TemaInput): Promise<PensumTemaArbol> {
    await delay()
    const rows = read<TemaRow>(K.temas)
    const row: TemaRow = { ...input, id: nextId(rows), idModulo }
    write(K.temas, [...rows, row])
    return { id: row.id, tema: row.tema ?? null, modalidad: row.modalidad ?? null, recursos: row.recursos ?? null }
  },
  async deleteTema(id: number): Promise<{ id: number }> {
    await delay(); write(K.temas, read<TemaRow>(K.temas).filter((x) => x.id !== id)); return { id }
  },
  // -- Evaluación / preguntas / respuestas --
  async getEvaluacion(idModulo: number): Promise<EvaluacionDetalle | null> {
    await delay()
    const ev = read<Evaluacion>(K.evals).find((e) => e.idModulo === idModulo)
    if (!ev) return null
    const preguntas = read<Pregunta>(K.preguntas).filter((p) => p.idEvaluacion === ev.id)
    const resp = read<Respuesta>(K.respuestas)
    return { evaluacion: ev, preguntas: preguntas.map((p) => ({ ...p, respuestas: resp.filter((r) => r.idPregunta === p.id) })) }
  },
  async createEvaluacion(input: EvaluacionInput): Promise<Evaluacion> {
    await delay()
    const rows = read<Evaluacion>(K.evals)
    const ev: Evaluacion = { id: nextId(rows), idModulo: input.idModulo, nombre: input.nombre ?? null }
    write(K.evals, [...rows, ev]); return ev
  },
  async updateEvaluacion(id: number, nombre: string | undefined): Promise<Evaluacion> {
    await delay()
    const rows = read<Evaluacion>(K.evals); const i = rows.findIndex((e) => e.id === id)
    if (i === -1) throw new Error('Evaluación no encontrada')
    rows[i] = { ...rows[i], nombre: nombre ?? rows[i].nombre }; write(K.evals, rows); return rows[i]
  },
  async deleteEvaluacion(id: number): Promise<{ id: number }> {
    await delay(); write(K.evals, read<Evaluacion>(K.evals).filter((e) => e.id !== id)); return { id }
  },
  async createPregunta(idEvaluacion: number, input: PreguntaInput): Promise<Pregunta> {
    await delay()
    const rows = read<Pregunta>(K.preguntas)
    const p: Pregunta = { id: nextId(rows), idEvaluacion, pregunta: input.pregunta, puntosPorRespuesta: input.puntosPorRespuesta ?? null, idTema: input.idTema ?? null, respuestas: [] }
    write(K.preguntas, [...rows, p]); return p
  },
  async deletePregunta(id: number): Promise<{ id: number }> {
    await delay(); write(K.preguntas, read<Pregunta>(K.preguntas).filter((p) => p.id !== id)); return { id }
  },
  async createRespuesta(idPregunta: number, input: RespuestaInput): Promise<Respuesta> {
    await delay()
    const rows = read<Respuesta>(K.respuestas)
    const r: Respuesta = { id: nextId(rows), idPregunta, respuesta: input.respuesta, respuestaCorrecta: input.respuestaCorrecta ?? false }
    write(K.respuestas, [...rows, r]); return r
  },
  async deleteRespuesta(id: number): Promise<{ id: number }> {
    await delay(); write(K.respuestas, read<Respuesta>(K.respuestas).filter((r) => r.id !== id)); return { id }
  },
  // -- Asignaciones --
  async asignarPrimaria(empleadoIds: number[]): Promise<{ ok: true }> { await delay(); void empleadoIds; return { ok: true } },
  async asignarSecundaria(empleadoId: number, idPensum: number): Promise<{ ok: true }> { await delay(); void empleadoId; void idPensum; return { ok: true } },
  // -- Empleados --
  async listEmpleados(filtros?: { puesto?: string; departamento?: string; estado?: string }): Promise<EmpleadoCapResumen[]> {
    await delay(); void filtros
    return read<EmpleadoCapResumen>(K.empleados, () => [
      { empleadoId: 1, nombre: 'María García', idPuesto: 1, idDepartamento: 1, estaActivo: true, modulosTotal: 3, modulosAprobados: 1, licenciaActiva: false },
    ])
  },
  async getEmpleado(empleadoId: number): Promise<EmpleadoCapDetalle> {
    await delay()
    return { empleadoId, asignaciones: [] }
  },
  // -- Examen (admin genera) --
  async generarExamen(input: GenerarExamenInput): Promise<GenerarExamenResult> {
    await delay()
    const token = `tok-${input.idAsignacionDetalle}-${Date.now().toString(36)}`
    return { token, url: `${window.location.origin}/examen/${token}` }
  },
  // -- Examen público --
  async getExamenPublico(token: string): Promise<ExamenPublico> {
    await delay()
    void token
    return { idEvaluacion: 1, nombre: 'Examen de prueba (mock)', preguntas: [
      { idPregunta: 1, pregunta: '¿Qué es EPP?', puntos: 50, opciones: [
        { idRespuesta: 1, respuesta: 'Equipo de protección personal' },
        { idRespuesta: 2, respuesta: 'Examen previo de planta' },
      ] },
    ] }
  },
  async enviarExamen(token: string, input: EnviarRespuestasInput): Promise<ResultadoExamen> {
    await delay(); void token
    const correctas = input.respuestas.filter((r) => r.idRespuesta === 1).length
    const puntaje = correctas * 50
    const estado: EstadoModulo = puntaje >= 70 ? 'Aprobado' : 'No aprobado'
    return { puntaje, aprobado: estado === 'Aprobado', estado }
  },
}

// ============ REAL API ============
const realApi: typeof mockApi = {
  async listPensums() { const { data } = await api.get<Pensum[]>('/capacitaciones/pensums'); return data },
  async getPensum(id) { const { data } = await api.get<PensumArbol>(`/capacitaciones/pensums/${id}`); return data },
  async createPensum(input) { const { data } = await api.post<Pensum>('/capacitaciones/pensums', input); return data },
  async updatePensum(id, input) { const { data } = await api.put<Pensum>(`/capacitaciones/pensums/${id}`, input); return data },
  async deletePensum(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/${id}`); return data },
  async createModulo(idPensum, input) { const { data } = await api.post<PensumModuloArbol>(`/capacitaciones/pensums/${idPensum}/modulos`, input); return data },
  async updateModulo(id, input) { const { data } = await api.put<{ id: number }>(`/capacitaciones/pensums/modulos/${id}`, input); return data },
  async deleteModulo(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/modulos/${id}`); return data },
  async createTema(idModulo, input) { const { data } = await api.post<PensumTemaArbol>(`/capacitaciones/pensums/modulos/${idModulo}/temas`, input); return data },
  async deleteTema(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/pensums/temas/${id}`); return data },
  async getEvaluacion(idModulo) { const { data } = await api.get<EvaluacionDetalle | null>(`/capacitaciones/modulos/${idModulo}/evaluacion`); return data },
  async createEvaluacion(input) { const { data } = await api.post<Evaluacion>('/capacitaciones/evaluaciones', input); return data },
  async updateEvaluacion(id, nombre) { const { data } = await api.put<Evaluacion>(`/capacitaciones/evaluaciones/${id}`, { nombre }); return data },
  async deleteEvaluacion(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/evaluaciones/${id}`); return data },
  async createPregunta(idEvaluacion, input) { const { data } = await api.post<Pregunta>(`/capacitaciones/evaluaciones/${idEvaluacion}/preguntas`, input); return data },
  async deletePregunta(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/preguntas/${id}`); return data },
  async createRespuesta(idPregunta, input) { const { data } = await api.post<Respuesta>(`/capacitaciones/preguntas/${idPregunta}/respuestas`, input); return data },
  async deleteRespuesta(id) { const { data } = await api.delete<{ id: number }>(`/capacitaciones/respuestas/${id}`); return data },
  async asignarPrimaria(empleadoIds) { const { data } = await api.post<{ ok: true }>('/capacitaciones/asignaciones', { empleadoIds }); return data },
  async asignarSecundaria(empleadoId, idPensum) { const { data } = await api.post<{ ok: true }>('/capacitaciones/asignaciones/secundaria', { empleadoId, idPensum }); return data },
  async listEmpleados(filtros) {
    const { data } = await api.get<EmpleadoCapResumen[]>('/capacitaciones/empleados', { params: filtros })
    return data
  },
  async getEmpleado(empleadoId) { const { data } = await api.get<EmpleadoCapDetalle>(`/capacitaciones/empleados/${empleadoId}`); return data },
  async generarExamen(input) { const { data } = await api.post<GenerarExamenResult>('/capacitaciones/examenes', input); return data },
  async getExamenPublico(token) { const { data } = await publicApi.get<ExamenPublico>(`/capacitaciones/examen/${token}`); return data },
  async enviarExamen(token, input) { const { data } = await publicApi.post<ResultadoExamen>(`/capacitaciones/examen/${token}`, input); return data },
}

export const capacitacionesApi = USE_MOCK ? mockApi : realApi
