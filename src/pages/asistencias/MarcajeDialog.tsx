import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertCircle, Trash2 } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import {
  useDeleteAsistencia,
  useUpsertAsistencia,
} from '@/hooks/useAsistencias'
import { formatDate } from '@/lib/utils'
import { asistenciaSchema, type AsistenciaFormValues } from '@/lib/validators'
import type { RegistroAsistencia, Turno } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  empleadoId: string
  empleadoNombre: string
  fecha: string
  turnoVigente?: Turno
  registroActual?: RegistroAsistencia
  ausenciaId?: string
}

export function MarcajeDialog({
  open,
  onOpenChange,
  empleadoId,
  empleadoNombre,
  fecha,
  turnoVigente,
  registroActual,
  ausenciaId,
}: Props) {
  const upsert = useUpsertAsistencia()
  const remove = useDeleteAsistencia()

  const form = useForm<AsistenciaFormValues>({
    resolver: zodResolver(asistenciaSchema),
    defaultValues: {
      empleadoId,
      fecha,
      tipoRegistro: 'MARCAJE',
      horaEntradaReal: '',
      horaSalidaReal: '',
      observaciones: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (registroActual) {
      form.reset({
        empleadoId,
        fecha,
        tipoRegistro: registroActual.tipoRegistro,
        horaEntradaReal: registroActual.horaEntradaReal ?? '',
        horaSalidaReal: registroActual.horaSalidaReal ?? '',
        observaciones: registroActual.observaciones ?? '',
      })
    } else {
      form.reset({
        empleadoId,
        fecha,
        tipoRegistro: 'MARCAJE',
        horaEntradaReal: turnoVigente?.horaEntrada ?? '',
        horaSalidaReal: turnoVigente?.horaSalida ?? '',
        observaciones: '',
      })
    }
  }, [open, empleadoId, fecha, registroActual, turnoVigente, form])

  const tipoRegistro = form.watch('tipoRegistro')

  async function onSubmit(values: AsistenciaFormValues) {
    try {
      await upsert.mutateAsync({
        empleadoId: values.empleadoId,
        fecha: values.fecha,
        tipoRegistro: values.tipoRegistro,
        horaEntradaReal:
          values.tipoRegistro === 'MARCAJE' ? values.horaEntradaReal || undefined : undefined,
        horaSalidaReal:
          values.tipoRegistro === 'MARCAJE' ? values.horaSalidaReal || undefined : undefined,
        observaciones: values.observaciones?.trim() || undefined,
        turnoIdAsignado: turnoVigente?.id,
        turnoEntradaAsignado: turnoVigente?.horaEntrada,
        turnoSalidaAsignado: turnoVigente?.horaSalida,
        tipoTurnoAsignado: turnoVigente?.tipo,
        incluyeHoraAlmuerzo: turnoVigente?.incluyeHoraAlmuerzo,
      })
      toast.success('Asistencia guardada')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  async function onDelete() {
    if (!confirm('¿Eliminar el registro de este día?')) return
    try {
      await remove.mutateAsync({ empleadoId, fecha })
      toast.success('Registro eliminado')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {formatDate(fecha)} · {empleadoNombre}
          </DialogTitle>
          <DialogDescription>
            {turnoVigente
              ? `Turno: ${turnoVigente.nombre} (${turnoVigente.horaEntrada}–${turnoVigente.horaSalida})`
              : 'Sin turno asignado para este día.'}
          </DialogDescription>
        </DialogHeader>

        {ausenciaId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ausencia registrada</AlertTitle>
            <AlertDescription>
              Este día tiene una ausencia registrada en el módulo de Ausencias. Para cambiar la
              asistencia, primero edita o elimina la ausencia.{' '}
              <Link to="/ausencias" className="underline">
                Ir a Ausencias
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <Label className="mb-1.5 block">Tipo de registro *</Label>
              <Select
                value={form.watch('tipoRegistro')}
                onValueChange={(v) =>
                  form.setValue('tipoRegistro', v as AsistenciaFormValues['tipoRegistro'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARCAJE">Marcaje normal</SelectItem>
                  <SelectItem value="DESCANSO">Descanso</SelectItem>
                  <SelectItem value="SIN_SERVICIO">Sin servicio (SS)</SelectItem>
                  <SelectItem value="ALTA_PERIODO">Alta en período (ALTA P.)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoRegistro === 'MARCAJE' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Entrada real *</Label>
                  <Input type="time" {...form.register('horaEntradaReal')} />
                  {errors.horaEntradaReal && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.horaEntradaReal.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="mb-1.5 block">Salida real *</Label>
                  <Input type="time" {...form.register('horaSalidaReal')} />
                  {errors.horaSalidaReal && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.horaSalidaReal.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-1.5 block">Observaciones</Label>
              <Textarea rows={2} {...form.register('observaciones')} />
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                {registroActual && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar día
                  </Button>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
