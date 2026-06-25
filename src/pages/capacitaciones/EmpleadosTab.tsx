import { useState } from 'react'

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
import type { EmpleadoCapResumen } from '@/types'
import { EmpleadoCapDetailSheet } from './EmpleadoCapDetailSheet'

export default function EmpleadosTab() {
  const [puesto, setPuesto] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [estado, setEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [selected, setSelected] = useState<number | undefined>(undefined)

  const filtros = {
    puesto: puesto.trim() || undefined,
    departamento: departamento.trim() || undefined,
    estado: estado === 'todos' ? undefined : estado,
  }
  const { data, isLoading, isError } = useEmpleadosCap(filtros)
  const empleados = data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Puesto</label>
          <Input
            value={puesto}
            onChange={(e) => setPuesto(e.target.value)}
            placeholder="Filtrar por puesto"
            className="sm:w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Departamento</label>
          <Input
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            placeholder="Filtrar por departamento"
            className="sm:w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Estado</label>
          <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Progreso</TableHead>
              <TableHead>Licencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-destructive">
                  Error al cargar empleados
                </TableCell>
              </TableRow>
            ) : empleados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Sin empleados
                </TableCell>
              </TableRow>
            ) : (
              empleados.map((e) => (
                <EmpleadoRow key={e.empleadoId} emp={e} onOpen={() => setSelected(e.empleadoId)} />
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

function EmpleadoRow({ emp, onOpen }: { emp: EmpleadoCapResumen; onOpen: () => void }) {
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="font-medium">{emp.nombre}</TableCell>
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
