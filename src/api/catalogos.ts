import { rrhhApi, USE_MOCK } from './client'
import {
  BANCOS_GUATEMALA,
  COMUNIDADES_LINGUISTICAS,
  ESTADOS_CIVILES,
  FORMAS_PAGO,
  JORNADAS,
  NIVELES_ACADEMICOS,
  PAISES,
  PUEBLOS_GUATEMALA,
  SEXOS,
  TEMPORALIDAD_CONTRATO,
  TIPOS_BAJA,
  TIPOS_CONTRATO,
  TIPOS_CUENTA,
  TIPOS_DISCAPACIDAD,
  TIPOS_DOCUMENTO,
} from '@/constants/guatemala'

/** Opción lista para un <Select> (value = lo que se guarda, label = lo que se ve). */
export interface CatalogoOpcion {
  value: string
  label: string
}

/** Todos los catálogos de RH. Las llaves calzan con el endpoint GET /rrhh/catalogos. */
export interface Catalogos {
  bancos: CatalogoOpcion[]
  jornadas: CatalogoOpcion[]
  sexos: CatalogoOpcion[]
  estadosCiviles: CatalogoOpcion[]
  pueblos: CatalogoOpcion[]
  comunidadesLinguisticas: CatalogoOpcion[]
  paises: CatalogoOpcion[]
  tiposDocumento: CatalogoOpcion[]
  tiposDiscapacidad: CatalogoOpcion[]
  nivelesAcademicos: CatalogoOpcion[]
  temporalidadContrato: CatalogoOpcion[]
  tiposContrato: CatalogoOpcion[]
  formasPago: CatalogoOpcion[]
  tiposCuenta: CatalogoOpcion[]
  tiposBaja: CatalogoOpcion[]
}

interface OpcionBackend {
  codigo: string
  nombre: string
  codigoMintrab: string | null
}
type CatalogosBackend = Record<keyof Catalogos, OpcionBackend[]>

const opt = (value: string, label: string): CatalogoOpcion => ({ value, label })
const porNombre = (arr: OpcionBackend[]) => arr.map((o) => opt(o.codigo, o.nombre))
const conCodigo = (arr: OpcionBackend[]) => arr.map((o) => opt(o.codigo, `${o.codigo} — ${o.nombre}`))

// ---------- Mock (valores actuales del front, mientras VITE_USE_MOCK=true) ----------

const mockApi = {
  async obtenerCatalogos(): Promise<Catalogos> {
    return {
      bancos: BANCOS_GUATEMALA.map((b) => opt(b.codigo, `${b.codigo} — ${b.nombre}`)),
      jornadas: JORNADAS.map((j) => opt(j.value, j.label)),
      sexos: SEXOS.map((s) => opt(s.value, s.label)),
      estadosCiviles: ESTADOS_CIVILES.map((e) => opt(e.value, e.label)),
      pueblos: PUEBLOS_GUATEMALA.map((p) => opt(p.codigo, p.label)),
      comunidadesLinguisticas: COMUNIDADES_LINGUISTICAS.map((c) => opt(c.codigo, c.label)),
      paises: PAISES.map((p) => opt(p.codigo, p.label)),
      tiposDocumento: TIPOS_DOCUMENTO.map((t) => opt(t.value, t.label)),
      tiposDiscapacidad: TIPOS_DISCAPACIDAD.map((t) => opt(t.codigo, t.label)),
      nivelesAcademicos: NIVELES_ACADEMICOS.map((n) => opt(n.codigo, n.label)),
      temporalidadContrato: TEMPORALIDAD_CONTRATO.map((t) => opt(t.value, t.label)),
      tiposContrato: TIPOS_CONTRATO.map((t) => opt(t.value, t.label)),
      formasPago: FORMAS_PAGO.map((f) => opt(f.value, f.label)),
      tiposCuenta: TIPOS_CUENTA.map((t) => opt(t.value, t.label)),
      tiposBaja: TIPOS_BAJA.map((t) => opt(t.value, t.label)),
    }
  },
}

// ---------- Real (GET /rrhh/catalogos) ----------

const realApi = {
  async obtenerCatalogos(): Promise<Catalogos> {
    const { data } = await rrhhApi.get<CatalogosBackend>('/catalogos')
    return {
      bancos: conCodigo(data.bancos),
      jornadas: porNombre(data.jornadas),
      sexos: porNombre(data.sexos),
      estadosCiviles: porNombre(data.estadosCiviles),
      pueblos: porNombre(data.pueblos),
      comunidadesLinguisticas: porNombre(data.comunidadesLinguisticas),
      paises: porNombre(data.paises),
      tiposDocumento: porNombre(data.tiposDocumento),
      tiposDiscapacidad: porNombre(data.tiposDiscapacidad),
      nivelesAcademicos: porNombre(data.nivelesAcademicos),
      temporalidadContrato: porNombre(data.temporalidadContrato),
      tiposContrato: porNombre(data.tiposContrato),
      formasPago: porNombre(data.formasPago),
      tiposCuenta: porNombre(data.tiposCuenta),
      tiposBaja: porNombre(data.tiposBaja),
    }
  },
}

export const catalogosApi = USE_MOCK ? mockApi : realApi
