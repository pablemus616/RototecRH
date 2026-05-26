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
import { Textarea } from '@/components/ui/textarea'
import { TIPOS_BONIFICACION } from '@/constants/bonificaciones'
import { useEmpleadosList } from '@/hooks/useEmpleados'
import { useCreateBonificacion } from '@/hooks/useBonificaciones'
import { nombreParaMostrar } from '@/lib/utils'
import {
  bonificacionSchema,
  type BonificacionFormValues,
} from '@/lib/validators'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodo: string
}

export function BonificacionDialog({ open, onOpenChange, periodo }: Props) {
  const { data: empleados } = useEmpleadosList()
  const crear = useCreateBonificacion()

  const form = useForm<BonificacionFormValues>({
    resolver: zodResolver(bonificacionSchema),
    defaultValues: {
      empleadoId: '',
      periodo,
      tipo: 'PRODUCCION_ACABADOS',
      monto: 0,
      descripcion: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        empleadoId: '',
        periodo,
        tipo: 'PRODUCCION_ACABADOS',
        monto: 0,
        descripcion: '',
      })
    }
  }, [open, periodo, form])

  const empleadosActivos = useMemo(() => {
    return (empleados ?? [])
      .filter((e) => e.estado === 'ACTIVO')
      .sort((a, b) => nombreParaMostrar(a).localeCompare(nombreParaMostrar(b)))
  }, [empleados])

  async function onSubmit(values: BonificacionFormValues) {
    try {
      await crear.mutateAsync({
        empleadoId: values.empleadoId,
        periodo: values.periodo,
        tipo: values.tipo,
        monto: Number(values.monto),
        descripcion: values.descripcion?.trim() || undefined,
      })
      toast.success('Bonificación registrada')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar bonificación</DialogTitle>
          <DialogDescription>
            Se agrega al período {periodo}. Al generar la planilla se suma al campo
            correspondiente.
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
                {empleadosActivos.map((e) => (
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Tipo *</Label>
              <Select
                value={form.watch('tipo')}
                onValueChange={(v) =>
                  form.setValue('tipo', v as BonificacionFormValues['tipo'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_BONIFICACION.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Monto (Q) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...form.register('monto')}
              />
              {errors.monto && (
                <p className="mt-1 text-xs text-destructive">{errors.monto.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Descripción</Label>
            <Textarea rows={2} {...form.register('descripcion')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando…' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
