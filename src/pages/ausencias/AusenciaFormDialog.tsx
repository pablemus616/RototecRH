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
import { REGLA_POR_TIPO, REGLAS_AUSENCIA } from '@/constants/ausencias'
import { useEmpleadosList } from '@/hooks/useEmpleados'
import { useCreateAusencia } from '@/hooks/useAusencias'
import { nombreParaMostrar } from '@/lib/utils'
import { ausenciaSchema, type AusenciaFormValues } from '@/lib/validators'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const today = () => new Date().toISOString().slice(0, 10)

const defaultValues: AusenciaFormValues = {
  empleadoId: '',
  fecha: today(),
  tipoAusencia: 'AUSENCIA_INJUSTIFICADA',
  presentoConstancia: false,
  justificacion: '',
}

export function AusenciaFormDialog({ open, onOpenChange }: Props) {
  const { data: empleados } = useEmpleadosList()
  const crear = useCreateAusencia()

  const form = useForm<AusenciaFormValues>({
    resolver: zodResolver(ausenciaSchema),
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

  const tipo = form.watch('tipoAusencia')
  const regla = REGLA_POR_TIPO.get(tipo)

  async function onSubmit(values: AusenciaFormValues) {
    try {
      await crear.mutateAsync({
        empleadoId: values.empleadoId,
        fecha: values.fecha,
        tipoAusencia: values.tipoAusencia,
        presentoConstancia: values.presentoConstancia,
        justificacion: values.justificacion?.trim() || undefined,
      })
      toast.success('Ausencia registrada')
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
          <DialogTitle>Registrar Ausencia</DialogTitle>
          <DialogDescription>
            La medida disciplinaria y descuentos se calculan automáticamente según el tipo.
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Fecha *</Label>
              <Input type="date" {...form.register('fecha')} />
              {errors.fecha && (
                <p className="mt-1 text-xs text-destructive">{errors.fecha.message}</p>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Tipo *</Label>
              <Select
                value={form.watch('tipoAusencia')}
                onValueChange={(v) =>
                  form.setValue('tipoAusencia', v as AusenciaFormValues['tipoAusencia'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGLAS_AUSENCIA.map((r) => (
                    <SelectItem key={r.tipo} value={r.tipo}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              {...form.register('presentoConstancia')}
            />
            Presentó constancia
            {regla?.requiereConstancia && (
              <span className="text-xs text-amber-700">(recomendada para este tipo)</span>
            )}
          </label>

          <div>
            <Label className="mb-1.5 block">Justificación / Comentarios</Label>
            <Textarea
              rows={2}
              placeholder="Opcional"
              {...form.register('justificacion')}
            />
          </div>

          {regla && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">{regla.label}</p>
              <p className="text-xs text-muted-foreground">{regla.descripcion}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span>
                  Días a descontar:{' '}
                  <strong className="tabular-nums">{regla.diasDescontar}</strong>
                </span>
                <span>
                  Séptimo: <strong>{regla.descontarSeptimo ? 'Sí' : 'No'}</strong>
                </span>
                <span>
                  Paga IGSS: <strong>{regla.pagaIGSS ? 'Sí' : 'No'}</strong>
                </span>
              </div>
              {regla.descontarSeptimo && (
                <p className="text-xs text-amber-700">
                  El séptimo se descuenta una sola vez por semana, aunque haya múltiples
                  ausencias en esos días.
                </p>
              )}
            </div>
          )}

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
