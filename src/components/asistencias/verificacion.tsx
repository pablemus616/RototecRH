import {
  Check,
  CheckCircle2,
  Clock,
  Factory,
  Hammer,
  ListChecks,
  LogOut,
  type LucideIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatDate, parseHora } from '@/lib/utils'
import type { TipoTurnoVerificacion, VerificacionAsistencia } from '@/types'

// =====================================================
// Helpers
// =====================================================
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function diaSemanaCorto(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return DIAS_SEMANA[d.getDay()]
}

function fmtMin(n: number): string {
  const m = Math.abs(Math.round(n))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

function diffMin(aHHMM: string | null, bHHMM: string | null): number | null {
  if (!aHHMM || !bHHMM) return null
  const a = parseHora(aHHMM)
  const b = parseHora(bHHMM)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return b - a
}

export interface EstadoVerif {
  aTiempo: boolean
  tarde: boolean
  temprano: boolean
  retrasoMin: number | null // minutos de retraso en la entrada
  tempranoMin: number | null // minutos de adelanto en la salida
}

export function estadoVerif(v: VerificacionAsistencia): EstadoVerif {
  return {
    aTiempo: !v.llegoTarde && !v.salioTemprano,
    tarde: v.llegoTarde,
    temprano: v.salioTemprano,
    retrasoMin: v.llegoTarde
      ? diffMin(v.horaEntradaProgramada, v.horaEntradaReal)
      : null,
    tempranoMin: v.salioTemprano
      ? diffMin(v.horaSalida, v.horaSalidaProgramada)
      : null,
  }
}

// =====================================================
// Badges
// =====================================================
export function TipoBadge({ tipo }: { tipo: TipoTurnoVerificacion }) {
  return tipo === 'acabados' ? (
    <Badge className="gap-1 border-transparent bg-sky-100 text-sky-800 hover:bg-sky-100">
      <Hammer className="h-3 w-3" />
      Acabados
    </Badge>
  ) : (
    <Badge className="gap-1 border-transparent bg-violet-100 text-violet-800 hover:bg-violet-100">
      <Factory className="h-3 w-3" />
      Producción
    </Badge>
  )
}

function EstadoBadges({ estado }: { estado: EstadoVerif }) {
  if (estado.aTiempo) {
    return (
      <Badge variant="success" className="gap-1">
        <Check className="h-3 w-3" />
        A tiempo
      </Badge>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {estado.tarde && (
        <Badge className="gap-1 border-transparent bg-rose-100 text-rose-700 hover:bg-rose-100">
          <Clock className="h-3 w-3" />
          Tarde
          {estado.retrasoMin != null && ` +${fmtMin(estado.retrasoMin)}`}
        </Badge>
      )}
      {estado.temprano && (
        <Badge variant="warning" className="gap-1">
          <LogOut className="h-3 w-3" />
          Salió temprano
          {estado.tempranoMin != null && ` −${fmtMin(estado.tempranoMin)}`}
        </Badge>
      )}
    </div>
  )
}

// Celda "programada → real". La hora real se resalta en rojo cuando hay novedad.
function HoraCell({
  programada,
  real,
  problema,
}: {
  programada: string | null
  real: string | null
  problema: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 tabular-nums">
      <span className="text-xs text-muted-foreground">{programada ?? '—'}</span>
      <span className="text-muted-foreground/50">→</span>
      <span
        className={cn(
          'text-sm font-semibold',
          real == null
            ? 'text-muted-foreground'
            : problema
              ? 'text-rose-600'
              : 'text-foreground',
        )}
      >
        {real ?? '—'}
      </span>
    </div>
  )
}

// =====================================================
// Resumen (chips)
// =====================================================
type Tono = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet'

const TONO_ICON: Record<Tono, string> = {
  neutral: 'text-foreground',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  info: 'text-sky-600',
  violet: 'text-violet-600',
}

const TONO_BG: Record<Tono, string> = {
  neutral: 'bg-muted',
  success: 'bg-emerald-50',
  warning: 'bg-amber-50',
  danger: 'bg-rose-50',
  info: 'bg-sky-50',
  violet: 'bg-violet-50',
}

function StatChip({
  icon: Icon,
  label,
  value,
  tono,
}: {
  icon: LucideIcon
  label: string
  value: number
  tono: Tono
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn('rounded-md p-2', TONO_BG[tono])}>
        <Icon className={cn('h-4 w-4', TONO_ICON[tono])} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function VerificacionResumen({
  rows,
  modo = 'completa',
}: {
  rows: VerificacionAsistencia[]
  modo?: 'completa' | 'novedades'
}) {
  const total = rows.length
  const tarde = rows.filter((r) => r.llegoTarde).length
  const temprano = rows.filter((r) => r.salioTemprano).length

  if (modo === 'novedades') {
    return (
      <div className="grid grid-cols-3 gap-3 duration-300 animate-in fade-in-50">
        <StatChip icon={ListChecks} label="Con novedad" value={total} tono="neutral" />
        <StatChip icon={Clock} label="Llegó tarde" value={tarde} tono="danger" />
        <StatChip icon={LogOut} label="Salió temprano" value={temprano} tono="warning" />
      </div>
    )
  }

  const aTiempo = rows.filter((r) => !r.llegoTarde && !r.salioTemprano).length
  const acabados = rows.filter((r) => r.tipo === 'acabados').length
  const produccion = rows.filter((r) => r.tipo === 'produccion').length

  return (
    <div className="grid grid-cols-2 gap-3 duration-300 animate-in fade-in-50 sm:grid-cols-3 lg:grid-cols-6">
      <StatChip icon={ListChecks} label="Registros" value={total} tono="neutral" />
      <StatChip icon={CheckCircle2} label="A tiempo" value={aTiempo} tono="success" />
      <StatChip icon={Clock} label="Llegó tarde" value={tarde} tono="danger" />
      <StatChip icon={LogOut} label="Salió temprano" value={temprano} tono="warning" />
      <StatChip icon={Hammer} label="Acabados" value={acabados} tono="info" />
      <StatChip icon={Factory} label="Producción" value={produccion} tono="violet" />
    </div>
  )
}

// =====================================================
// Tabla
// =====================================================
function VerifRow({ v }: { v: VerificacionAsistencia }) {
  const estado = estadoVerif(v)
  return (
    <TableRow
      className={cn(
        estado.tarde && 'bg-rose-50/50 hover:bg-rose-50',
        !estado.tarde && estado.temprano && 'bg-amber-50/50 hover:bg-amber-50',
      )}
    >
      <TableCell className="font-medium">{v.nombre}</TableCell>
      <TableCell className="tabular-nums">{formatDate(v.fecha)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {diaSemanaCorto(v.fecha)}
      </TableCell>
      <TableCell>
        <TipoBadge tipo={v.tipo} />
      </TableCell>
      <TableCell>
        <HoraCell
          programada={v.horaEntradaProgramada}
          real={v.horaEntradaReal}
          problema={v.llegoTarde}
        />
      </TableCell>
      <TableCell>
        <HoraCell
          programada={v.horaSalidaProgramada}
          real={v.horaSalida}
          problema={v.salioTemprano}
        />
      </TableCell>
      <TableCell>
        <EstadoBadges estado={estado} />
      </TableCell>
    </TableRow>
  )
}

export function VerificacionTable({
  rows,
  isLoading,
  emptyText = 'Sin registros en el período',
}: {
  rows: VerificacionAsistencia[]
  isLoading?: boolean
  emptyText?: string
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Día</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Salida</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-10 text-center text-muted-foreground"
              >
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((v, i) => (
              <VerifRow key={`${v.idEmpleado}-${v.fecha}-${v.tipo}-${i}`} v={v} />
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
