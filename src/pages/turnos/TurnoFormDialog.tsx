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
import { calcularHorasPlanificadas, umbralHorasExtras } from '@/lib/utils'
import { useCreateTurno, useUpdateTurno } from '@/hooks/useTurnos'
import { turnoSchema, type TurnoFormValues } from '@/lib/validators'
import type { Turno } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  turno?: Turno
}

const defaultValues: TurnoFormValues = {
  nombre: '',
  tipo: 'DIURNO',
  horaEntrada: '06:00',
  horaSalida: '14:00',
  incluyeHoraAlmuerzo: false,
}

export function TurnoFormDialog({ open, onOpenChange, mode, turno }: Props) {
  const createMut = useCreateTurno()
  const updateMut = useUpdateTurno(turno?.id ?? '')
  const isSubmitting = createMut.isPending || updateMut.isPending

  const form = useForm<TurnoFormValues>({
    resolver: zodResolver(turnoSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && turno) {
      form.reset({
        nombre: turno.nombre,
        tipo: turno.tipo,
        horaEntrada: turno.horaEntrada,
        horaSalida: turno.horaSalida,
        incluyeHoraAlmuerzo: turno.incluyeHoraAlmuerzo,
      })
    } else {
      form.reset(defaultValues)
    }
  }, [open, mode, turno, form])

  const tipo = form.watch('tipo')
  const entrada = form.watch('horaEntrada')
  const salida = form.watch('horaSalida')
  const almuerzo = form.watch('incluyeHoraAlmuerzo')

  const horasPlan = calcularHorasPlanificadas(entrada, salida, almuerzo)
  const umbral = umbralHorasExtras(tipo)

  async function onSubmit(values: TurnoFormValues) {
    try {
      if (mode === 'create') {
        await createMut.mutateAsync(values)
        toast.success('Turno creado')
      } else if (turno) {
        await updateMut.mutateAsync(values)
        toast.success('Turno actualizado')
      }
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(msg)
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo Turno' : 'Editar Turno'}</DialogTitle>
          <DialogDescription>
            Define el horario y tipo. Las horas planificadas se calculan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block">Nombre *</Label>
            <Input
              placeholder="Ej: Diurno con almuerzo"
              {...form.register('nombre')}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Tipo *</Label>
            <Select
              value={form.watch('tipo')}
              onValueChange={(v) => form.setValue('tipo', v as TurnoFormValues['tipo'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIURNO">Diurno</SelectItem>
                <SelectItem value="NOCTURNO">Nocturno</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="mt-1 text-xs text-destructive">{errors.tipo.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Hora entrada *</Label>
              <Input type="time" {...form.register('horaEntrada')} />
              {errors.horaEntrada && (
                <p className="mt-1 text-xs text-destructive">{errors.horaEntrada.message}</p>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Hora salida *</Label>
              <Input type="time" {...form.register('horaSalida')} />
              {errors.horaSalida && (
                <p className="mt-1 text-xs text-destructive">{errors.horaSalida.message}</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              {...form.register('incluyeHoraAlmuerzo')}
            />
            Incluye hora de almuerzo (descuenta 1h del horario)
          </label>

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horas planificadas:</span>
              <span className="font-semibold tabular-nums">{horasPlan.toFixed(2)} h</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Umbral horas extras:</span>
              <span className="font-semibold tabular-nums">{umbral} h/semana</span>
            </div>
            {salida <= entrada && (
              <p className="mt-2 text-xs text-amber-700">
                La salida es menor o igual a la entrada — se asume que el turno cruza medianoche.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : mode === 'create' ? 'Crear turno' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
