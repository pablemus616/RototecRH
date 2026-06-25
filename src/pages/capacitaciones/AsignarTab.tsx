import { useMemo, useState } from 'react'
import { RefreshCw, Search, Users } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useAsignarPrimaria,
  useAsignarSecundaria,
  useElegibles,
  usePensums,
} from '@/hooks/useCapacitaciones'
import { usePuestoOptions, useDepartamentoOptions } from '@/hooks/usePuestoOptions'
import { NameCombobox } from '@/components/ui/name-combobox'
import { asignacionSecundariaSchema } from '@/lib/validators'
import type { EmpleadoCapElegible } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function AsignarTab() {
  const [puestoId, setPuestoId] = useState<number | null>(null)
  const [departamentoId, setDepartamentoId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const { options: puestoOptions } = usePuestoOptions()
  const { options: deptoOptions } = useDepartamentoOptions()
  const { data: pensums } = usePensums()

  const filtros = {
    puesto: puestoId ?? undefined,
    departamento: departamentoId ?? undefined,
  }
  const { data, isLoading, isError, isFetching, refetch } = useElegibles(filtros)

  const elegibles = useMemo(() => {
    const all = data ?? []
    if (!search.trim()) return all
    const q = norm(search.trim())
    return all.filter((e) => norm(e.nombre).includes(q))
  }, [data, search])

  // Multi-select state
  const [selected, setSelected] = useState<Set<number>>(new Set())

  function resetFilters() {
    setSelected(new Set())
  }

  function toggleAll() {
    if (selected.size === elegibles.length && elegibles.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(elegibles.map((e) => e.empleadoId)))
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const asignar = useAsignarPrimaria()

  async function onAsignarPrimaria() {
    if (selected.size === 0) return
    try {
      await asignar.mutateAsync([...selected])
      toast.success(`Asignación creada para ${selected.size} empleado(s)`)
      setSelected(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar')
    }
  }

  const allSelected = elegibles.length > 0 && selected.size === elegibles.length
  const someSelected = selected.size > 0 && selected.size < elegibles.length

  // Secundaria dialog state
  const [secundariaFor, setSecundariaFor] = useState<EmpleadoCapElegible | undefined>()

  // Puesto name resolver fallback
  const puestoMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const o of puestoOptions) m.set(o.id, o.nombre)
    return m
  }, [puestoOptions])

  // Pensum name resolver fallback
  const pensumMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of pensums ?? []) m.set(p.id, p.nombre)
    return m
  }, [pensums])

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Puesto</label>
          <NameCombobox
            options={puestoOptions}
            value={puestoId}
            onChange={(v) => { setPuestoId(v); resetFilters() }}
            placeholder="Todos los puestos"
            allowAll
            allLabel="Todos los puestos"
            className="sm:w-52"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Departamento</label>
          <NameCombobox
            options={deptoOptions}
            value={departamentoId}
            onChange={(v) => { setDepartamentoId(v); resetFilters() }}
            placeholder="Todos los departamentos"
            allowAll
            allLabel="Todos los departamentos"
            className="sm:w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Buscar empleado</label>
          <div className="relative sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetFilters() }}
              placeholder="Nombre del empleado"
              className="pl-8"
            />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:mt-5">
          <button
            type="button"
            onClick={() => refetch()}
            aria-label="Actualizar"
            title="Actualizar"
            disabled={isFetching}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          {selected.size > 0 && (
            <Badge variant="secondary">{selected.size} seleccionado(s)</Badge>
          )}
          <Button
            size="sm"
            onClick={onAsignarPrimaria}
            disabled={selected.size === 0 || asignar.isPending}
          >
            <Users className="mr-2 h-4 w-4" />
            {asignar.isPending ? 'Asignando…' : 'Asignar (primaria)'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                  disabled={elegibles.length === 0}
                />
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Capacitación</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-destructive">
                  Error al cargar empleados elegibles
                </TableCell>
              </TableRow>
            ) : elegibles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No hay empleados elegibles
                </TableCell>
              </TableRow>
            ) : (
              elegibles.map((e) => (
                <ElegibleRow
                  key={e.empleadoId}
                  emp={e}
                  checked={selected.has(e.empleadoId)}
                  onToggle={() => toggle(e.empleadoId)}
                  onSecundaria={() => setSecundariaFor(e)}
                  puestoNombre={e.puestoNombre ?? puestoMap.get(e.idPuesto) ?? '—'}
                  pensumNombre={e.pensumNombre ?? pensumMap.get(e.idPensum) ?? '—'}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Secundaria dialog */}
      {secundariaFor && (
        <SecundariaDialog
          emp={secundariaFor}
          open={true}
          onClose={() => setSecundariaFor(undefined)}
        />
      )}
    </div>
  )
}

function ElegibleRow({
  emp,
  checked,
  onToggle,
  onSecundaria,
  puestoNombre,
  pensumNombre,
}: {
  emp: EmpleadoCapElegible
  checked: boolean
  onToggle: () => void
  onSecundaria: () => void
  puestoNombre: string
  pensumNombre: string
}) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={onToggle}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          aria-label={`Seleccionar ${emp.nombre}`}
        />
      </TableCell>
      <TableCell className="font-medium">{emp.nombre}</TableCell>
      <TableCell>{puestoNombre}</TableCell>
      <TableCell>{pensumNombre}</TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onSecundaria()
          }}
        >
          Secundaria
        </Button>
      </TableCell>
    </TableRow>
  )
}

function SecundariaDialog({
  emp,
  open,
  onClose,
}: {
  emp: EmpleadoCapElegible
  open: boolean
  onClose: () => void
}) {
  const { data: pensums } = usePensums()
  const asignar = useAsignarSecundaria(emp.empleadoId)
  const [idPensum, setIdPensum] = useState('')

  async function onAssign() {
    const parsed = asignacionSecundariaSchema.safeParse({ idPensum })
    if (!parsed.success) {
      toast.error('Selecciona un pensum')
      return
    }
    try {
      await asignar.mutateAsync(parsed.data.idPensum)
      toast.success('Pensum secundario asignado')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar capacitación secundaria</DialogTitle>
          <DialogDescription>{emp.nombre}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="sec-pensum">Pensum</Label>
          <Select value={idPensum} onValueChange={setIdPensum}>
            <SelectTrigger id="sec-pensum">
              <SelectValue placeholder="Selecciona un pensum" />
            </SelectTrigger>
            <SelectContent>
              {(pensums ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onAssign} disabled={!idPensum || asignar.isPending}>
            {asignar.isPending ? 'Asignando…' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
