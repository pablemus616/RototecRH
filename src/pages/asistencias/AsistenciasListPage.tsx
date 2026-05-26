import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, Upload } from 'lucide-react'

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
import { useEmpleadosList } from '@/hooks/useEmpleados'
import { useAsignacionesTurnoAll, useTurnosList } from '@/hooks/useTurnos'
import { useAsistenciasPeriodo } from '@/hooks/useAsistencias'
import { useAusenciasPeriodo } from '@/hooks/useAusencias'
import {
  quincenaDeHoy,
  rangoQuincena,
  type Quincena,
} from '@/lib/ausencias'
import {
  calcularResumenPeriodo,
  construirDiasEmpleado,
} from '@/lib/asistencias'
import { formatDate, nombreParaMostrar } from '@/lib/utils'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function AsistenciasListPage() {
  const navigate = useNavigate()
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleados, isLoading: loadingEmp } = useEmpleadosList()
  const { data: turnos } = useTurnosList()
  const { data: asignaciones } = useAsignacionesTurnoAll()
  const { data: registros, isLoading: loadingReg } = useAsistenciasPeriodo(
    rango.desde,
    rango.hasta,
  )
  const { data: ausencias } = useAusenciasPeriodo(rango.desde, rango.hasta)

  const empleadosActivos = useMemo(
    () => (empleados ?? []).filter((e) => e.estado === 'ACTIVO'),
    [empleados],
  )

  const resumenes = useMemo(() => {
    if (!empleados || !turnos || !asignaciones) return new Map<string, ReturnType<typeof calcularResumenPeriodo>>()
    const m = new Map<string, ReturnType<typeof calcularResumenPeriodo>>()
    for (const e of empleadosActivos) {
      const dias = construirDiasEmpleado({
        empleadoId: e.id,
        desde: rango.desde,
        hasta: rango.hasta,
        turnos: turnos ?? [],
        asignaciones: asignaciones ?? [],
        registros: registros ?? [],
        ausencias: ausencias ?? [],
      })
      m.set(e.id, calcularResumenPeriodo(e.id, dias))
    }
    return m
  }, [empleados, turnos, asignaciones, registros, ausencias, empleadosActivos, rango.desde, rango.hasta])

  const years = [year - 1, year, year + 1]
  const cargando = loadingEmp || loadingReg

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Año
              </label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28">
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
                <SelectTrigger className="w-40">
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
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="tabular-nums">
                {formatDate(rango.desde)} – {formatDate(rango.hasta)}
              </span>
            </div>
            <Button variant="outline" disabled title="En desarrollo">
              <Upload className="h-4 w-4" />
              Importar CSV (próximamente)
            </Button>
          </div>
        </div>
      </Card>

      {cargando ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : empleadosActivos.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No hay empleados activos.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {empleadosActivos.map((e) => {
            const r = resumenes.get(e.id)
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => navigate(`/asistencias/${e.id}`)}
                className="text-left"
              >
                <Card className="h-full p-4 transition-colors hover:bg-accent/40">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{nombreParaMostrar(e)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.puesto} ·{' '}
                        {e.departamento.replace(/_/g, ' / ').toLowerCase()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <Metric label="H. trab." value={r ? r.horasTrabajadas.toFixed(2) : '—'} />
                    <Metric
                      label="Extras D"
                      value={r ? r.horasExtrasDiurnas.toFixed(2) : '—'}
                      highlight={Boolean(r && r.horasExtrasDiurnas > 0)}
                    />
                    <Metric
                      label="Extras N"
                      value={r ? r.horasExtrasNocturnas.toFixed(2) : '—'}
                      highlight={Boolean(r && r.horasExtrasNocturnas > 0)}
                    />
                  </div>
                  {r?.algunaSemanaPorDia && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      Cálculo diario (mezcla de turnos)
                    </Badge>
                  )}
                </Card>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          'tabular-nums text-sm font-semibold ' +
          (highlight ? 'text-emerald-700' : '')
        }
      >
        {value}
      </p>
    </div>
  )
}
