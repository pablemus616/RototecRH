import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Cog,
  Loader2,
  ListChecks,
  Moon,
  Palmtree,
  Search,
  Sun,
  Target,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PreviewTurnos, PreviewFilaTurno } from '@/types'

type Estado = 'ok' | 'aviso' | 'error'
type FiltroEstado = 'TODOS' | Estado
type FiltroTipo = 'TODOS' | 'DIA' | 'NOCHE' | 'DESCANSO' | 'ASUETO'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function estadoDe(f: PreviewFilaTurno): Estado {
  if (f.errores.length) return 'error'
  if (f.avisos.length) return 'aviso'
  return 'ok'
}
function diaDe(fecha: string): string {
  return DIAS[new Date(fecha + 'T00:00:00Z').getUTCDay()] ?? ''
}
function fmtHora(h: string | null): string {
  return h ? h.slice(0, 5) : '—'
}
function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}
function fmtMeta(min: number | null): string {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// ── Nombre "APELLIDOS — Nombres" ──────────────────────────────────────────────
function Nombre({ nombre }: { nombre: string }) {
  const i = nombre.indexOf(' - ')
  if (i === -1) return <span className="font-semibold">{nombre}</span>
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold tracking-tight">{nombre.slice(0, i)}</span>
      <span className="text-muted-foreground"> — {nombre.slice(i + 3)}</span>
    </span>
  )
}

// ── Badge de tipo de turno ────────────────────────────────────────────────────
const TIPO_META: Record<string, { label: string; cls: string; Icon: typeof Sun }> = {
  DIA: { label: 'Día', cls: 'bg-amber-100 text-amber-700 ring-amber-200', Icon: Sun },
  NOCHE: { label: 'Noche', cls: 'bg-indigo-100 text-indigo-700 ring-indigo-200', Icon: Moon },
  DESCANSO: { label: 'Descanso', cls: 'bg-slate-100 text-slate-600 ring-slate-200', Icon: Coffee },
  ASUETO: { label: 'Asueto', cls: 'bg-violet-100 text-violet-700 ring-violet-200', Icon: Palmtree },
}
function TipoBadge({ tipo }: { tipo: string }) {
  const m = TIPO_META[tipo] ?? { label: tipo, cls: 'bg-muted text-muted-foreground ring-border', Icon: Clock }
  const { Icon } = m
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', m.cls)}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  )
}

// ── Chip de estado (también filtra) ──────────────────────────────────────────
function StatChip({
  Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  Icon: typeof Users
  label: string
  value: number
  tone: 'neutral' | 'ok' | 'aviso' | 'error'
  active: boolean
  onClick: () => void
}) {
  const tones = {
    neutral: { ring: 'ring-border', icon: 'text-muted-foreground', on: 'bg-foreground text-background ring-foreground' },
    ok: { ring: 'ring-emerald-200', icon: 'text-emerald-600', on: 'bg-emerald-600 text-white ring-emerald-600' },
    aviso: { ring: 'ring-amber-200', icon: 'text-amber-600', on: 'bg-amber-500 text-white ring-amber-500' },
    error: { ring: 'ring-rose-200', icon: 'text-rose-600', on: 'bg-rose-600 text-white ring-rose-600' },
  }[tone]
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Filtrar por ${label}`}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 rounded-xl px-3 py-2 text-left ring-1 transition-all',
        active ? cn(tones.on, 'shadow-sm') : cn('bg-card hover:bg-muted/60', tones.ring),
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-current opacity-90' : tones.icon)} />
      <div className="leading-none">
        <div className="text-base font-semibold tabular-nums">{value}</div>
        <div className={cn('mt-0.5 text-[10px] uppercase tracking-wide', active ? 'opacity-80' : 'text-muted-foreground')}>{label}</div>
      </div>
    </button>
  )
}

// ── Filtro segmentado de tipo ─────────────────────────────────────────────────
function TipoFilter({
  value,
  onChange,
  counts,
}: {
  value: FiltroTipo
  onChange: (v: FiltroTipo) => void
  counts: Record<FiltroTipo, number>
}) {
  const opts: { key: FiltroTipo; label: string; dot?: string; on: string }[] = [
    { key: 'TODOS', label: 'Todos', on: 'bg-foreground text-background' },
    { key: 'DIA', label: 'Día', dot: 'bg-amber-400', on: 'bg-amber-500 text-white' },
    { key: 'NOCHE', label: 'Noche', dot: 'bg-indigo-400', on: 'bg-indigo-600 text-white' },
    { key: 'DESCANSO', label: 'Descanso', dot: 'bg-slate-400', on: 'bg-slate-600 text-white' },
    { key: 'ASUETO', label: 'Asueto', dot: 'bg-violet-400', on: 'bg-violet-600 text-white' },
  ]
  return (
    <div role="group" aria-label="Filtrar por tipo de turno" className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {opts.map((o) => {
        const on = value === o.key
        if (o.key !== 'TODOS' && counts[o.key] === 0) return null
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.key)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all',
              on ? cn(o.on, 'shadow-sm') : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            {o.dot && <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-white' : o.dot)} />}
            {o.label}
            <span className={cn('tabular-nums', on ? 'opacity-90' : 'opacity-50')}>{counts[o.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

export interface PreviewTurnosDialogProps {
  open: boolean
  preview: PreviewTurnos | null
  area: 1 | 2
  desde: string
  hasta: string
  aplicando: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function PreviewTurnosDialog({
  open,
  preview,
  area,
  desde,
  hasta,
  aplicando,
  onCancel,
  onConfirm,
}: PreviewTurnosDialogProps) {
  const [texto, setTexto] = useState('')
  const [fEstado, setFEstado] = useState<FiltroEstado>('TODOS')
  const [fTipo, setFTipo] = useState<FiltroTipo>('TODOS')
  const theadRef = useRef<HTMLTableSectionElement>(null)
  const [theadH, setTheadH] = useState(37) // alto real del thead sticky (medido) → offset del header de grupo

  const acabados = area === 1
  const filas = preview?.filas ?? []

  const conteos = useMemo(() => {
    const est = { ok: 0, aviso: 0, error: 0 }
    const tip: Record<FiltroTipo, number> = { TODOS: filas.length, DIA: 0, NOCHE: 0, DESCANSO: 0, ASUETO: 0 }
    for (const f of filas) {
      est[estadoDe(f)]++
      if (f.tipo in tip) tip[f.tipo as FiltroTipo]++
    }
    return { est, tip }
  }, [filas])

  const grupos = useMemo(() => {
    const q = norm(texto.trim())
    const visibles = filas.filter(
      (f) =>
        (fEstado === 'TODOS' || estadoDe(f) === fEstado) &&
        (fTipo === 'TODOS' || f.tipo === fTipo) &&
        (!q || norm(f.nombre).includes(q)),
    )
    const map = new Map<number, { idEmpleado: number; nombre: string; equipo: number | null; filas: PreviewFilaTurno[] }>()
    for (const f of visibles) {
      const g = map.get(f.idEmpleado) ?? { idEmpleado: f.idEmpleado, nombre: f.nombre, equipo: null, filas: [] }
      if (g.equipo == null && f.equipo != null) g.equipo = f.equipo
      g.filas.push(f)
      map.set(f.idEmpleado, g)
    }
    return [...map.values()]
      .map((g) => ({ ...g, filas: g.filas.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [filas, texto, fEstado, fTipo])

  // Mide el alto real del thead sticky para anclar los headers de grupo justo debajo (sin valor mágico).
  useLayoutEffect(() => {
    const el = theadRef.current
    if (!el) return
    const measure = () => setTheadH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [grupos.length, acabados, open])

  const visiblesCount = grupos.reduce((n, g) => n + g.filas.length, 0)
  // Fecha, Tipo, Horario, [Meta acabados | Turno+Máquina máquinas], Sistema, Estado
  const cols = acabados ? 6 : 7
  const trabajados = conteos.tip.DIA + conteos.tip.NOCHE
  const bloqueado = (preview?.totalErrores ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        {/* Encabezado */}
        <DialogHeader className="space-y-0 border-b px-6 pb-4 pt-6 text-left">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold',
                acabados ? 'bg-violet-100 text-violet-700' : 'bg-teal-100 text-teal-700',
              )}
            >
              {acabados ? <Target className="h-3.5 w-3.5" /> : <Cog className="h-3.5 w-3.5" />}
              {acabados ? 'Acabados' : 'Máquinas'}
            </span>
            <DialogTitle className="text-lg">Revisar carga de turnos</DialogTitle>
          </div>
          <DialogDescription className="mt-1">
            Período <b className="text-foreground">{desde}</b> – <b className="text-foreground">{hasta}</b> · {filas.length} filas ·
            revisa antes de aplicar.
          </DialogDescription>

          {/* Chips de estado (filtran) */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip
              Icon={ListChecks}
              label="Total"
              value={filas.length}
              tone="neutral"
              active={fEstado === 'TODOS'}
              onClick={() => setFEstado('TODOS')}
            />
            <StatChip
              Icon={CheckCircle2}
              label="OK"
              value={conteos.est.ok}
              tone="ok"
              active={fEstado === 'ok'}
              onClick={() => setFEstado(fEstado === 'ok' ? 'TODOS' : 'ok')}
            />
            <StatChip
              Icon={AlertTriangle}
              label="Avisos"
              value={conteos.est.aviso}
              tone="aviso"
              active={fEstado === 'aviso'}
              onClick={() => setFEstado(fEstado === 'aviso' ? 'TODOS' : 'aviso')}
            />
            <StatChip
              Icon={XCircle}
              label="Errores"
              value={conteos.est.error}
              tone="error"
              active={fEstado === 'error'}
              onClick={() => setFEstado(fEstado === 'error' ? 'TODOS' : 'error')}
            />
          </div>
        </DialogHeader>

        {/* Toolbar: búsqueda + filtro de tipo */}
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar empleado…"
              className="h-9 w-64 bg-background pl-9 pr-8"
            />
            {texto && (
              <button
                type="button"
                onClick={() => setTexto('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <TipoFilter value={fTipo} onChange={setFTipo} counts={conteos.tip} />
          <span className="ml-auto text-xs text-muted-foreground">
            {visiblesCount} de {filas.length} · {grupos.length} empleado{grupos.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-auto">
          {grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
              <Search className="h-8 w-8 opacity-40" />
              <p className="text-sm">Sin filas para estos filtros.</p>
              <button
                type="button"
                onClick={() => {
                  setTexto('')
                  setFEstado('TODOS')
                  setFTipo('TODOS')
                }}
                className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead ref={theadRef} className="sticky top-0 z-10">
                <tr className="bg-background/95 backdrop-blur [&>th]:border-b [&>th]:px-4 [&>th]:py-2 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                  <th className="w-32">Fecha</th>
                  <th className="w-28">Tipo</th>
                  <th className="w-28">Horario</th>
                  {acabados && <th className="w-24">Meta</th>}
                  {!acabados && <th className="w-16">Turno</th>}
                  {!acabados && <th className="w-24">Máquina</th>}
                  <th className="w-20">Sistema</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => {
                  const dias = g.filas.filter((f) => f.tipo === 'DIA' || f.tipo === 'NOCHE').length
                  const metaTotal = g.filas.reduce((n, f) => n + (f.metaDia ?? 0), 0)
                  const gErr = g.filas.some((f) => f.errores.length)
                  const gAvi = g.filas.some((f) => f.avisos.length)
                  return (
                    <FragmentGroup
                      key={g.idEmpleado}
                      nombre={g.nombre}
                      equipo={g.equipo}
                      acabados={acabados}
                      dias={dias}
                      metaTotal={metaTotal}
                      gErr={gErr}
                      gAvi={gAvi}
                      cols={cols}
                      stickyTop={theadH}
                      filas={g.filas}
                    />
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {bloqueado ? (
              <span className="font-medium text-rose-600">
                Corrige los {preview?.totalErrores} errores en el Excel y vuelve a subirlo.
              </span>
            ) : (
              <>
                <b className="text-foreground">{trabajados}</b> días de trabajo se aplicarán
                {conteos.est.aviso > 0 && <> · {conteos.est.aviso} con aviso</>}.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={aplicando} className="gap-2">
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={bloqueado || aplicando}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {aplicando ? 'Aplicando…' : 'Confirmar y aplicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Grupo (encabezado de empleado + sus días) ─────────────────────────────────
function FragmentGroup({
  nombre,
  equipo,
  acabados,
  dias,
  metaTotal,
  gErr,
  gAvi,
  cols,
  stickyTop,
  filas,
}: {
  nombre: string
  equipo: number | null
  acabados: boolean
  dias: number
  metaTotal: number
  gErr: boolean
  gAvi: boolean
  cols: number
  stickyTop: number
  filas: PreviewFilaTurno[]
}) {
  return (
    <>
      <tr className="sticky z-[5]" style={{ top: stickyTop }}>
        <td colSpan={cols} className="border-y bg-muted px-4 py-2">
          <div className="flex items-center gap-2">
            <Nombre nombre={nombre} />
            <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
              {dias} día{dias === 1 ? '' : 's'}
            </span>
            {!acabados &&
              (equipo != null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                  <Cog className="h-3 w-3" /> Equipo {equipo}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">sin cuadrilla</span>
              ))}
            {acabados && metaTotal > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                <Target className="h-3 w-3" /> {fmtMeta(metaTotal)}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1">
              {gErr && <span className="h-2 w-2 rounded-full bg-rose-500" title="Tiene errores" />}
              {gAvi && <span className="h-2 w-2 rounded-full bg-amber-400" title="Tiene avisos" />}
            </span>
          </div>
        </td>
      </tr>
      {filas.map((f) => {
        const est = estadoDe(f)
        return (
          <tr
            key={`${f.idEmpleado}-${f.fecha}`}
            className={cn(
              '[&>td]:border-b [&>td]:px-4 [&>td]:py-1.5 [&>td]:align-middle',
              est === 'error' && 'bg-rose-50/70',
              est === 'aviso' && 'bg-amber-50/60',
            )}
          >
            <td className="whitespace-nowrap tabular-nums text-xs">
              <span className="text-muted-foreground">{diaDe(f.fecha)}</span> {f.fecha.slice(5)}
            </td>
            <td>
              <TipoBadge tipo={f.tipo} />
            </td>
            <td className="whitespace-nowrap tabular-nums text-xs text-muted-foreground">
              {f.horaInicio ? `${fmtHora(f.horaInicio)}–${fmtHora(f.horaFin)}` : '—'}
            </td>
            {acabados && <td className="tabular-nums text-xs">{f.metaDia != null ? fmtMeta(f.metaDia) : '—'}</td>}
            {!acabados && <td className="tabular-nums text-xs">{f.numTurno ?? '—'}</td>}
            {!acabados && (
              <td className="text-xs">
                {f.maquina != null ? (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Cog className="h-3 w-3 text-muted-foreground" /> {f.maquina}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            )}
            <td className="tabular-nums text-xs text-muted-foreground">{f.sistema ?? '—'}</td>
            <td className="text-xs">
              {est === 'error' ? (
                <span className="inline-flex items-center gap-1 text-rose-700">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  {f.errores[0]}
                </span>
              ) : est === 'aviso' ? (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {f.avisos[0]}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> OK
                </span>
              )}
            </td>
          </tr>
        )
      })}
    </>
  )
}
