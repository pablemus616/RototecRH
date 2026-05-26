import { useEffect, useMemo } from 'react'
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
import { useEmpleadosList } from '@/hooks/useEmpleados'
import { useCreateAtraso } from '@/hooks/useAusencias'
import { minutosAHHMM } from '@/lib/ausencias'
import { nombreParaMostrar } from '@/lib/utils'
import { atrasoSchema, type AtrasoFormValues } from '@/lib/validators'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const today = () => new Date().toISOString().slice(0, 10)

const defaultValues: AtrasoFormValues = {
  empleadoId: '',
  fecha: today(),
  horaEntradaReal: '09:00',
  horaSalidaReal: '18:00',
  turnoDescripcion: '',
  minutosRetraso: 0,
}

export function AtrasoFormDialog({ open, onOpenChange }: Props) {
  const { data: empleados } = useEmpleadosList()
  const crear = useCreateAtraso()

  const form = useForm<AtrasoFormValues>({
    resolver: zodResolver(atrasoSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) form.reset({ ...defaultValues, fecha: today() })
  }, [open, form])

  const empleadosOrdenados = useMemo(() => {
    return (empleados ?? [])
      .filter((e) => e.estado === 'ACTIVO')
      .sort((a, b) => nombreParaMostrar(a).localeCompare(nombreParaMostrar(b)))
  }, [empleados])

  const minutos = form.watch('minutosRetraso') ?? 0
  const previewHHMM = minutosAHHMM(Number(minutos))

  async function onSubmit(values: AtrasoFormValues) {
    try {
      await crear.mutateAsync({
        empleadoId: values.empleadoId,
        fecha: values.fecha,
        horaEntradaReal: values.horaEntradaReal,
        horaSalidaReal: values.horaSalidaReal,
        turnoDescripcion: values.turnoDescripcion?.trim() || undefined,
        minutosRetraso: Number(values.minutosRetraso),
        medidaDisciplinaria: 'DESCUENTO_EN_NOMINA',
      })
      toast.success('Atraso registrado')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar'
      toast.error(msg)
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Atraso</DialogTitle>
          <DialogDescription>
            Los atrasos se descuentan en nómina. Ingresa los minutos completos (ej. 22).
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block">Empleado *</Label>
            <Select
              value={form.watch('empleadoId')}
              onValueChange={(v) => form.setValue('empleadoId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {empleadosOrdenados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {nombreParaMostrar(e)} — {e.puesto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.empleadoId && (
              <p className="mt-1 text-xs text-destructive">{errors.empleadoId.message}</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Fecha *</Label>
            <Input type="date" {...form.register('fecha')} />
            {errors.fecha && (
              <p className="mt-1 text-xs text-destructive">{errors.fecha.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Hora entrada real *</Label>
              <Input type="time" {...form.register('horaEntradaReal')} />
              {errors.horaEntradaReal && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.horaEntradaReal.message}
                </p>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Hora salida real *</Label>
              <Input type="time" {...form.register('horaSalidaReal')} />
              {errors.horaSalidaReal && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.horaSalidaReal.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Descripción del turno</Label>
            <Input
              placeholder="Ej: TURNO PROGRAMADO DE 09:00 A 18:00"
              {...form.register('turnoDescripcion')}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Minutos de retraso *</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                step={1}
                className="max-w-[140px]"
                {...form.register('minutosRetraso')}
              />
              <span className="text-sm text-muted-foreground tabular-nums">
                ≈ {previewHHMM}
              </span>
            </div>
            {errors.minutosRetraso && (
              <p className="mt-1 text-xs text-destructive">{errors.minutosRetraso.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando…' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
