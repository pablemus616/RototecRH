import { useMemo, useState } from 'react'
import { CalendarDays, Plus, Trash2, Users } from 'lucide-react'
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
import {
  BONIFICACION_POR_TIPO,
  TIPOS_BONIFICACION,
} from '@/constants/bonificaciones'
import { useEmpleadosList } from '@/hooks/useEmpleados'
import {
  useBonificacionesPeriodo,
  useDeleteBonificacion,
} from '@/hooks/useBonificaciones'
import {
  quincenaDeHoy,
  rangoQuincena,
  type Quincena,
} from '@/lib/ausencias'
import { periodoKey } from '@/lib/planilla'
import { formatDate, formatQ, nombreParaMostrar } from '@/lib/utils'
import type { Bonificacion, TipoBonificacion } from '@/types'
import { BonificacionDialog } from './BonificacionDialog'
import { CapturaMasivaDialog } from './CapturaMasivaDialog'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type FiltroTipo = 'TODOS' | TipoBonificacion

export default function BonificacionesPage() {
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)
  const [filtroEmpleado, setFiltroEmpleado] = useState<string>('TODOS')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS')
  const [individualOpen, setIndividualOpen] = useState(false)
  const [masivaOpen, setMasivaOpen] = useState(false)

  const periodo = periodoKey(year, monthIndex, quincena)
  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleados } = useEmpleadosList()
  const { data: bonificaciones, isLoading } = useBonificacionesPeriodo(periodo)

  const empleadosById = useMemo(() => {
    const m = new Map<string, NonNullable<typeof empleados>[number]>()
    for (const e of empleados ?? []) m.set(e.id, e)
    return m
  }, [empleados])

  const empleadosActivos = useMemo(() => {
    return (empleados ?? [])
      .filter((e) => e.estado === 'ACTIVO')
      .sort((a, b) => nombreParaMostrar(a).localeCompare(nombreParaMostrar(b)))
  }, [empleados])

  const filtradas = useMemo(() => {
    let list = bonificaciones ?? []
    if (filtroEmpleado !== 'TODOS') {
      list = list.filter((b) => b.empleadoId === filtroEmpleado)
    }
    if (filtroTipo !== 'TODOS') {
      list = list.filter((b) => b.tipo === filtroTipo)
    }
    return list
  }, [bonificaciones, filtroEmpleado, filtroTipo])

  const totalPeriodo = useMemo(
    () => filtradas.reduce((acc, b) => acc + b.monto, 0),
    [filtradas],
  )

  const years = [year - 1, year, year + 1]

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <Selector label="Año" value={String(year)} onChange={(v) => setYear(Number(v))} width="w-24">
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </Selector>
            <Selector label="Mes" value={String(monthIndex)} onChange={(v) => setMonthIndex(Number(v))} width="w-36">
              {MESES.map((m, i) => (
                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
              ))}
            </Selector>
            <Selector label="Quincena" value={String(quincena)} onChange={(v) => setQuincena(Number(v) as Quincena)} width="w-32">
              <SelectItem value="1">1ª (1–15)</SelectItem>
              <SelectItem value="2">2ª (16–fin)</SelectItem>
            </Selector>
            <Selector
              label="Empleado"
              value={filtroEmpleado}
              onChange={setFiltroEmpleado}
              width="w-64"
            >
              <SelectItem value="TODOS">Todos</SelectItem>
              {empleadosActivos.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {nombreParaMostrar(e)}
                </SelectItem>
              ))}
            </Selector>
            <Selector
              label="Tipo"
              value={filtroTipo}
              onChange={(v) => setFiltroTipo(v as FiltroTipo)}
              width="w-56"
            >
              <SelectItem value="TODOS">Todos</SelectItem>
              {TIPOS_BONIFICACION.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </Selector>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {formatDate(rango.desde)} – {formatDate(rango.hasta)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMasivaOpen(true)}>
              <Users className="h-4 w-4" />
              Captura masiva
            </Button>
            <Button onClick={() => setIndividualOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Creada</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Sin bonificaciones en este período
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((b) => (
                <BonificacionRow
                  key={b.id}
                  bonificacion={b}
                  nombre={
                    empleadosById.get(b.empleadoId)
                      ? nombreParaMostrar(empleadosById.get(b.empleadoId)!)
                      : 'Empleado eliminado'
                  }
                />
              ))
            )}
            {filtradas.length > 0 && (
              <TableRow className="border-t-2 bg-muted/40 font-semibold">
                <TableCell colSpan={2}>
                  Total ({filtradas.length} bonificaciones)
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQ(totalPeriodo)}
                </TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <BonificacionDialog
        open={individualOpen}
        onOpenChange={setIndividualOpen}
        periodo={periodo}
      />
      <CapturaMasivaDialog
        open={masivaOpen}
        onOpenChange={setMasivaOpen}
        periodo={periodo}
      />
    </div>
  )
}

function BonificacionRow({
  bonificacion,
  nombre,
}: {
  bonificacion: Bonificacion
  nombre: string
}) {
  const eliminar = useDeleteBonificacion()
  const tipoDef = BONIFICACION_POR_TIPO.get(bonificacion.tipo)

  async function onDelete() {
    if (!confirm('¿Eliminar esta bonificación?')) return
    try {
      await eliminar.mutateAsync(bonificacion.id)
      toast.success('Bonificación eliminada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{nombre}</TableCell>
      <TableCell>
        <Badge variant="outline">{tipoDef?.label ?? bonificacion.tipo}</Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatQ(bonificacion.monto)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {bonificacion.descripcion || '—'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDate(bonificacion.fechaCreacion.slice(0, 10))}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={eliminar.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function Selector({
  label,
  value,
  onChange,
  width,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  width: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={width}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}
