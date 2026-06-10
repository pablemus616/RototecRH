import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, UserCheck, UserMinus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatDate, formatQ, nombreParaMostrar } from '@/lib/utils'
import { useEmpleadoBackend, useReactivar } from '@/hooks/useEmpleados'
import {
  usePaises,
  useEmpresas,
  useDepartamentos,
  useSubDepartamentos,
  usePuestos,
} from '@/hooks/useCompanyCatalogos'
import {
  SEXOS,
  ESTADOS_CIVILES,
  TIPOS_DISCAPACIDAD,
  PUEBLOS_GUATEMALA,
  COMUNIDADES_LINGUISTICAS,
} from '@/constants/guatemala'
import { EmpleadoStatusBadge } from './EmpleadoStatusBadge'
import { BajaDialog } from './BajaDialog'
import type { EmpleadoBackend } from '@/types'

/** Mapea un código/valor guardado a su etiqueta de catálogo (acepta value/codigo/codigoMintrab). */
function labelDe(
  items: readonly { label: string; value?: string; codigo?: string; codigoMintrab?: string }[],
  v: string | null,
): string {
  if (!v) return '—'
  return items.find((i) => i.value === v || i.codigo === v || i.codigoMintrab === v)?.label ?? v
}

/** Limpia una parte de nombre: null/undefined/'' y los literales 'null'/'undefined' → ''. */
const limpioNombre = (v: string | null | undefined): string => {
  const s = (v ?? '').trim()
  return /^(null|undefined)$/i.test(s) ? '' : s
}

function displayName(e: EmpleadoBackend): string {
  return nombreParaMostrar({
    primerNombre: limpioNombre(e.primerNombre) || limpioNombre(e.nombre),
    segundoNombre: limpioNombre(e.segundoNombre) || undefined,
    tercerNombre: limpioNombre(e.tercerNombre) || undefined,
    primerApellido: limpioNombre(e.primerApellido) || limpioNombre(e.apellido),
    segundoApellido: limpioNombre(e.segundoApellido) || undefined,
    apellidoCasada: limpioNombre(e.apellidoCasada) || undefined,
  })
}

export default function EmpleadoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useEmpleadoBackend(id)
  const reactivar = useReactivar(id ?? '')
  const [bajaOpen, setBajaOpen] = useState(false)

  // Resolución de nombres de catálogo (cacheado por TanStack Query).
  // La empresa se busca dentro del país del propio empleado (paisId real, sin depender del SP con NULL).
  const paises = usePaises()
  const paisIdEmpleado = paises.data?.find((p) => p.codigo === data?.pais)?.id
  const empresas = useEmpresas(paisIdEmpleado)
  const departamentos = useDepartamentos(data?.empresaId ?? undefined)
  const subDeps = useSubDepartamentos(data?.idDepartamento ?? undefined)
  const puestos = usePuestos(data?.idSubDepartamento ?? undefined)

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar el empleado</AlertTitle>
        <AlertDescription>
          Verifica el identificador.{' '}
          <Link to="/empleados" className="underline">
            Volver al listado
          </Link>
          .
        </AlertDescription>
      </Alert>
    )
  }

  async function onReactivar() {
    try {
      await reactivar.mutateAsync()
      toast.success('Empleado reactivado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  const nombreDisplay = displayName(data)
  const empresaNombre = empresas.data?.find((e) => e.id === data.empresaId)?.nombre ?? '—'
  const deptoNombre = departamentos.data?.find((d) => d.id === data.idDepartamento)?.nombre ?? '—'
  const subDeptoNombre = subDeps.data?.find((s) => s.id === data.idSubDepartamento)?.nombre ?? '—'
  const puestoNombre = puestos.data?.find((p) => p.id === data.idPuesto)?.nombre ?? '—'
  const paisNombre = paises.data?.find((p) => p.codigo === data.pais)?.nombre ?? data.pais ?? '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/empleados')}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/empleados/${id}/editar`)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          {data.estaActivo ? (
            <Button variant="destructive" onClick={() => setBajaOpen(true)}>
              <UserMinus className="h-4 w-4" />
              Dar de baja
            </Button>
          ) : (
            <Button variant="default" onClick={onReactivar} disabled={reactivar.isPending}>
              <UserCheck className="h-4 w-4" />
              {reactivar.isPending ? 'Reactivando…' : 'Reactivar'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{nombreDisplay}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {puestoNombre} · {deptoNombre} · {empresaNombre}
              </p>
            </div>
            <EmpleadoStatusBadge estado={data.estaActivo ? 'ACTIVO' : 'BAJA'} />
          </div>
        </CardHeader>
        <CardContent>
          {!data.estaActivo && (data.tipoBaja || data.fechaBaja || data.motivoBaja) && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Empleado dado de baja</AlertTitle>
              <AlertDescription>
                <strong>{data.tipoBaja ?? '—'}</strong>
                {' · '}
                {formatDate(data.fechaBaja)}
                {data.motivoBaja && (
                  <>
                    <br />
                    {data.motivoBaja}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <SectionGrid>
            <Section title="Identificación personal">
              <Item label="DPI" value={data.numeroIdentificacionNacional ?? '—'} mono />
              <Item label="NIT" value={data.idTributario ?? '—'} mono />
              <Item label="IGSS" value={data.idSeguroSocial ?? '—'} mono />
              <Item label="Fecha de nacimiento" value={formatDate(data.fechaNacimiento)} />
              <Item label="Sexo" value={labelDe(SEXOS, data.sexo)} />
              <Item label="Estado civil" value={labelDe(ESTADOS_CIVILES, data.estadoCivil)} />
              <Item label="Hijos" value={data.cantidadHijos != null ? String(data.cantidadHijos) : '—'} />
              <Item label="Apellido de casada" value={data.apellidoCasada || '—'} />
              <Item label="Discapacidad" value={labelDe(TIPOS_DISCAPACIDAD, data.tipoDiscapacidad)} />
              <Item label="Pasaporte" value={data.pasaporte || '—'} />
            </Section>

            <Section title="Cultural (MINTRAB)">
              <Item label="País" value={paisNombre} />
              <Item label="Pueblo de pertenencia" value={labelDe(PUEBLOS_GUATEMALA, data.puebloPertenencia)} />
              <Item label="Comunidad lingüística" value={labelDe(COMUNIDADES_LINGUISTICAS, data.comunidadLinguistica)} />
              <Item label="Grupo étnico" value={data.grupoEtnico || '—'} />
              <Item label="Lugar de nacimiento" value={data.lugarNacimientoMunicipio || '—'} />
              <Item label="Permiso extranjero" value={data.permisoExtranjero || '—'} />
            </Section>

            <Section title="Laboral">
              <Item label="Empresa" value={empresaNombre} />
              <Item label="Departamento" value={deptoNombre} />
              <Item label="Sub-departamento" value={subDeptoNombre} />
              <Item label="Puesto" value={puestoNombre} />
              <Item label="Jornada" value={data.jornada ?? '—'} />
              <Item label="Temporalidad" value={data.temporalidadContrato ?? '—'} />
              <Item label="Tipo de contrato" value={data.tipoContrato ?? '—'} />
              <Item label="Fecha de contratación" value={formatDate(data.fechaContratacion)} />
              {data.fechaReingreso && (
                <Item label="Fecha de reingreso" value={formatDate(data.fechaReingreso)} />
              )}
              <Item
                label="Salario base"
                value={data.salarioBaseContrato != null ? formatQ(data.salarioBaseContrato) : '—'}
              />
              <Item label="Profesión" value={data.profesion || '—'} />
              <Item label="Título / diploma" value={data.titulo || '—'} />
            </Section>

            <Section title="Bancario y contacto">
              <Item label="Forma de pago" value={data.formaPago ?? '—'} />
              <Item label="Código de banco" value={data.codigoBanco || '—'} />
              <Item label="Número de cuenta" value={data.numeroCuenta || '—'} mono />
              <Item label="Tipo de cuenta" value={data.tipoCuenta ?? '—'} />
              <Item label="Teléfono" value={data.telefono || '—'} />
              <Item label="Correo" value={data.correo || '—'} />
              <Item label="Código Biotime" value={data.codigoEmpleadoBio != null ? String(data.codigoEmpleadoBio) : '—'} mono />
            </Section>
          </SectionGrid>
        </CardContent>
      </Card>

      <BajaDialog
        open={bajaOpen}
        onOpenChange={setBajaOpen}
        empleadoId={String(data.id)}
        empleadoNombre={nombreDisplay}
      />
    </div>
  )
}

function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <Separator className="mb-3" />
      <dl className="space-y-2">{children}</dl>
    </div>
  )
}

function Item({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`col-span-2 font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
