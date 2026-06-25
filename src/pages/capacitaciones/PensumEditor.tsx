import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateModulo,
  useCreateTema,
  useDeleteModulo,
  useDeleteTema,
  usePensumArbol,
  useUpdateModulo,
} from '@/hooks/useCapacitaciones'
import {
  moduloSchema,
  temaSchema,
  type ModuloFormValues,
  type TemaFormValues,
} from '@/lib/validators'
import type { ModuloInput, PensumModuloArbol, TemaInput } from '@/types'
import { ModuloEvaluacionDialog } from './ModuloEvaluacionDialog'

interface Props {
  idPensum: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PensumEditor({ idPensum, open, onOpenChange }: Props) {
  const { data, isLoading, isError } = usePensumArbol(open ? idPensum : undefined)
  const [moduloDialog, setModuloDialog] = useState<{ mode: 'create' | 'edit'; modulo?: PensumModuloArbol } | null>(null)
  const [temaModuloId, setTemaModuloId] = useState<number | null>(null)
  const [evalModuloId, setEvalModuloId] = useState<number | null>(null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{data?.nombre ?? 'Pensum'}</SheetTitle>
          <SheetDescription>
            {data?.puesto ? `Puesto: ${data.puesto}` : 'Edita módulos, temas y evaluaciones'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setModuloDialog({ mode: 'create' })}
              disabled={!idPensum}
            >
              <Plus className="h-4 w-4" />
              Agregar módulo
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isError ? (
            <p className="text-center text-sm text-destructive">Error al cargar el pensum</p>
          ) : !data || data.modulos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Este pensum no tiene módulos todavía
            </p>
          ) : (
            data.modulos.map((m) => (
              <ModuloCard
                key={m.id}
                idPensum={idPensum as number}
                modulo={m}
                onEdit={() => setModuloDialog({ mode: 'edit', modulo: m })}
                onAddTema={() => setTemaModuloId(m.id)}
                onEvaluacion={() => setEvalModuloId(m.id)}
              />
            ))
          )}
        </div>

        {idPensum !== undefined && moduloDialog && (
          <ModuloFormDialog
            idPensum={idPensum}
            open
            onOpenChange={(o) => !o && setModuloDialog(null)}
            mode={moduloDialog.mode}
            modulo={moduloDialog.modulo}
          />
        )}
        {idPensum !== undefined && temaModuloId !== null && (
          <TemaFormDialog
            idPensum={idPensum}
            idModulo={temaModuloId}
            open
            onOpenChange={(o) => !o && setTemaModuloId(null)}
          />
        )}
        <ModuloEvaluacionDialog
          idModulo={evalModuloId ?? undefined}
          open={evalModuloId !== null}
          onOpenChange={(o) => !o && setEvalModuloId(null)}
        />
      </SheetContent>
    </Sheet>
  )
}

function ModuloCard({
  idPensum,
  modulo,
  onEdit,
  onAddTema,
  onEvaluacion,
}: {
  idPensum: number
  modulo: PensumModuloArbol
  onEdit: () => void
  onAddTema: () => void
  onEvaluacion: () => void
}) {
  const deleteMod = useDeleteModulo(idPensum)
  const deleteTema = useDeleteTema(idPensum)

  async function onDeleteModulo() {
    if (!window.confirm(`¿Eliminar el módulo "${modulo.modulo}"?`)) return
    try {
      await deleteMod.mutateAsync(modulo.id)
      toast.success('Módulo eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }
  async function onDeleteTema(id: number) {
    try {
      await deleteTema.mutateAsync(id)
      toast.success('Tema eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{modulo.modulo}</CardTitle>
          {modulo.objetivo && (
            <p className="mt-1 text-sm text-muted-foreground">{modulo.objetivo}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {modulo.duracionHoras != null && (
              <Badge variant="outline">{modulo.duracionHoras} h</Badge>
            )}
            {modulo.tipoEvaluacion && <Badge variant="secondary">{modulo.tipoEvaluacion}</Badge>}
            {modulo.porcentajeAprobacion != null && (
              <Badge variant="outline">Aprob. {modulo.porcentajeAprobacion}%</Badge>
            )}
            {modulo.bono && <Badge variant="success">Bono</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeleteModulo} disabled={deleteMod.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Temas</span>
            <Button variant="ghost" size="sm" onClick={onAddTema}>
              <Plus className="h-4 w-4" />
              Tema
            </Button>
          </div>
          {modulo.temas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin temas</p>
          ) : (
            <ul className="space-y-1">
              {modulo.temas.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
                >
                  <span>
                    {t.tema}
                    {t.modalidad && (
                      <span className="ml-2 text-xs text-muted-foreground">({t.modalidad})</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteTema(t.id)}
                    disabled={deleteTema.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onEvaluacion}>
          <ClipboardList className="h-4 w-4" />
          Evaluación
        </Button>
      </CardContent>
    </Card>
  )
}

const moduloDefaults: ModuloFormValues = {
  modulo: '',
  objetivo: '',
  tipoEvaluacion: '',
  instrumentos: '',
}

function ModuloFormDialog({
  idPensum,
  open,
  onOpenChange,
  mode,
  modulo,
}: {
  idPensum: number
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  modulo?: PensumModuloArbol
}) {
  const createMut = useCreateModulo(idPensum)
  const updateMut = useUpdateModulo(idPensum)
  const isSubmitting = createMut.isPending || updateMut.isPending

  const form = useForm<ModuloFormValues>({
    resolver: zodResolver(moduloSchema),
    defaultValues: moduloDefaults,
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && modulo) {
      form.reset({
        modulo: modulo.modulo,
        objetivo: modulo.objetivo ?? '',
        duracionHoras: modulo.duracionHoras ?? undefined,
        capacitador: modulo.capacitador ?? undefined,
        tipoEvaluacion: modulo.tipoEvaluacion ?? '',
        instrumentos: modulo.instrumentos ?? '',
        porcentajeAprobacion: modulo.porcentajeAprobacion ?? undefined,
        vigencia: modulo.vigencia ?? undefined,
        bono: modulo.bono ?? false,
      })
    } else {
      form.reset(moduloDefaults)
    }
  }, [open, mode, modulo, form])

  async function onSubmit(values: ModuloFormValues) {
    const input: ModuloInput = {
      modulo: values.modulo,
      objetivo: values.objetivo || undefined,
      duracionHoras: values.duracionHoras,
      capacitador: values.capacitador,
      tipoEvaluacion: values.tipoEvaluacion || undefined,
      instrumentos: values.instrumentos || undefined,
      porcentajeAprobacion: values.porcentajeAprobacion,
      vigencia: values.vigencia,
      bono: values.bono,
    }
    try {
      if (mode === 'create') {
        await createMut.mutateAsync(input)
        toast.success('Módulo creado')
      } else if (modulo) {
        await updateMut.mutateAsync({ id: modulo.id, input })
        toast.success('Módulo actualizado')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo módulo' : 'Editar módulo'}</DialogTitle>
          <DialogDescription>Datos del módulo del pensum.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block">Módulo *</Label>
            <Input {...form.register('modulo')} />
            {errors.modulo && (
              <p className="mt-1 text-xs text-destructive">{errors.modulo.message}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">Objetivo</Label>
            <Textarea rows={2} {...form.register('objetivo')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Duración (horas)</Label>
              <Input type="number" step="any" {...form.register('duracionHoras')} />
            </div>
            <div>
              <Label className="mb-1.5 block">% Aprobación</Label>
              <Input type="number" {...form.register('porcentajeAprobacion')} />
            </div>
            <div>
              <Label className="mb-1.5 block">Vigencia (meses)</Label>
              <Input type="number" {...form.register('vigencia')} />
            </div>
            <div>
              <Label className="mb-1.5 block">Capacitador (id)</Label>
              <Input type="number" {...form.register('capacitador')} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Tipo de evaluación</Label>
            <Input {...form.register('tipoEvaluacion')} />
          </div>
          <div>
            <Label className="mb-1.5 block">Instrumentos</Label>
            <Input {...form.register('instrumentos')} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              {...form.register('bono')}
            />
            Otorga bono
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : mode === 'create' ? 'Crear módulo' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const temaDefaults: TemaFormValues = { tema: '', modalidad: '', recursos: '' }

function TemaFormDialog({
  idPensum,
  idModulo,
  open,
  onOpenChange,
}: {
  idPensum: number
  idModulo: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMut = useCreateTema(idPensum)
  const form = useForm<TemaFormValues>({
    resolver: zodResolver(temaSchema),
    defaultValues: temaDefaults,
  })

  useEffect(() => {
    if (open) form.reset(temaDefaults)
  }, [open, form])

  async function onSubmit(values: TemaFormValues) {
    const input: TemaInput = {
      tema: values.tema,
      modalidad: values.modalidad || undefined,
      recursos: values.recursos || undefined,
    }
    try {
      await createMut.mutateAsync({ idModulo, input })
      toast.success('Tema agregado')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo tema</DialogTitle>
          <DialogDescription>Agrega un tema al módulo.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block">Tema *</Label>
            <Input {...form.register('tema')} />
            {errors.tema && (
              <p className="mt-1 text-xs text-destructive">{errors.tema.message}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">Modalidad</Label>
            <Input {...form.register('modalidad')} />
          </div>
          <div>
            <Label className="mb-1.5 block">Recursos</Label>
            <Input {...form.register('recursos')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Guardando…' : 'Agregar tema'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
