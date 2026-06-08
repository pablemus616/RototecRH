import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  Briefcase,
  Building2,
  ChevronRight,
  FolderTree,
  Network,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { extractApiErrorMessage } from '@/api/client'
import type { DepartamentoNodo, PuestoNodo, SubDepartamentoNodo } from '@/api/estructura'
import { useEmpresas, usePaises } from '@/hooks/useCompanyCatalogos'
import {
  useArbolEmpresa,
  useEliminarDepartamento,
  useEliminarPuesto,
  useEliminarSubDepartamento,
} from '@/hooks/useEstructura'
import { cn } from '@/lib/utils'
import { NodoDialog, type NodoDialogState } from './NodoDialog'

interface TreeApi {
  openDeptos: Set<number>
  openSubs: Set<number>
  toggleDepto: (id: number) => void
  toggleSub: (id: number) => void
  editarDepartamento: (d: DepartamentoNodo) => void
  eliminarDepartamento: (d: DepartamentoNodo) => void
  nuevoSub: (deptoId: number) => void
  editarSub: (s: SubDepartamentoNodo) => void
  eliminarSub: (s: SubDepartamentoNodo) => void
  nuevoPuesto: (subId: number) => void
  editarPuesto: (p: PuestoNodo) => void
  eliminarPuesto: (p: PuestoNodo) => void
}

const DIALOG_INICIAL: NodoDialogState = { open: false, nivel: 'departamento', mode: 'crear' }

export default function OrganizacionPage() {
  const { data: paises } = usePaises()
  const [paisId, setPaisId] = useState<number | undefined>()
  const { data: empresas } = useEmpresas(paisId)
  const [empresaId, setEmpresaId] = useState<number | undefined>()

  const [openDeptos, setOpenDeptos] = useState<Set<number>>(new Set())
  const [openSubs, setOpenSubs] = useState<Set<number>>(new Set())
  const [dialog, setDialog] = useState<NodoDialogState>(DIALOG_INICIAL)

  const { data: arbol, isLoading } = useArbolEmpresa(empresaId)
  const delDepto = useEliminarDepartamento()
  const delSub = useEliminarSubDepartamento()
  const delPuesto = useEliminarPuesto()

  // Default país: GT si existe, si no el primero.
  useEffect(() => {
    if (paisId == null && paises?.length) {
      setPaisId(paises.find((p) => p.codigo === 'GT')?.id ?? paises[0].id)
    }
  }, [paises, paisId])

  // Default empresa: la primera del país; re-selecciona si la actual no pertenece.
  useEffect(() => {
    if (!empresas?.length) return
    if (empresaId == null || !empresas.some((e) => e.id === empresaId)) {
      setEmpresaId(empresas[0].id)
    }
  }, [empresas, empresaId])

  // Al cambiar de empresa, colapsamos todo.
  useEffect(() => {
    setOpenDeptos(new Set())
    setOpenSubs(new Set())
  }, [empresaId])

  const totales = useMemo(() => {
    const deptos = arbol ?? []
    let subs = 0
    let puestos = 0
    for (const d of deptos) {
      subs += d.subdepartamentos.length
      for (const s of d.subdepartamentos) puestos += s.puestos.length
    }
    return { deptos: deptos.length, subs, puestos }
  }, [arbol])

  const empresaNombre = empresas?.find((e) => e.id === empresaId)?.nombre

  function toggle(set: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) {
    set((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function confirmarEliminar(label: string, fn: () => Promise<unknown>) {
    if (!confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return
    try {
      await fn()
      toast.success('Eliminado')
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  const api: TreeApi = {
    openDeptos,
    openSubs,
    toggleDepto: (id) => toggle(setOpenDeptos, id),
    toggleSub: (id) => toggle(setOpenSubs, id),
    editarDepartamento: (d) =>
      setDialog({ open: true, nivel: 'departamento', mode: 'editar', nodo: { id: d.id, nombre: d.nombre, codigo: d.codigo } }),
    eliminarDepartamento: (d) =>
      confirmarEliminar(`el departamento "${d.nombre}"`, () => delDepto.mutateAsync(d.id)),
    nuevoSub: (deptoId) => setDialog({ open: true, nivel: 'subdepartamento', mode: 'crear', parentId: deptoId }),
    editarSub: (s) =>
      setDialog({ open: true, nivel: 'subdepartamento', mode: 'editar', nodo: { id: s.id, nombre: s.nombre } }),
    eliminarSub: (s) =>
      confirmarEliminar(`el sub-departamento "${s.nombre}"`, () => delSub.mutateAsync(s.id)),
    nuevoPuesto: (subId) => setDialog({ open: true, nivel: 'puesto', mode: 'crear', parentId: subId }),
    editarPuesto: (p) =>
      setDialog({ open: true, nivel: 'puesto', mode: 'editar', nodo: { id: p.id, nombre: p.nombre, codigoBiotime: p.codigoBiotime } }),
    eliminarPuesto: (p) => confirmarEliminar(`el puesto "${p.nombre}"`, () => delPuesto.mutateAsync(p.id)),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
          <Network className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Estructura organizacional
          </p>
          <h2 className="text-lg font-semibold leading-tight">Departamentos, sub-departamentos y puestos</h2>
          <p className="text-sm text-muted-foreground">
            Gestioná la jerarquía por empresa. Eliminá ramas vacías; las que tienen dependientes quedan protegidas.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">País</label>
            <Select
              value={paisId != null ? String(paisId) : undefined}
              onValueChange={(v) => {
                setPaisId(Number(v))
                setEmpresaId(undefined)
              }}
            >
              <SelectTrigger className="w-44"><SelectValue placeholder="País" /></SelectTrigger>
              <SelectContent>
                {(paises ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Empresa</label>
            <Select
              value={empresaId != null ? String(empresaId) : undefined}
              onValueChange={(v) => setEmpresaId(Number(v))}
              disabled={!empresas?.length}
            >
              <SelectTrigger className="w-64"><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                {(empresas ?? []).map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 font-mono text-xs text-muted-foreground sm:flex">
            <span><strong className="text-foreground tabular-nums">{totales.deptos}</strong> deptos</span>
            <span className="text-border">·</span>
            <span><strong className="text-foreground tabular-nums">{totales.subs}</strong> sub</span>
            <span className="text-border">·</span>
            <span><strong className="text-foreground tabular-nums">{totales.puestos}</strong> puestos</span>
          </div>
          <Button
            disabled={!empresaId}
            onClick={() => setDialog({ open: true, nivel: 'departamento', mode: 'crear', parentId: empresaId })}
          >
            <Plus className="h-4 w-4" />Nuevo departamento
          </Button>
        </div>
      </Card>

      {/* Árbol */}
      <Card className="p-3 sm:p-4">
        {!empresaId ? (
          <EstadoVacio icon={Building2} titulo="Elegí una empresa" detalle="Seleccioná un país y una empresa para ver su estructura." />
        ) : isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : !arbol?.length ? (
          <EstadoVacio
            icon={FolderTree}
            titulo="Sin departamentos"
            detalle={`${empresaNombre ?? 'Esta empresa'} todavía no tiene departamentos.`}
            accion={
              <Button
                variant="outline"
                onClick={() => setDialog({ open: true, nivel: 'departamento', mode: 'crear', parentId: empresaId })}
              >
                <Plus className="h-4 w-4" />Crear el primero
              </Button>
            }
          />
        ) : (
          <div className="space-y-1">
            {arbol.map((d, i) => (
              <DepartamentoNode key={d.id} depto={d} api={api} index={i} />
            ))}
          </div>
        )}
      </Card>

      <NodoDialog state={dialog} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} />
    </div>
  )
}

// ───────────────────────── Nodos ─────────────────────────

function DepartamentoNode({ depto, api, index }: { depto: DepartamentoNodo; api: TreeApi; index: number }) {
  const open = api.openDeptos.has(depto.id)
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-1"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms`, animationFillMode: 'both' }}
    >
      <div className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
        <button
          type="button"
          onClick={() => api.toggleDepto(depto.id)}
          className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label={open ? 'Colapsar' : 'Expandir'}
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-90')} />
        </button>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <Building2 className="h-4 w-4" />
        </span>
        <button type="button" onClick={() => api.toggleDepto(depto.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate text-sm font-semibold">{depto.nombre}</span>
          {depto.codigo && (
            <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-100">
              {depto.codigo}
            </span>
          )}
        </button>
        <span className="hidden shrink-0 font-mono text-xs text-muted-foreground tabular-nums sm:inline">
          {depto.subdepartamentos.length} sub
        </span>
        <RowActions onEdit={() => api.editarDepartamento(depto)} onDelete={() => api.eliminarDepartamento(depto)} />
      </div>

      <ExpandRegion open={open}>
        <div className="ml-[1.45rem] space-y-1 border-l border-dashed border-border pb-1 pl-4 pt-1">
          {depto.subdepartamentos.map((s) => (
            <SubNode key={s.id} sub={s} api={api} />
          ))}
          <AddRow label="sub-departamento" onClick={() => api.nuevoSub(depto.id)} />
        </div>
      </ExpandRegion>
    </div>
  )
}

function SubNode({ sub, api }: { sub: SubDepartamentoNodo; api: TreeApi }) {
  const open = api.openSubs.has(sub.id)
  return (
    <div>
      <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">
        <button
          type="button"
          onClick={() => api.toggleSub(sub.id)}
          className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground"
          aria-label={open ? 'Colapsar' : 'Expandir'}
        >
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-90')} />
        </button>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          <FolderTree className="h-3.5 w-3.5" />
        </span>
        <button type="button" onClick={() => api.toggleSub(sub.id)} className="min-w-0 flex-1 text-left">
          <span className="truncate text-sm font-medium">{sub.nombre}</span>
        </button>
        <span className="hidden shrink-0 font-mono text-xs text-muted-foreground tabular-nums sm:inline">
          {sub.puestos.length} puestos
        </span>
        <RowActions onEdit={() => api.editarSub(sub)} onDelete={() => api.eliminarSub(sub)} />
      </div>

      <ExpandRegion open={open}>
        <div className="ml-[1.3rem] space-y-0.5 border-l border-dashed border-border pb-1 pl-4 pt-1">
          {sub.puestos.map((p) => (
            <PuestoRow key={p.id} puesto={p} api={api} />
          ))}
          <AddRow label="puesto" onClick={() => api.nuevoPuesto(sub.id)} />
        </div>
      </ExpandRegion>
    </div>
  )
}

function PuestoRow({ puesto, api }: { puesto: PuestoNodo; api: TreeApi }) {
  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40">
      <span className="grid h-6 w-6 shrink-0 place-items-center text-indigo-400">
        <Briefcase className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{puesto.nombre}</span>
      {puesto.codigoBiotime != null && (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          bio {puesto.codigoBiotime}
        </span>
      )}
      <RowActions onEdit={() => api.editarPuesto(puesto)} onDelete={() => api.eliminarPuesto(puesto)} />
    </div>
  )
}

// ───────────────────────── Piezas reutilizables ─────────────────────────

function ExpandRegion({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-200 ease-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      <button
        type="button"
        onClick={onEdit}
        title="Editar"
        aria-label="Editar"
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Eliminar"
        aria-label="Eliminar"
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-indigo-50/60 hover:text-indigo-600"
    >
      <Plus className="h-3.5 w-3.5" />
      Agregar {label}
    </button>
  )
}

function EstadoVacio({
  icon: Icon,
  titulo,
  detalle,
  accion,
}: {
  icon: ComponentType<{ className?: string }>
  titulo: string
  detalle: string
  accion?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{detalle}</p>
      </div>
      {accion}
    </div>
  )
}
