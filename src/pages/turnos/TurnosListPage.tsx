import { useState } from 'react'
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  useDesactivarTurno,
  useReactivarTurno,
  useTurnosList,
} from '@/hooks/useTurnos'
import type { Turno } from '@/types'
import { TurnoFormDialog } from './TurnoFormDialog'

export default function TurnosListPage() {
  const { data, isLoading, isError } = useTurnosList()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Turno | undefined>(undefined)

  const turnos = data ?? []

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(t: Turno) {
    setEditing(t)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {turnos.length} turno{turnos.length === 1 ? '' : 's'} en el catálogo
          {turnos.length > 0 && (
            <>
              {' · '}
              {turnos.filter((t) => t.activo).length} activos
            </>
          )}
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo Turno
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead>
              <TableHead>Almuerzo</TableHead>
              <TableHead className="text-right">Horas plan.</TableHead>
              <TableHead className="text-right">Umbral extras</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-40 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-destructive">
                  Error al cargar turnos
                </TableCell>
              </TableRow>
            ) : turnos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Sin turnos en el catálogo
                </TableCell>
              </TableRow>
            ) : (
              turnos.map((t) => <TurnoRow key={t.id} turno={t} onEdit={openEdit} />)
            )}
          </TableBody>
        </Table>
      </Card>

      <TurnoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? 'edit' : 'create'}
        turno={editing}
      />
    </div>
  )
}

function TurnoRow({ turno, onEdit }: { turno: Turno; onEdit: (t: Turno) => void }) {
  const desactivar = useDesactivarTurno(turno.id)
  const reactivar = useReactivarTurno(turno.id)
  const isMutating = desactivar.isPending || reactivar.isPending

  async function onToggle() {
    try {
      if (turno.activo) {
        await desactivar.mutateAsync()
        toast.success(`Turno "${turno.nombre}" desactivado`)
      } else {
        await reactivar.mutateAsync()
        toast.success(`Turno "${turno.nombre}" reactivado`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  return (
    <TableRow className={turno.activo ? undefined : 'opacity-60'}>
      <TableCell className="font-medium">{turno.nombre}</TableCell>
      <TableCell>
        <Badge variant={turno.tipo === 'DIURNO' ? 'warning' : 'secondary'}>
          {turno.tipo === 'DIURNO' ? 'Diurno' : 'Nocturno'}
        </Badge>
      </TableCell>
      <TableCell className="tabular-nums">{turno.horaEntrada}</TableCell>
      <TableCell className="tabular-nums">{turno.horaSalida}</TableCell>
      <TableCell>
        {turno.incluyeHoraAlmuerzo ? (
          <Badge variant="outline">Sí</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {turno.horasPlanificadas.toFixed(2)} h
      </TableCell>
      <TableCell className="text-right tabular-nums">{turno.horasUmbralExtras} h</TableCell>
      <TableCell>
        {turno.activo ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="destructive">Inactivo</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(turno)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={isMutating}
            title={turno.activo ? 'Desactivar' : 'Reactivar'}
          >
            {turno.activo ? (
              <Power className="h-4 w-4" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
