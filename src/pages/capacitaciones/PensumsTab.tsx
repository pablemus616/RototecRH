import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

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
import { NameCombobox } from '@/components/ui/name-combobox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreatePensum,
  useDeletePensum,
  usePensums,
  useUpdatePensum,
} from '@/hooks/useCapacitaciones'
import { usePuestoOptions } from '@/hooks/usePuestoOptions'
import { pensumSchema, type PensumFormValues } from '@/lib/validators'
import type { Pensum, PensumInput } from '@/types'
import { PensumEditor } from './PensumEditor'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function PensumsTab() {
  const { data, isLoading, isError } = usePensums()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Pensum | undefined>(undefined)
  const [editorId, setEditorId] = useState<number | undefined>(undefined)
  const deleteMut = useDeletePensum()

  const pensums = data ?? []

  const filtered = useMemo(() => {
    const q = norm(search.trim())
    if (!q) return pensums
    return pensums.filter((p) => norm(p.nombre).includes(q))
  }, [pensums, search])

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(p: Pensum) {
    setEditing(p)
    setFormOpen(true)
  }
  async function onDelete(p: Pensum) {
    if (!window.confirm(`¿Eliminar el pensum "${p.nombre}"?`)) return
    try {
      await deleteMut.mutateAsync(p.id)
      toast.success('Pensum eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} pensum{filtered.length === 1 ? '' : 's'}
          </p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo pensum
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead className="w-44 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-destructive">
                  Error al cargar pensums
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  {search ? 'Sin resultados para la búsqueda' : 'Sin pensums en el catálogo'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => setEditorId(p.id)}
                >
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>
                    {p.puesto ?? <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(p)}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <PensumFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? 'edit' : 'create'}
        pensum={editing}
      />

      <PensumEditor
        idPensum={editorId}
        open={editorId !== undefined}
        onOpenChange={(o) => {
          if (!o) setEditorId(undefined)
        }}
      />
    </div>
  )
}

const defaultValues = { nombre: '', puesto: '' } as PensumFormValues

function PensumFormDialog({
  open,
  onOpenChange,
  mode,
  pensum,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  pensum?: Pensum
}) {
  const createMut = useCreatePensum()
  const updateMut = useUpdatePensum(pensum?.id ?? 0)
  const isSubmitting = createMut.isPending || updateMut.isPending
  const { options: puestoOptions, isLoading: puestosLoading } = usePuestoOptions()

  const [idPuesto, setIdPuesto] = useState<number | null>(null)

  const form = useForm<PensumFormValues>({
    resolver: zodResolver(pensumSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && pensum) {
      form.reset({ nombre: pensum.nombre, puesto: pensum.puesto ?? '', idPuesto: pensum.idPuesto ?? (undefined as unknown as number) })
      setIdPuesto(pensum.idPuesto ?? null)
    } else {
      form.reset(defaultValues)
      setIdPuesto(null)
    }
  }, [open, mode, pensum, form])

  async function onSubmit(values: PensumFormValues) {
    const selectedPuesto = puestoOptions.find((o) => o.id === idPuesto)
    const input: PensumInput = {
      nombre: values.nombre,
      idPuesto: idPuesto ?? undefined,
      puesto: (selectedPuesto?.nombre ?? values.puesto) || undefined,
    }
    try {
      if (mode === 'create') {
        await createMut.mutateAsync(input)
        toast.success('Pensum creado')
      } else if (pensum) {
        await updateMut.mutateAsync(input)
        toast.success('Pensum actualizado')
      }
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
          <DialogTitle>{mode === 'create' ? 'Nuevo pensum' : 'Editar pensum'}</DialogTitle>
          <DialogDescription>
            Define el nombre y, opcionalmente, el puesto asociado.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block">Nombre *</Label>
            <Input placeholder="Ej: Inducción operario" {...form.register('nombre')} />
            {errors.nombre && (
              <p className="mt-1 text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">
              Puesto <span className="text-destructive">*</span>
            </Label>
            <NameCombobox
              options={puestoOptions}
              value={idPuesto}
              onChange={(val) => {
                setIdPuesto(val)
                form.setValue('idPuesto', val as number, { shouldValidate: true })
              }}
              placeholder={puestosLoading ? 'Cargando puestos…' : 'Selecciona un puesto'}
              searchPlaceholder="Buscar puesto…"
              disabled={puestosLoading}
            />
            {errors.idPuesto && (
              <p className="mt-1 text-xs text-destructive">{errors.idPuesto.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : mode === 'create' ? 'Crear pensum' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
