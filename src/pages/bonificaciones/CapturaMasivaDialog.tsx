import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import {
  DEPARTAMENTOS_ROTOTEC,
} from '@/constants/guatemala'
import { useEmpleadosList } from '@/hooks/useEmpleados'
import { useCreateBonificacionesBatch } from '@/hooks/useBonificaciones'
import { formatQ, nombreParaMostrar } from '@/lib/utils'
import {
  bonificacionBatchSchema,
  type BonificacionBatchFormValues,
} from '@/lib/validators'
import type { TipoBonificacion } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodo: string
}

type FiltroDept = 'TODOS' | (typeof DEPARTAMENTOS_ROTOTEC)[number]['value']

export function CapturaMasivaDialog({ open, onOpenChange, periodo }: Props) {
  const { data: empleados } = useEmpleadosList()
  const crear = useCreateBonificacionesBatch()
  const [filtroDept, setFiltroDept] = useState<FiltroDept>('TODOS')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  const form = useForm<BonificacionBatchFormValues>({
    resolver: zodResolver(bonificacionBatchSchema),
    defaultValues: {
      empleadoIds: [],
      periodo,
      tipo: 'PRODUCCION_ACABADOS',
      monto: 0,
      descripcion: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        empleadoIds: [],
        periodo,
        tipo: 'PRODUCCION_ACABADOS',
        monto: 0,
        descripcion: '',
      })
      setSeleccionados(new Set())
      setFiltroDept('TODOS')
    }
  }, [open, periodo, form])

  const empleadosActivos = useMemo(() => {
    return (empleados ?? [])
      .filter((e) => e.estado === 'ACTIVO')
      .sort((a, b) => nombreParaMostrar(a).localeCompare(nombreParaMostrar(b)))
  }, [empleados])

  const empleadosVisibles = useMemo(() => {
    if (filtroDept === 'TODOS') return empleadosActivos
    return empleadosActivos.filter((e) => e.departamento === filtroDept)
  }, [empleadosActivos, filtroDept])

  function toggleEmp(id: string) {
    setSeleccionados((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function seleccionarTodosVisibles() {
    setSeleccionados((s) => {
      const n = new Set(s)
      for (const e of empleadosVisibles) n.add(e.id)
      return n
    })
  }
  function deseleccionarVisibles() {
    setSeleccionados((s) => {
      const n = new Set(s)
      for (const e of empleadosVisibles) n.delete(e.id)
      return n
    })
  }

  async function onSubmit(values: BonificacionBatchFormValues) {
    const ids = [...seleccionados]
    if (ids.length === 0) {
      toast.error('Selecciona al menos un empleado')
      return
    }
    try {
      const creadas = await crear.mutateAsync({
        empleadoIds: ids,
        periodo: values.periodo,
        tipo: values.tipo as TipoBonificacion,
        monto: Number(values.monto),
        descripcion: values.descripcion?.trim() || undefined,
      })
      toast.success(`${creadas.length} bonificaciones creadas`)
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      toast.error(msg)
    }
  }

  const errors = form.formState.errors
  const totalEstimado = seleccionados.size * Number(form.watch('monto') || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Captura masiva de bonificaciones</DialogTitle>
          <DialogDescription>
            Asigna el mismo tipo y monto a varios empleados a la vez. Período {periodo}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Tipo *</Label>
              <Select
                value={form.watch('tipo')}
                onValueChange={(v) =>
                  form.setValue('tipo', v as BonificacionBatchFormValues['tipo'])
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
              <Label className="mb-1.5 block">Monto por empleado (Q) *</Label>
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

          <Card className="p-3">
            <div className="mb-2 flex items-center gap-2">
              <Label className="text-xs">Filtrar por departamento:</Label>
              <Select
                value={filtroDept}
                onValueChange={(v) => setFiltroDept(v as FiltroDept)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {DEPARTAMENTOS_ROTOTEC.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={seleccionarTodosVisibles}
              >
                Marcar visibles
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={deseleccionarVisibles}
              >
                Quitar visibles
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded border">
              <ul className="divide-y text-sm">
                {empleadosVisibles.length === 0 ? (
                  <li className="p-3 text-center text-muted-foreground">
                    No hay empleados que coincidan.
                  </li>
                ) : (
                  empleadosVisibles.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 px-3 py-1.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={seleccionados.has(e.id)}
                        onChange={() => toggleEmp(e.id)}
                      />
                      <span className="flex-1 truncate">{nombreParaMostrar(e)}</span>
                      <span className="text-xs text-muted-foreground">
                        {e.puesto}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span>
                Seleccionados: <Badge variant="secondary">{seleccionados.size}</Badge>
              </span>
              <span className="text-muted-foreground">
                Total estimado: <strong>{formatQ(totalEstimado)}</strong>
              </span>
            </div>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={crear.isPending || seleccionados.size === 0}
            >
              {crear.isPending ? 'Guardando…' : `Crear ${seleccionados.size} bonificaciones`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
