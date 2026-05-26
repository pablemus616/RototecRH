import { useMemo, useState } from 'react'
import { CalendarClock, History, Pencil } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { useAsignacionesByEmpleado, useTurnosList } from '@/hooks/useTurnos'
import { AsignarTurnoDialog } from './AsignarTurnoDialog'

interface Props {
  empleadoId: string
  empleadoNombre: string
}

export function TurnoActualCard({ empleadoId, empleadoNombre }: Props) {
  const [open, setOpen] = useState(false)
  const { data: asignaciones, isLoading } = useAsignacionesByEmpleado(empleadoId)
  const { data: turnos } = useTurnosList()

  const turnosById = useMemo(() => {
    const m = new Map<string, NonNullable<typeof turnos>[number]>()
    for (const t of turnos ?? []) m.set(t.id, t)
    return m
  }, [turnos])

  const vigente = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    return (asignaciones ?? [])
      .filter((a) => a.fechaVigencia <= hoy)
      .sort((a, b) => b.fechaVigencia.localeCompare(a.fechaVigencia))[0]
  }, [asignaciones])

  const historial = (asignaciones ?? []).slice(0, 5)
  const turnoVigente = vigente ? turnosById.get(vigente.turnoId) : undefined

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Turno actual</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Pencil className="h-4 w-4" />
              {vigente ? 'Cambiar turno' : 'Asignar turno'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : !vigente ? (
            <p className="text-sm text-muted-foreground">
              Sin turno asignado. Este empleado no aparecerá con turno fijo en asistencias.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant={turnoVigente?.tipo === 'DIURNO' ? 'warning' : 'secondary'}
                  className="text-sm"
                >
                  {turnoVigente?.nombre ?? 'Turno eliminado'}
                </Badge>
                {turnoVigente && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {turnoVigente.horaEntrada} – {turnoVigente.horaSalida} ·{' '}
                    {turnoVigente.horasPlanificadas.toFixed(2)} h
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Vigente desde {formatDate(vigente.fechaVigencia)}
                {vigente.notas && ` · ${vigente.notas}`}
              </p>
            </div>
          )}

          {historial.length > 1 && (
            <>
              <Separator className="my-4" />
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                Historial reciente
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vigente desde</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.map((a) => {
                    const t = turnosById.get(a.turnoId)
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="tabular-nums">
                          {formatDate(a.fechaVigencia)}
                        </TableCell>
                        <TableCell>{t?.nombre ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.notas || '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <AsignarTurnoDialog
        open={open}
        onOpenChange={setOpen}
        empleadoId={empleadoId}
        empleadoNombre={empleadoNombre}
        turnoActualId={vigente?.turnoId}
      />
    </>
  )
}
