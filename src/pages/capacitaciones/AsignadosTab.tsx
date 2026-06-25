import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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
import { useEmpleadosCap } from '@/hooks/useCapacitaciones'
import { usePuestoOptions, useDepartamentoOptions } from '@/hooks/usePuestoOptions'
import { NameCombobox } from '@/components/ui/name-combobox'
import type { EmpleadoCapResumen } from '@/types'
import { EmpleadoCapDetailSheet } from './EmpleadoCapDetailSheet'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function AsignadosTab() {
  const [puestoId, setPuestoId] = useState<number | null>(null)
  const [departamentoId, setDepartamentoId] = useState<number | null>(null)
  const [estado, setEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | undefined>(undefined)

  const { options: puestoOptions } = usePuestoOptions()
  const { options: deptoOptions } = useDepartamentoOptions()

  // Pass numeric id as string to keep existing hook/mock signature intact
  const filtros = {
    puesto: puestoId != null ? String(puestoId) : undefined,
    departamento: departamentoId != null ? String(departamentoId) : undefined,
    estado: estado === 'todos' ? undefined : estado,
  }
  const { data, isLoading, isError } = useEmpleadosCap(filtros)

  const empleados = useMemo(() => {
    const all = data ?? []
    if (!search.trim()) return all
    const q = norm(search.trim())
    return all.filter((e) => norm(e.nombre).includes(q))
  }, [data, search])

  // Puesto name resolver fallback
  const puestoMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const o of puestoOptions) m.set(o.id, o.nombre)
    return m
  }, [puestoOptions])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Puesto</label>
          <NameCombobox
            options={puestoOptions}
            value={puestoId}
            onChange={setPuestoId}
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
            onChange={setDepartamentoId}
            placeholder="Todos los departamentos"
            allowAll
            allLabel="Todos los departamentos"
            className="sm:w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Estado</label>
          <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Buscar empleado</label>
          <div className="relative sm:w-52">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre del empleado"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Capacitación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Progreso</TableHead>
              <TableHead>Licencia</TableHead>
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
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-destructive">
                  Error al cargar empleados
                </TableCell>
              </TableRow>
            ) : empleados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Sin empleados asignados
                </TableCell>
              </TableRow>
            ) : (
              empleados.map((e) => (
                <EmpleadoRow
                  key={e.empleadoId}
                  emp={e}
                  puestoNombre={e.puestoNombre ?? (e.idPuesto != null ? (puestoMap.get(e.idPuesto) ?? '—') : '—')}
                  onOpen={() => setSelected(e.empleadoId)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <EmpleadoCapDetailSheet
        empleadoId={selected}
        open={selected != null}
        onOpenChange={(o) => !o && setSelected(undefined)}
      />
    </div>
  )
}

function EmpleadoRow({
  emp,
  puestoNombre,
  onOpen,
}: {
  emp: EmpleadoCapResumen
  puestoNombre: string
  onOpen: () => void
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="font-medium">{emp.nombre}</TableCell>
      <TableCell>{puestoNombre}</TableCell>
      <TableCell>{emp.capacitacionNombre ?? '—'}</TableCell>
      <TableCell>
        {emp.estaActivo ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="destructive">Inactivo</Badge>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {emp.modulosAprobados}/{emp.modulosTotal}
      </TableCell>
      <TableCell>
        {emp.licenciaActiva ? (
          <Badge variant="success">Vigente</Badge>
        ) : (
          <Badge variant="outline">—</Badge>
        )}
      </TableCell>
    </TableRow>
  )
}
