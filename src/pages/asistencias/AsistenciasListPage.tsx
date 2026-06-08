import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, Clock, Search, Upload } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  VerificacionResumen,
  VerificacionTable,
} from '@/components/asistencias/verificacion'
import { useEmpleadosList } from '@/hooks/useEmpleados'
import { useAsignacionesTurnoAll, useTurnosList } from '@/hooks/useTurnos'
import { useAsistenciasPeriodo, useVerificacionAsistencias } from '@/hooks/useAsistencias'
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
  const [tab, setTab] = useState<'resumen' | 'verificacion'>('resumen')
  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | 'acabados' | 'produccion'>('TODOS')
  const [soloNovedades, setSoloNovedades] = useState(false)
  const [texto, setTexto] = useState('')

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
  const verifQ = useVerificacionAsistencias(rango.desde, rango.hasta)

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

  const verifBase = useMemo(() => {
    let r = verifQ.data ?? []
    if (tipoFiltro !== 'TODOS') r = r.filter((x) => x.tipo === tipoFiltro)
    const q = texto.trim().toLowerCase()
    if (q) r = r.filter((x) => x.nombre.toLowerCase().includes(q))
    return r
  }, [verifQ.data, tipoFiltro, texto])
  const verifMostrados = useMemo(
    () =>
      soloNovedades
        ? verifBase.filter((x) => x.llegoTarde || x.salioTemprano)
        : verifBase,
    [verifBase, soloNovedades],
  )

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

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'resumen' | 'verificacion')}>
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="verificacion">Verificación</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-3">
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
        </TabsContent>

        <TabsContent value="verificacion" className="mt-3 space-y-4">
          <VerificacionResumen rows={verifBase} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar empleado"
                className="w-64 pl-9"
              />
            </div>
            <Select
              value={tipoFiltro}
              onValueChange={(v) =>
                setTipoFiltro(v as 'TODOS' | 'acabados' | 'produccion')
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los tipos</SelectItem>
                <SelectItem value="acabados">Acabados</SelectItem>
                <SelectItem value="produccion">Producción</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={soloNovedades ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSoloNovedades((s) => !s)}
            >
              <Clock className="h-4 w-4" />
              Solo con novedad
            </Button>
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {verifMostrados.length} registros
            </span>
          </div>
          <VerificacionTable rows={verifMostrados} isLoading={verifQ.isLoading} />
        </TabsContent>
      </Tabs>
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
