import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { useEmpleadosList } from '@/hooks/useEmpleados'
import { useAsignacionesTurnoAll, useTurnosList } from '@/hooks/useTurnos'
import { useAsistenciasPeriodo } from '@/hooks/useAsistencias'
import {
  useAtrasosPeriodo,
  useAusenciasPeriodo,
} from '@/hooks/useAusencias'
import { useBonificacionesPeriodo } from '@/hooks/useBonificaciones'
import {
  useCerrarPlanilla,
  useGenerarPlanilla,
  usePlanillaByPeriodo,
  useUpdateLineaPlanilla,
} from '@/hooks/usePlanilla'
import { quincenaDeHoy, rangoQuincena, type Quincena } from '@/lib/ausencias'
import { exportarPlanillaExcel } from '@/lib/exportPlanilla'
import { periodoKey } from '@/lib/planilla'
import { formatDate, formatQ } from '@/lib/utils'
import type { LineaInputManual, LineaPlanilla } from '@/types'
import { EditableCell } from './EditableCell'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function PlanillaPage() {
  const hoy = quincenaDeHoy()
  const [year, setYear] = useState<number>(hoy.year)
  const [monthIndex, setMonthIndex] = useState<number>(hoy.monthIndex)
  const [quincena, setQuincena] = useState<Quincena>(hoy.num)

  const periodo = periodoKey(year, monthIndex, quincena)
  const rango = useMemo(
    () => rangoQuincena(year, monthIndex, quincena),
    [year, monthIndex, quincena],
  )

  const { data: empleados } = useEmpleadosList()
  const { data: turnos } = useTurnosList()
  const { data: asignaciones } = useAsignacionesTurnoAll()
  const { data: asistencias } = useAsistenciasPeriodo(rango.desde, rango.hasta)
  const { data: ausencias } = useAusenciasPeriodo(rango.desde, rango.hasta)
  const { data: atrasos } = useAtrasosPeriodo(rango.desde, rango.hasta)
  const { data: bonificaciones } = useBonificacionesPeriodo(periodo)
  const planillaQ = usePlanillaByPeriodo(periodo)

  const generar = useGenerarPlanilla()
  const actualizarLinea = useUpdateLineaPlanilla(periodo)
  const cerrar = useCerrarPlanilla(periodo)

  const planilla = planillaQ.data
  const editable = planilla?.estado === 'BORRADOR'

  async function onGenerar() {
    if (!empleados || !turnos || !asignaciones) {
      toast.error('Cargando datos, espera un momento')
      return
    }
    try {
      await generar.mutateAsync({
        empleados,
        turnos,
        asignaciones,
        asistencias: asistencias ?? [],
        ausencias: ausencias ?? [],
        atrasos: atrasos ?? [],
        bonificaciones: bonificaciones ?? [],
        desde: rango.desde,
        hasta: rango.hasta,
        periodo,
      })
      toast.success(planilla ? 'Planilla regenerada' : 'Planilla generada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  async function onCerrar() {
    if (!confirm('Cerrar planilla la deja inmutable. ¿Continuar?')) return
    try {
      await cerrar.mutateAsync()
      toast.success('Planilla cerrada')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  function onExportar() {
    if (!planilla) return
    try {
      exportarPlanillaExcel(planilla)
      toast.success('Excel descargado')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al exportar'
      toast.error(msg)
    }
  }

  function onChangeLinea(empleadoId: string, parche: Partial<LineaInputManual>) {
    actualizarLinea.mutate(
      { empleadoId, parche },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : 'Error'
          toast.error(msg)
        },
      },
    )
  }

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
            <Selector
              label="Mes"
              value={String(monthIndex)}
              onChange={(v) => setMonthIndex(Number(v))}
              width="w-36"
            >
              {MESES.map((m, i) => (
                <SelectItem key={m} value={String(i)}>{m}</SelectItem>
              ))}
            </Selector>
            <Selector
              label="Quincena"
              value={String(quincena)}
              onChange={(v) => setQuincena(Number(v) as Quincena)}
              width="w-32"
            >
              <SelectItem value="1">1ª (1–15)</SelectItem>
              <SelectItem value="2">2ª (16–fin)</SelectItem>
            </Selector>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span className="tabular-nums">
                {formatDate(rango.desde)} – {formatDate(rango.hasta)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {planilla && (
              <Badge variant={planilla.estado === 'BORRADOR' ? 'warning' : 'success'}>
                {planilla.estado === 'BORRADOR' ? 'Borrador' : 'Cerrada'}
              </Badge>
            )}
            {planilla && (
              <Button variant="outline" onClick={onExportar}>
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
            )}
            {planilla && editable && (
              <Button
                variant="outline"
                onClick={onGenerar}
                disabled={generar.isPending}
                title="Regenerar borra los inputs manuales del período"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </Button>
            )}
            {planilla && editable && (
              <Button
                variant="destructive"
                onClick={onCerrar}
                disabled={cerrar.isPending}
              >
                <Lock className="h-4 w-4" />
                Cerrar planilla
              </Button>
            )}
          </div>
        </div>
      </Card>

      {planillaQ.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !planilla ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hay planilla para esta quincena.
          </p>
          <Button onClick={onGenerar} disabled={generar.isPending}>
            {generar.isPending ? 'Generando…' : 'Generar Planilla'}
          </Button>
        </Card>
      ) : (
        <>
          {!editable && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertTitle>Planilla cerrada</AlertTitle>
              <AlertDescription>
                Esta planilla está cerrada (
                {planilla.fechaCierre ? formatDate(planilla.fechaCierre) : 'sin fecha'}
                ). Los valores son inmutables. Solo se puede exportar.
              </AlertDescription>
            </Alert>
          )}

          <Card className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-background min-w-[180px]">
                    Empleado
                  </TableHead>
                  <TableHead className="text-right">Sueldo perc.</TableHead>
                  <TableHead className="text-right">Bonif.</TableHead>
                  <TableHead className="text-right" colSpan={2}>HE Diurnas</TableHead>
                  <TableHead className="text-right" colSpan={2}>HE Nocturnas</TableHead>
                  <TableHead className="text-right">Bono Prod.</TableHead>
                  <TableHead className="text-right">Bono Extr.</TableHead>
                  <TableHead className="text-right">Otros ing.</TableHead>
                  <TableHead className="text-right">T. Ingresos</TableHead>
                  <TableHead className="text-right">IGSS</TableHead>
                  <TableHead className="text-right">ISR</TableHead>
                  <TableHead className="text-right">Anticipo</TableHead>
                  <TableHead className="text-right">Desc1</TableHead>
                  <TableHead className="text-right">Desc2</TableHead>
                  <TableHead className="text-right">Embargos</TableHead>
                  <TableHead className="text-right">T. Desc.</TableHead>
                  <TableHead className="text-right font-semibold">Líquido</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-background"></TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                  <TableHead className="text-right text-[10px] text-muted-foreground">h</TableHead>
                  <TableHead className="text-right text-[10px] text-muted-foreground">Q</TableHead>
                  <TableHead className="text-right text-[10px] text-muted-foreground">h</TableHead>
                  <TableHead className="text-right text-[10px] text-muted-foreground">Q</TableHead>
                  <TableHead colSpan={11}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planilla.lineas.map((l) => (
                  <LineaRow
                    key={l.empleadoId}
                    linea={l}
                    editable={editable}
                    onChange={(parche) => onChangeLinea(l.empleadoId, parche)}
                  />
                ))}
                <TableRow className="border-t-2 bg-muted/50 font-semibold">
                  <TableCell className="sticky left-0 z-10 bg-muted/50">
                    Totales · {planilla.totales.cantidadEmpleados} empleados
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQ(planilla.totales.totalSueldoPercibido)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQ(planilla.totales.totalBonificacionIncentivo)}
                  </TableCell>
                  <TableCell colSpan={4} className="text-right tabular-nums">
                    HE total: {formatQ(planilla.totales.totalHorasExtras)}
                  </TableCell>
                  <TableCell colSpan={3} className="text-right tabular-nums">
                    Bonos: {formatQ(planilla.totales.totalBonos)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQ(planilla.totales.totalIngresos)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQ(planilla.totales.totalIGSSLaboral)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQ(planilla.totales.totalISR)}
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQ(planilla.totales.totalDescuentos)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQ(planilla.totales.totalLiquido)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">Provisiones (Contabilidad)</p>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Stat label="IGSS Patronal (12.67%)" value={formatQ(planilla.totales.totalIGSSPatronal)} />
              <Stat label="INTECAP (1%)" value={formatQ(planilla.totales.totalIntecap)} />
              <Stat label="IRTRA (1%)" value={formatQ(planilla.totales.totalIrtra)} />
              <Stat label="Aguinaldo" value={formatQ(planilla.totales.totalAguinaldo)} />
            </div>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Notas</AlertTitle>
            <AlertDescription className="text-xs">
              ISR calculado con régimen opcional simplificado (5% sobre Q0–300k anual,
              7% excedente, exención Q48k). Editable por línea si tu contador requiere otro
              cálculo. Encriptados IGSS y pre-boletas individuales se entregan en
              fases posteriores cuando llegue el formato exacto del cliente.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="tabular-nums text-sm font-semibold">{value}</p>
    </div>
  )
}

function LineaRow({
  linea,
  editable,
  onChange,
}: {
  linea: LineaPlanilla
  editable: boolean
  onChange: (parche: Partial<LineaInputManual>) => void
}) {
  const snap = linea.empleadoSnapshot
  const cellNum = 'text-right tabular-nums'
  return (
    <TableRow>
      <TableCell className="sticky left-0 z-10 bg-background">
        <div className="min-w-[180px]">
          <p className="font-medium">{snap.nombreCompleto}</p>
          <p className="text-[10px] text-muted-foreground">
            {snap.puesto} · {snap.departamento}
          </p>
          {linea.ausenciasDias > 0 && (
            <p className="text-[10px] text-amber-700">
              {linea.diasAPagar}/{linea.diasDelMes} días ({linea.ausenciasDias} desc.)
            </p>
          )}
        </div>
      </TableCell>
      <TableCell className={cellNum}>{formatQ(linea.sueldoPercibido)}</TableCell>
      <TableCell className={cellNum}>{formatQ(linea.bonificacionIncentivo)}</TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.heSimplesDiurnas}
          onCommit={(n) => onChange({ heSimplesDiurnas: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>{formatQ(linea.ingresoHorasDiurnas)}</TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.heSimplesNocturnas}
          onCommit={(n) => onChange({ heSimplesNocturnas: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>{formatQ(linea.ingresoHorasNocturnas)}</TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.bonoProductividadAcabados}
          onCommit={(n) => onChange({ bonoProductividadAcabados: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.bonoExtraordinario}
          onCommit={(n) => onChange({ bonoExtraordinario: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.otrosIngresos}
          onCommit={(n) => onChange({ otrosIngresos: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>{formatQ(linea.totalIngresos)}</TableCell>
      <TableCell className={cellNum}>{formatQ(linea.igssLaboral)}</TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.isrOverride ?? linea.isr}
          onCommit={(n) => onChange({ isrOverride: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.anticipoQuincenal}
          onCommit={(n) => onChange({ anticipoQuincenal: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.descuento1}
          onCommit={(n) => onChange({ descuento1: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.descuento2}
          onCommit={(n) => onChange({ descuento2: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>
        <EditableCell
          initial={linea.embargos}
          onCommit={(n) => onChange({ embargos: n })}
          disabled={!editable}
        />
      </TableCell>
      <TableCell className={cellNum}>{formatQ(linea.totalDescuentos)}</TableCell>
      <TableCell className={`${cellNum} font-semibold`}>
        {formatQ(linea.liquidoRecibir)}
      </TableCell>
    </TableRow>
  )
}
