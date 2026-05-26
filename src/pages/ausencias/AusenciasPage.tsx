import { useMemo, useState } from 'react'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { REGLA_POR_TIPO } from '@/constants/ausencias'
import { useEmpleadosList } from '@/hooks/useEmpleados'
import {
  useAtrasosPeriodo,
  useAusenciasPeriodo,
  useDeleteAtraso,
  useDeleteAusencia,
} from '@/hooks/useAusencias'
import { minutosAHHMM, quincenaDeHoy, rangoQuincena, type Quincena } from '@/lib/ausencias'
import { formatDate, nombreParaMostrar } from '@/lib/utils'
import type { Atraso, Ausencia } from '@/types'
import { AtrasoFormDialog } from './AtrasoFormDialog'
import { AusenciaFormDialog } from './AusenciaFormDialog'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function diaSemanaCorto(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return DIAS_SEMANA[d.getDay()]
}

export default function AusenciasPage() {
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)
  const [empleadoFiltro, setEmpleadoFiltro] = useState<string>('TODOS')
  const [tab, setTab] = useState<'ausencias' | 'atrasos'>('ausencias')
  const [ausenciaOpen, setAusenciaOpen] = useState(false)
  const [atrasoOpen, setAtrasoOpen] = useState(false)

  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleados } = useEmpleadosList()
  const ausenciasQ = useAusenciasPeriodo(rango.desde, rango.hasta)
  const atrasosQ = useAtrasosPeriodo(rango.desde, rango.hasta)

  const empleadosById = useMemo(() => {
    const m = new Map<string, NonNullable<typeof empleados>[number]>()
    for (const e of empleados ?? []) m.set(e.id, e)
    return m
  }, [empleados])

  const ausenciasFiltradas = useMemo(() => {
    const all = ausenciasQ.data ?? []
    const f = empleadoFiltro === 'TODOS' ? all : all.filter((a) => a.empleadoId === empleadoFiltro)
    return f.sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [ausenciasQ.data, empleadoFiltro])

  const atrasosFiltrados = useMemo(() => {
    const all = atrasosQ.data ?? []
    const f = empleadoFiltro === 'TODOS' ? all : all.filter((a) => a.empleadoId === empleadoFiltro)
    return f.sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [atrasosQ.data, empleadoFiltro])

  const empleadosActivos = useMemo(() => {
    return (empleados ?? [])
      .filter((e) => e.estado === 'ACTIVO')
      .sort((a, b) => nombreParaMostrar(a).localeCompare(nombreParaMostrar(b)))
  }, [empleados])

  const years = [year - 1, year, year + 1]

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
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Empleado
              </label>
              <Select value={empleadoFiltro} onValueChange={setEmpleadoFiltro}>
                <SelectTrigger className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {empleadosActivos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {nombreParaMostrar(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span className="tabular-nums">
              {formatDate(rango.desde)} – {formatDate(rango.hasta)}
            </span>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'ausencias' | 'atrasos')}>
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="ausencias">
              Ausencias{' '}
              <span className="ml-2 rounded bg-muted px-1.5 text-xs">
                {ausenciasFiltradas.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="atrasos">
              Atrasos{' '}
              <span className="ml-2 rounded bg-muted px-1.5 text-xs">
                {atrasosFiltrados.length}
              </span>
            </TabsTrigger>
          </TabsList>
          {tab === 'ausencias' ? (
            <Button onClick={() => setAusenciaOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar ausencia
            </Button>
          ) : (
            <Button onClick={() => setAtrasoOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar atraso
            </Button>
          )}
        </div>

        <TabsContent value="ausencias" className="mt-3">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Constancia</TableHead>
                  <TableHead className="text-right">Días desc.</TableHead>
                  <TableHead>Séptimo</TableHead>
                  <TableHead>IGSS</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ausenciasQ.isLoading ? (
                  <SkeletonRows colSpan={9} />
                ) : ausenciasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      Sin ausencias en el período
                    </TableCell>
                  </TableRow>
                ) : (
                  ausenciasFiltradas.map((a) => (
                    <AusenciaRow
                      key={a.id}
                      ausencia={a}
                      nombre={
                        empleadosById.get(a.empleadoId)
                          ? nombreParaMostrar(empleadosById.get(a.empleadoId)!)
                          : 'Empleado eliminado'
                      }
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="atrasos" className="mt-3">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="text-right">Retraso</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atrasosQ.isLoading ? (
                  <SkeletonRows colSpan={8} />
                ) : atrasosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Sin atrasos en el período
                    </TableCell>
                  </TableRow>
                ) : (
                  atrasosFiltrados.map((a) => (
                    <AtrasoRow
                      key={a.id}
                      atraso={a}
                      nombre={
                        empleadosById.get(a.empleadoId)
                          ? nombreParaMostrar(empleadosById.get(a.empleadoId)!)
                          : 'Empleado eliminado'
                      }
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <AusenciaFormDialog open={ausenciaOpen} onOpenChange={setAusenciaOpen} />
      <AtrasoFormDialog open={atrasoOpen} onOpenChange={setAtrasoOpen} />
    </div>
  )
}

function SkeletonRows({ colSpan }: { colSpan: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function AusenciaRow({ ausencia, nombre }: { ausencia: Ausencia; nombre: string }) {
  const regla = REGLA_POR_TIPO.get(ausencia.tipoAusencia)
  const eliminar = useDeleteAusencia()

  async function onDelete() {
    if (!confirm('¿Eliminar esta ausencia?')) return
    try {
      await eliminar.mutateAsync(ausencia.id)
      toast.success('Ausencia eliminada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  return (
    <TableRow>
      <TableCell className="tabular-nums">{formatDate(ausencia.fecha)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {diaSemanaCorto(ausencia.fecha)}
      </TableCell>
      <TableCell className="font-medium">{nombre}</TableCell>
      <TableCell>{regla?.label ?? ausencia.tipoAusencia}</TableCell>
      <TableCell>
        {ausencia.presentoConstancia ? (
          <Badge variant="success">Sí</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {ausencia.diasDescontados}
      </TableCell>
      <TableCell>
        {ausencia.descontarSeptimo ? (
          <Badge variant="warning">Sí</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {ausencia.pagaIGSS ? (
          <Badge variant="outline">IGSS paga</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={eliminar.isPending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function AtrasoRow({ atraso, nombre }: { atraso: Atraso; nombre: string }) {
  const eliminar = useDeleteAtraso()

  async function onDelete() {
    if (!confirm('¿Eliminar este atraso?')) return
    try {
      await eliminar.mutateAsync(atraso.id)
      toast.success('Atraso eliminado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  return (
    <TableRow>
      <TableCell className="tabular-nums">{formatDate(atraso.fecha)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {diaSemanaCorto(atraso.fecha)}
      </TableCell>
      <TableCell className="font-medium">{nombre}</TableCell>
      <TableCell className="tabular-nums">{atraso.horaEntradaReal}</TableCell>
      <TableCell className="tabular-nums">{atraso.horaSalidaReal}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {atraso.turnoDescripcion ?? '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {minutosAHHMM(atraso.minutosRetraso)}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={eliminar.isPending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
