import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEmpleado } from '@/hooks/useEmpleados'
import { useAsignacionesTurnoAll, useTurnosList } from '@/hooks/useTurnos'
import {
  useAsistenciasEmpleadoPeriodo,
} from '@/hooks/useAsistencias'
import { useAusenciasPeriodo } from '@/hooks/useAusencias'
import {
  agruparPorSemana,
  calcularResumenSemanal,
  construirDiasEmpleado,
  type DiaAsistencia,
} from '@/lib/asistencias'
import {
  quincenaDeHoy,
  rangoQuincena,
  type Quincena,
} from '@/lib/ausencias'
import { formatDate, nombreParaMostrar } from '@/lib/utils'
import { MarcajeDialog } from './MarcajeDialog'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TIPO_LABEL: Record<DiaAsistencia['tipoEfectivo'], string> = {
  MARCAJE: 'Marcaje',
  DESCANSO: 'Descanso',
  SIN_SERVICIO: 'Sin servicio',
  ALTA_PERIODO: 'Alta período',
  AUSENCIA: 'Ausencia',
  PENDIENTE: 'Pendiente',
}

export default function AsistenciaEmpleadoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleado, isLoading: loadingEmp } = useEmpleado(id)
  const { data: turnos } = useTurnosList()
  const { data: asignaciones } = useAsignacionesTurnoAll()
  const { data: registros, isLoading: loadingReg } = useAsistenciasEmpleadoPeriodo(
    id,
    rango.desde,
    rango.hasta,
  )
  const { data: ausencias } = useAusenciasPeriodo(rango.desde, rango.hasta)

  const [dialogFecha, setDialogFecha] = useState<string | null>(null)

  const dias = useMemo(() => {
    if (!id) return []
    return construirDiasEmpleado({
      empleadoId: id,
      desde: rango.desde,
      hasta: rango.hasta,
      turnos: turnos ?? [],
      asignaciones: asignaciones ?? [],
      registros: registros ?? [],
      ausencias: ausencias ?? [],
    })
  }, [id, rango.desde, rango.hasta, turnos, asignaciones, registros, ausencias])

  const semanas = useMemo(() => agruparPorSemana(dias), [dias])

  const years = [year - 1, year, year + 1]

  if (loadingEmp) return <Skeleton className="h-96 w-full" />
  if (!empleado) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Empleado no encontrado</AlertTitle>
        <AlertDescription>
          <Link to="/asistencias" className="underline">
            Volver al listado
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  const nombre = nombreParaMostrar(empleado)
  const diaSeleccionado = dialogFecha ? dias.find((d) => d.fecha === dialogFecha) : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/asistencias')}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{nombre}</h2>
            <p className="text-sm text-muted-foreground">
              {empleado.puesto} ·{' '}
              {empleado.departamento.replace(/_/g, ' / ').toLowerCase()}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Año
              </label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Mes
              </label>
              <Select
                value={String(monthIndex)}
                onValueChange={(v) => setMonthIndex(Number(v))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Quincena
              </label>
              <Select
                value={String(quincena)}
                onValueChange={(v) => setQuincena(Number(v) as Quincena)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ª (1–15)</SelectItem>
                  <SelectItem value="2">2ª (16–fin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {formatDate(rango.desde)} – {formatDate(rango.hasta)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {loadingReg ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Plan.</TableHead>
                <TableHead>Real</TableHead>
                <TableHead className="text-right">H. plan.</TableHead>
                <TableHead className="text-right">H. trab.</TableHead>
                <TableHead className="text-right">Δ Extras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...semanas.entries()].map(([lunes, diasSemana]) => {
                const resumen = calcularResumenSemanal(empleado.id, diasSemana)
                return (
                  <SemanaSection
                    key={lunes}
                    diasSemana={diasSemana}
                    resumen={resumen}
                    onClickDia={(fecha) => setDialogFecha(fecha)}
                  />
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {dialogFecha && diaSeleccionado && (
        <MarcajeDialog
          open={Boolean(dialogFecha)}
          onOpenChange={(v) => !v && setDialogFecha(null)}
          empleadoId={empleado.id}
          empleadoNombre={nombre}
          fecha={dialogFecha}
          turnoVigente={diaSeleccionado.turnoVigente}
          registroActual={diaSeleccionado.registro}
          ausenciaId={diaSeleccionado.ausenciaId}
        />
      )}
    </div>
  )
}

function SemanaSection({
  diasSemana,
  resumen,
  onClickDia,
}: {
  diasSemana: DiaAsistencia[]
  resumen: ReturnType<typeof calcularResumenSemanal>
  onClickDia: (fecha: string) => void
}) {
  return (
    <>
      {diasSemana.map((d) => {
        const extras = d.deltaExtras
        const claseExtras =
          extras > 0
            ? 'text-emerald-700 bg-emerald-50/50'
            : extras < 0
              ? 'text-destructive bg-destructive/5'
              : ''
        return (
          <TableRow
            key={d.fecha}
            className="cursor-pointer hover:bg-muted/40"
            onClick={() => onClickDia(d.fecha)}
          >
            <TableCell className="tabular-nums">{formatDate(d.fecha)}</TableCell>
            <TableCell className="capitalize">{d.diaSemana}</TableCell>
            <TableCell>
              {d.turnoVigente ? (
                <Badge variant={d.turnoVigente.tipo === 'DIURNO' ? 'warning' : 'secondary'}>
                  {d.turnoVigente.nombre}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">SIN TURNO</span>
              )}
            </TableCell>
            <TableCell className="text-xs tabular-nums text-muted-foreground">
              {d.turnoVigente
                ? `${d.turnoVigente.horaEntrada}–${d.turnoVigente.horaSalida}`
                : '—'}
            </TableCell>
            <TableCell className="text-xs tabular-nums">
              <RealCell dia={d} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {d.horasPlanificadas > 0 ? d.horasPlanificadas.toFixed(2) : '—'}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {d.tipoEfectivo === 'MARCAJE' ? d.horasTrabajadas.toFixed(2) : '—'}
            </TableCell>
            <TableCell className={`text-right tabular-nums ${claseExtras}`}>
              {d.tipoEfectivo === 'MARCAJE'
                ? (extras > 0 ? '+' : '') + extras.toFixed(2)
                : '—'}
            </TableCell>
          </TableRow>
        )
      })}
      <TableRow className="border-y bg-muted/30 text-xs font-medium">
        <TableCell colSpan={5} className="py-2">
          Semana {formatDate(diasSemana[0]?.fecha ?? '')} —{' '}
          <span className="tabular-nums">
            Trab. {resumen.horasTrabajadas.toFixed(2)} h
          </span>
          {resumen.horasExtrasDiurnas > 0 && (
            <span className="ml-3 tabular-nums text-emerald-700">
              Extras D: {resumen.horasExtrasDiurnas.toFixed(2)}
            </span>
          )}
          {resumen.horasExtrasNocturnas > 0 && (
            <span className="ml-3 tabular-nums text-emerald-700">
              Extras N: {resumen.horasExtrasNocturnas.toFixed(2)}
            </span>
          )}
          {resumen.calculoPorDia && (
            <Badge variant="outline" className="ml-3 text-[10px]">
              cálculo diario
            </Badge>
          )}
        </TableCell>
        <TableCell colSpan={3} />
      </TableRow>
    </>
  )
}

function RealCell({ dia }: { dia: DiaAsistencia }) {
  if (dia.tipoEfectivo === 'MARCAJE' && dia.registro) {
    return (
      <span>
        {dia.registro.horaEntradaReal ?? '—'} – {dia.registro.horaSalidaReal ?? '—'}
      </span>
    )
  }
  if (dia.tipoEfectivo === 'PENDIENTE') {
    return <span className="text-muted-foreground">pendiente</span>
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      {TIPO_LABEL[dia.tipoEfectivo]}
    </Badge>
  )
}
