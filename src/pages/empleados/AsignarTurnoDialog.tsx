import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateAsignacion, useTurnosList } from '@/hooks/useTurnos'
import {
  asignacionTurnoSchema,
  type AsignacionTurnoFormValues,
} from '@/lib/validators'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  empleadoId: string
  empleadoNombre: string
  turnoActualId?: string
}

export function AsignarTurnoDialog({
  open,
  onOpenChange,
  empleadoId,
  empleadoNombre,
  turnoActualId,
}: Props) {
  const { data: turnos } = useTurnosList()
  const crear = useCreateAsignacion(empleadoId)

  const form = useForm<AsignacionTurnoFormValues>({
    resolver: zodResolver(asignacionTurnoSchema),
    defaultValues: {
      turnoId: turnoActualId ?? '',
      fechaVigencia: new Date().toISOString().slice(0, 10),
      notas: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        turnoId: turnoActualId ?? '',
        fechaVigencia: new Date().toISOString().slice(0, 10),
        notas: '',
      })
    }
  }, [open, turnoActualId, form])

  async function onSubmit(values: AsignacionTurnoFormValues) {
    try {
      await crear.mutateAsync({
        empleadoId,
        turnoId: values.turnoId,
        fechaVigencia: values.fechaVigencia,
        notas: values.notas?.trim() || undefined,
      })
      toast.success('Turno asignado')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  const turnosActivos = (turnos ?? []).filter((t) => t.activo)
  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar turno · {empleadoNombre}</DialogTitle>
          <DialogDescription>
            El turno entra en vigencia en la fecha indicada. Asignaciones previas quedan en el
            historial.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block">Turno *</Label>
            <Select
              value={form.watch('turnoId')}
              onValueChange={(v) => form.setValue('turnoId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un turno" />
              </SelectTrigger>
              <SelectContent>
                {turnosActivos.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No hay turnos activos en el catálogo
                  </div>
                ) : (
                  turnosActivos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre} ({t.tipo === 'DIURNO' ? 'Diurno' : 'Nocturno'} ·{' '}
                      {t.horaEntrada}–{t.horaSalida})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.turnoId && (
              <p className="mt-1 text-xs text-destructive">{errors.turnoId.message}</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Fecha de vigencia *</Label>
            <Input type="date" {...form.register('fechaVigencia')} />
            {errors.fechaVigencia && (
              <p className="mt-1 text-xs text-destructive">{errors.fechaVigencia.message}</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Notas</Label>
            <Textarea
              rows={3}
              placeholder="Opcional: motivo del cambio"
              {...form.register('notas')}
            />
            {errors.notas && (
              <p className="mt-1 text-xs text-destructive">{errors.notas.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending || turnosActivos.length === 0}>
              {crear.isPending ? 'Guardando…' : 'Asignar turno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
