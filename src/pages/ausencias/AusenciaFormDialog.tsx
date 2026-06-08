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
import { EmpleadoCombobox } from '@/components/ui/employee-combobox'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { useActualizarAusencia, useCrearAusencia, useTiposAusencia } from '@/hooks/useAusenciasBackend'
import { nombreEmpleado } from '@/lib/utils'
import { ausenciaCreateSchema, type AusenciaCreateValues } from '@/lib/validators'
import type { AusenciaBackend } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ausencia?: AusenciaBackend | null
}

const today = () => new Date().toISOString().slice(0, 10)

const vacio: AusenciaCreateValues = {
  idEmpleado: undefined as unknown as number,
  tipoAusencia: undefined as unknown as number,
  fechaAusencia: today(),
  fechaSolicitudPermiso: '',
  presentoConstancia: false,
  comentarios: '',
}

export function AusenciaFormDialog({ open, onOpenChange, ausencia }: Props) {
  const editing = Boolean(ausencia)
  const { data: empleados } = useEmpleadosBackendList()
  const { data: tipos } = useTiposAusencia()
  const crear = useCrearAusencia()
  const actualizar = useActualizarAusencia(ausencia?.id ?? 0)
  const isPending = crear.isPending || actualizar.isPending

  const form = useForm<AusenciaCreateValues>({
    resolver: zodResolver(ausenciaCreateSchema),
    defaultValues: vacio,
  })

  useEffect(() => {
    if (!open) return
    if (ausencia) {
      form.reset({
        idEmpleado: ausencia.idEmpleado,
        tipoAusencia: ausencia.tipoAusencia,
        fechaAusencia: ausencia.fechaAusencia?.slice(0, 10) ?? today(),
        fechaSolicitudPermiso: ausencia.fechaSolicitudPermiso?.slice(0, 10) ?? '',
        presentoConstancia: ausencia.presentoConstancia,
        comentarios: ausencia.comentarios ?? '',
      })
    } else {
      form.reset({ ...vacio, fechaAusencia: today() })
    }
  }, [open, ausencia, form])

  const empleadosOrdenados = useMemo(() => {
    return (empleados ?? [])
      .filter((e) => e.estaActivo)
      .map((e) => ({ id: e.id, nombre: nombreEmpleado(e) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [empleados])

  const tipoSel = (tipos ?? []).find((t) => t.id === Number(form.watch('tipoAusencia')))
  const errors = form.formState.errors

  async function onSubmit(values: AusenciaCreateValues) {
    const comentarios = values.comentarios?.trim() || undefined
    const fechaSolicitudPermiso = values.fechaSolicitudPermiso?.trim() || undefined
    try {
      if (ausencia) {
        await actualizar.mutateAsync({
          tipoAusencia: values.tipoAusencia,
          fechaAusencia: values.fechaAusencia,
          fechaSolicitudPermiso,
          presentoConstancia: values.presentoConstancia,
          comentarios,
        })
        toast.success('Ausencia actualizada')
      } else {
        await crear.mutateAsync({
          idEmpleado: values.idEmpleado,
          tipoAusencia: values.tipoAusencia,
          fechaAusencia: values.fechaAusencia,
          fechaSolicitudPermiso,
          presentoConstancia: values.presentoConstancia,
          comentarios,
        })
        toast.success('Ausencia registrada')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar ausencia' : 'Registrar ausencia'}</DialogTitle>
          <DialogDescription>
            La medida, séptimo e IGSS se toman de la regla del tipo seleccionado.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block">Empleado *</Label>
            <EmpleadoCombobox
              empleados={empleadosOrdenados}
              value={form.watch('idEmpleado') ?? null}
              onChange={(id) => form.setValue('idEmpleado', (id ?? undefined) as never, { shouldValidate: true })}
              disabled={editing}
            />
            {errors.idEmpleado && (
              <p className="mt-1 text-xs text-destructive">{errors.idEmpleado.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Fecha *</Label>
              <Input type="date" {...form.register('fechaAusencia')} />
              {errors.fechaAusencia && (
                <p className="mt-1 text-xs text-destructive">{errors.fechaAusencia.message}</p>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de solicitud</Label>
              <Input type="date" {...form.register('fechaSolicitudPermiso')} />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Tipo *</Label>
            <Select
              value={form.watch('tipoAusencia') ? String(form.watch('tipoAusencia')) : undefined}
              onValueChange={(v) => form.setValue('tipoAusencia', Number(v) as never, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {(tipos ?? []).map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipoAusencia && (
              <p className="mt-1 text-xs text-destructive">{errors.tipoAusencia.message}</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register('presentoConstancia')} />
            Presentó constancia
            {tipoSel?.requiereConstancia && (
              <span className="text-xs text-amber-700">(recomendada para este tipo)</span>
            )}
          </label>

          <div>
            <Label className="mb-1.5 block">Comentarios</Label>
            <Textarea rows={2} placeholder="Opcional" {...form.register('comentarios')} />
          </div>

          {tipoSel && (
            <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{tipoSel.nombre}</p>
              {tipoSel.descripcion && <p className="text-xs text-muted-foreground">{tipoSel.descripcion}</p>}
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span>
                  Días a descontar: <strong className="tabular-nums">{tipoSel.diasDescontar}</strong>
                </span>
                <span>
                  Séptimo: <strong>{tipoSel.descontarSeptimo ? 'Sí' : 'No'}</strong>
                </span>
                <span>
                  Paga IGSS: <strong>{tipoSel.pagaIGSS ? 'Sí' : 'No'}</strong>
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : editing ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
