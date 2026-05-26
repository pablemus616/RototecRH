import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, UserMinus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatDate, formatQ, nombreParaMostrar } from '@/lib/utils'
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
  SEXOS,
  TEMPORALIDAD_CONTRATO,
  TIPOS_BAJA,
  TIPOS_CONTRATO,
  TIPOS_CUENTA,
  TIPOS_DISCAPACIDAD,
  TIPOS_DOCUMENTO,
} from '@/constants/guatemala'
import { useEmpleado, useReactivar } from '@/hooks/useEmpleados'
import { EmpleadoFormSheet } from './EmpleadoFormSheet'
import { EmpleadoStatusBadge } from './EmpleadoStatusBadge'
import { BajaDialog } from './BajaDialog'
import { TurnoActualCard } from './TurnoActualCard'

function lookupValue<T extends { value: string; label: string }>(items: readonly T[], v: string) {
  return items.find((i) => i.value === v)?.label ?? v
}
function lookupCodigo<T extends { codigo: string; label: string }>(items: readonly T[], v: string) {
  return items.find((i) => i.codigo === v)?.label ?? v
}

export default function EmpleadoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useEmpleado(id)
  const reactivar = useReactivar(id ?? '')
  const [editOpen, setEditOpen] = useState(false)
  const [bajaOpen, setBajaOpen] = useState(false)

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

  const banco = data.codigoBanco
    ? BANCOS_GUATEMALA.find((b) => b.codigo === data.codigoBanco)
    : undefined
  const departamentoLabel = lookupValue(DEPARTAMENTOS_ROTOTEC, data.departamento)
  const nombreDisplay = nombreParaMostrar(data)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/empleados')}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          {data.estado === 'ACTIVO' ? (
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
                {data.puesto} · {departamentoLabel}
              </p>
            </div>
            <EmpleadoStatusBadge estado={data.estado} />
          </div>
        </CardHeader>
        <CardContent>
          {data.estado === 'BAJA' && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Empleado dado de baja</AlertTitle>
              <AlertDescription>
                <strong>{lookupValue(TIPOS_BAJA, data.tipoBaja ?? '')}</strong>
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
              <Item label="Tipo de documento" value={lookupValue(TIPOS_DOCUMENTO, data.tipoDocumento)} />
              <Item label="DPI" value={data.dpi} mono />
              <Item label="NIT" value={data.nit} mono />
              <Item label="IGSS" value={data.igss} mono />
              <Item label="Fecha de nacimiento" value={formatDate(data.fechaNacimiento)} />
              <Item label="Sexo" value={lookupValue(SEXOS, data.sexo)} />
              <Item label="Estado civil" value={lookupValue(ESTADOS_CIVILES, data.estadoCivil)} />
              <Item label="Hijos" value={String(data.cantidadHijos)} />
              <Item
                label="Apellido de casada"
                value={data.apellidoCasada || '—'}
              />
              <Item
                label="Discapacidad"
                value={lookupCodigo(TIPOS_DISCAPACIDAD, data.tipoDiscapacidad)}
              />
            </Section>

            <Section title="Cultural (MINTRAB)">
              <Item label="Nacionalidad" value={lookupCodigo(PAISES, data.nacionalidad)} />
              <Item label="País de origen" value={lookupCodigo(PAISES, data.paisOrigen)} />
              <Item
                label="Pueblo de pertenencia"
                value={lookupCodigo(PUEBLOS_GUATEMALA, data.puebloPertenencia)}
              />
              <Item
                label="Comunidad lingüística"
                value={lookupCodigo(COMUNIDADES_LINGUISTICAS, data.comunidadLinguistica)}
              />
              <Item
                label="Lugar de nacimiento"
                value={data.lugarNacimientoMunicipio || '—'}
              />
              <Item
                label="Permiso extranjero"
                value={data.permisoExtranjero || '—'}
              />
            </Section>

            <Section title="Laboral">
              <Item label="Puesto" value={data.puesto} />
              <Item label="Departamento" value={departamentoLabel} />
              <Item label="Jornada" value={lookupValue(JORNADAS, data.jornada)} />
              <Item
                label="Temporalidad"
                value={lookupValue(TEMPORALIDAD_CONTRATO, data.temporalidadContrato)}
              />
              <Item
                label="Tipo de contrato"
                value={lookupValue(TIPOS_CONTRATO, data.tipoContrato)}
              />
              <Item label="Sucursal" value={data.sucursal} />
              <Item label="Fecha de ingreso" value={formatDate(data.fechaIngreso)} />
              {data.fechaReingreso && (
                <Item label="Fecha de reingreso" value={formatDate(data.fechaReingreso)} />
              )}
              <Item label="Salario mensual" value={formatQ(data.salarioMensual)} />
              <Item
                label="Nivel académico"
                value={lookupCodigo(NIVELES_ACADEMICOS, data.nivelAcademico)}
              />
              <Item label="Título / Profesión" value={data.tituloProfesion || '—'} />
            </Section>

            <Section title="Bancario">
              <Item label="Forma de pago" value={lookupValue(FORMAS_PAGO, data.formaPago)} />
              <Item
                label="Código de banco"
                value={
                  banco
                    ? `${banco.codigo} — ${banco.nombre}`
                    : data.codigoBanco || '—'
                }
              />
              <Item label="Número de cuenta" value={data.numeroCuenta || '—'} mono />
              <Item
                label="Tipo de cuenta"
                value={data.tipoCuenta ? lookupValue(TIPOS_CUENTA, data.tipoCuenta) : '—'}
              />
            </Section>
          </SectionGrid>
        </CardContent>
      </Card>

      <TurnoActualCard empleadoId={data.id} empleadoNombre={nombreDisplay} />

      <EmpleadoFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        empleado={data}
      />
      <BajaDialog
        open={bajaOpen}
        onOpenChange={setBajaOpen}
        empleadoId={data.id}
        empleadoNombre={nombreDisplay}
      />
    </div>
  )
}

function SectionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
