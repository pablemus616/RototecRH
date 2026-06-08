import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CalendarDays, Check, Clock, Eye, Moon, Search, Sun, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useHorasExtra, useHorasExtraDesglose, useHorasExtraDetalle } from '@/hooks/useHorasExtra'
import { cn, nombreEmpleado } from '@/lib/utils'
import type { DesgloseSemanaHE, DetalleDiaHE, EmpleadoBackend } from '@/types'

interface Fila {
  idEmpleado: number
  nombre: string
  periodo: string
  dia: number
  noche: number
  horasEfectivas: number
  excedente: number
  sistemas: string[]
}

function hhDecimal(n: number): string {
  return n.toFixed(2)
}

export default function HorasExtraPage() {
  // Por defecto, el rango validado contra el Machote de mayo (3 semanas completas).
  const [desde, setDesde] = useState('2026-04-27')
  const [hasta, setHasta] = useState('2026-05-17')
  const [texto, setTexto] = useState('')
  const [detalle, setDetalle] = useState<{ id: number; nombre: string } | null>(null)

  const q = useHorasExtra(desde, hasta)
  const { data: empleados } = useEmpleadosBackendList()

  const empById = useMemo(() => {
    const m = new Map<number, EmpleadoBackend>()
    for (const e of empleados ?? []) m.set(e.id, e)
    return m
  }, [empleados])

  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = []
    for (const e of q.data ?? []) {
      for (const p of e.periodos) {
        // Mostrar quien tenga horas extra O un déficit (deben horas); ocultar lo neutro.
        if (p.dia <= 0 && p.noche <= 0 && p.excedente >= -0.005) continue
        const emp = empById.get(e.idEmpleado)
        const nombre = emp ? nombreEmpleado(emp) : e.nombre || `#${e.idEmpleado}`
        out.push({ idEmpleado: e.idEmpleado, nombre, ...p })
      }
    }
    const t = texto.trim().toLowerCase()
    return out
      .filter((f) => !t || f.nombre.toLowerCase().includes(t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre) || a.periodo.localeCompare(b.periodo))
  }, [q.data, texto, empById])

  const totalDia = filas.reduce((s, f) => s + f.dia, 0)
  const totalNoche = filas.reduce((s, f) => s + f.noche, 0)
  const empleadosConHE = new Set(filas.map((f) => f.idEmpleado)).size

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Empleado</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Buscar nombre"
                  className="w-64 pl-9"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span className="tabular-nums">
              Semanas lun-dom · netting quincenal
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatChip icon={Users} label="Empleados con HE" value={String(empleadosConHE)} tone="neutral" />
        <StatChip icon={Sun} label="HE diurnas (h)" value={hhDecimal(totalDia)} tone="warning" />
        <StatChip icon={Moon} label="HE nocturnas (h)" value={hhDecimal(totalNoche)} tone="info" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Sistema(s)</TableHead>
              <TableHead className="text-right">Efectivas</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">HE diurnas</TableHead>
              <TableHead className="text-right">HE nocturnas</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : q.isError ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-destructive">
                  Error al calcular horas extra. Revisa que el backend y los datos del rango existan.
                </TableCell>
              </TableRow>
            ) : filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Sin horas extra en el rango seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((f) => (
                <TableRow key={`${f.idEmpleado}-${f.periodo}`}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{f.periodo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.sistemas.join(' · ') || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{hhDecimal(f.horasEfectivas)}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      f.excedente < -0.005
                        ? 'font-semibold text-rose-600'
                        : f.excedente > 0.005
                          ? 'text-emerald-600'
                          : 'text-muted-foreground',
                    )}
                  >
                    {hhDecimal(f.excedente)}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', f.dia > 0 && 'font-semibold text-amber-600')}>
                    {hhDecimal(f.dia)}
                  </TableCell>
                  <TableCell className={cn('text-right tabular-nums', f.noche > 0 && 'font-semibold text-sky-600')}>
                    {hhDecimal(f.noche)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Ver detalle de días/sistema"
                      onClick={() => setDetalle({ id: f.idEmpleado, nombre: f.nombre })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <DetalleDialog
        desde={desde}
        hasta={hasta}
        empleado={detalle}
        onClose={() => setDetalle(null)}
      />
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: string
  tone: 'neutral' | 'warning' | 'info'
}) {
  const tones = {
    neutral: 'text-foreground bg-muted',
    warning: 'text-amber-600 bg-amber-50',
    info: 'text-sky-600 bg-sky-50',
  } as const
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <div className={cn('rounded-md p-2', tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

const DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function diaSemana(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? '' : DIAS_SEM[d.getDay()]
}
function fmtHora(h: string): string {
  return h && h !== '00:00:00' ? h.slice(0, 5) : '—'
}
function fmt2(n: number): string {
  return n.toFixed(2)
}
function mesQuincena(periodo: string): string {
  // "2026-05-Qui1" → "MAYO Qui1"
  const [, mm, qui] = periodo.split('-')
  const MESES = ['', 'ENE', 'FEB', 'MAR', 'ABR', 'MAYO', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  return `${MESES[Number(mm)] ?? mm} ${qui ?? ''}`.trim()
}
function rangoHoras(a: string | null, b: string | null): string {
  const ha = a ? fmtHora(a) : '—'
  const hb = b ? fmtHora(b) : '—'
  return ha === '—' && hb === '—' ? '—' : `${ha}–${hb}`
}
function fmtDuracion(min: number): string {
  const abs = Math.abs(Math.round(min))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

function Badge({ tone, children }: { tone: 'red' | 'amber' | 'green'; children: ReactNode }) {
  const tones = {
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-emerald-100 text-emerald-700',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

function EstadoDia({ dia, trabajado }: { dia: DetalleDiaHE; trabajado: boolean }) {
  const badges: ReactNode[] = []
  if (dia.faltaMarca)
    badges.push(
      <Badge key="fm" tone="red">
        <AlertTriangle className="h-3 w-3" /> Falta marca
      </Badge>,
    )
  if (dia.marcaSinTurno)
    badges.push(
      <Badge key="mst" tone="red">
        <AlertTriangle className="h-3 w-3" /> Marcó s/turno
      </Badge>,
    )
  if (dia.marcaFueraDeTurno)
    badges.push(
      <Badge key="mft" tone="red">
        <AlertTriangle className="h-3 w-3" /> Marca fuera de turno
      </Badge>,
    )
  if (dia.entradaTarde && dia.entradaDeltaMin != null)
    badges.push(
      <Badge key="et" tone="amber">
        <Clock className="h-3 w-3" /> Entró {fmtDuracion(dia.entradaDeltaMin)} tarde
      </Badge>,
    )
  if (dia.entradaAntes && dia.entradaDeltaMin != null)
    badges.push(
      <Badge key="ea" tone="amber">
        <Clock className="h-3 w-3" /> Entró {fmtDuracion(dia.entradaDeltaMin)} antes
      </Badge>,
    )
  if (dia.salidaTarde && dia.salidaDeltaMin != null)
    badges.push(
      <Badge key="st" tone="amber">
        <Clock className="h-3 w-3" /> Salió {fmtDuracion(dia.salidaDeltaMin)} después
      </Badge>,
    )
  if (dia.salidaTemprano && dia.salidaDeltaMin != null)
    badges.push(
      <Badge key="se" tone="amber">
        <Clock className="h-3 w-3" /> Salió {fmtDuracion(dia.salidaDeltaMin)} antes
      </Badge>,
    )
  if (badges.length === 0) {
    return trabajado ? (
      <Badge tone="green">
        <Check className="h-3 w-3" /> OK
      </Badge>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    )
  }
  return <div className="flex flex-wrap gap-1">{badges}</div>
}

function DetalleDialog({
  desde,
  hasta,
  empleado,
  onClose,
}: {
  desde: string
  hasta: string
  empleado: { id: number; nombre: string } | null
  onClose: () => void
}) {
  const desg = useHorasExtraDesglose(desde, hasta, empleado?.id ?? null)
  const det = useHorasExtraDetalle(desde, hasta, empleado?.id ?? null)

  const porPeriodo = useMemo(() => {
    const m = new Map<string, DesgloseSemanaHE[]>()
    for (const f of desg.data ?? []) {
      const arr = m.get(f.periodo) ?? []
      arr.push(f)
      m.set(f.periodo, arr)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [desg.data])

  return (
    <Dialog open={!!empleado} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Detalle — {empleado?.nombre}</DialogTitle>
          <DialogDescription>
            Cálculo por semana de la quincena ({desde} – {hasta})
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-6 overflow-auto">
          {/* Desglose por semana (réplica del Resumen del Machote, cols H-W) */}
          {desg.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : porPeriodo.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos en el rango.</p>
          ) : (
            porPeriodo.map(([periodo, filas]) => {
              const heDia = filas.reduce((s, f) => s + f.saldoDia, 0)
              const heNoche = filas.reduce((s, f) => s + f.saldoNoche, 0)
              return (
                <div key={periodo} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{mesQuincena(periodo)}</h4>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                        HE diurnas {fmt2(heDia)}
                      </span>
                      <span className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-700">
                        HE nocturnas {fmt2(heNoche)}
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                        HE totales {fmt2(heDia + heNoche)}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Semana</TableHead>
                          <TableHead className="whitespace-nowrap">Tipo</TableHead>
                          <TableHead className="whitespace-nowrap">Sistema</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Efectivas</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Ord. compl.</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Ord. divid.</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Ord. total</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Excedente</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Prop. día</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Prop. noche</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Saldo día</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Saldo noche</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filas.map((f) => (
                          <TableRow key={f.semana}>
                            <TableCell className="tabular-nums">{f.semana}</TableCell>
                            <TableCell className="text-xs capitalize text-muted-foreground">
                              {f.tipoQuincena} ({f.diasEnQuincena}d)
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">{f.sistema}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmt2(f.horasEfectivas)}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmt2(f.ordinariasCompleta)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmt2(f.ordinariasDividida)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{fmt2(f.ordinariasTotal)}</TableCell>
                            <TableCell
                              className={cn(
                                'text-right tabular-nums',
                                f.excedente > 0.005 ? 'font-medium text-emerald-600' : 'text-muted-foreground',
                              )}
                            >
                              {fmt2(f.excedente)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmt2(f.propDia)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {fmt2(f.propNoche)}
                            </TableCell>
                            <TableCell className={cn('text-right tabular-nums', f.saldoDia > 0.005 && 'font-medium text-amber-600')}>
                              {fmt2(f.saldoDia)}
                            </TableCell>
                            <TableCell className={cn('text-right tabular-nums', f.saldoNoche > 0.005 && 'font-medium text-sky-600')}>
                              {fmt2(f.saldoNoche)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Horas extra finales = suma de saldos (sin multiplicador, sin neteo) */}
                        <TableRow className="border-t-2 bg-muted/40 font-semibold">
                          <TableCell colSpan={10} className="text-right">
                            Horas extra finales · total {fmt2(heDia + heNoche)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-amber-700">{fmt2(heDia)}</TableCell>
                          <TableCell className="text-right tabular-nums text-sky-700">{fmt2(heNoche)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })
          )}

          {/* Detalle día a día (qué día trabajó qué sistema) */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Detalle día a día</h4>
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Día</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead className="text-center">Programado</TableHead>
                    <TableHead className="text-center">Biométrico</TableHead>
                    <TableHead className="text-center">Oficial</TableHead>
                    <TableHead className="text-right">Efectivas</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {det.isLoading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !det.data || det.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                        Sin datos en el rango.
                      </TableCell>
                    </TableRow>
                  ) : (
                    det.data.map((d) => {
                      const trabajado = d.tipo === 'DIA' || d.tipo === 'NOCHE'
                      const grave = d.faltaMarca || d.marcaSinTurno || d.marcaFueraDeTurno
                      const leve = d.inconsistente && !grave
                      return (
                        <TableRow
                          key={d.fecha}
                          className={cn(
                            !trabajado && 'text-muted-foreground',
                            grave && 'bg-rose-50',
                            !grave && leve && 'bg-amber-50',
                          )}
                        >
                          <TableCell className="tabular-nums">{d.fecha}</TableCell>
                          <TableCell className="text-xs">{diaSemana(d.fecha)}</TableCell>
                          <TableCell className="text-xs">{d.tipo}</TableCell>
                          <TableCell className="text-xs tabular-nums">{d.sistema}</TableCell>
                          <TableCell className="text-center text-xs tabular-nums">
                            {rangoHoras(d.turnoIngreso, d.turnoSalida)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-center text-xs tabular-nums',
                              leve && 'font-semibold text-amber-700',
                              grave && 'font-semibold text-rose-700',
                            )}
                          >
                            {rangoHoras(d.marcaIngreso, d.marcaSalida)}
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                            {rangoHoras(d.ingreso, d.egreso)}
                          </TableCell>
                          <TableCell className={cn('text-right tabular-nums', trabajado && 'font-medium')}>
                            {d.efectivas.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <EstadoDia dia={d} trabajado={trabajado} />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
