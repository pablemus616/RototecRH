import { type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAsignarPrimaria,
  useAsignarSecundaria,
  useEmpleadoCap,
  useGenerarExamen,
  usePensums,
} from '@/hooks/useCapacitaciones'
import { formatDate } from '@/lib/utils'
import {
  asignacionSecundariaSchema,
  generarExamenSchema,
  type GenerarExamenFormValues,
} from '@/lib/validators'
import type {
  AsignacionCap,
  AsignacionDetalleCap,
  GenerarExamenResult,
} from '@/types'

interface Props {
  empleadoId: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmpleadoCapDetailSheet({ empleadoId, open, onOpenChange }: Props) {
  const { data, isLoading, isError } = useEmpleadoCap(open ? empleadoId : undefined)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Capacitación del empleado</SheetTitle>
          <SheetDescription>
            Las notas, intentos y licencia son de solo lectura (se calculan al evaluar).
          </SheetDescription>
        </SheetHeader>

        {empleadoId == null ? null : isLoading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError || !data ? (
          <p className="mt-6 text-sm text-destructive">Error al cargar el detalle</p>
        ) : (
          <div className="mt-6 space-y-8">
            <PrimariaSection empleadoId={empleadoId} />
            <SecundariaSection empleadoId={empleadoId} />
            <div>
              <SectionTitle>Asignaciones</SectionTitle>
              {data.asignaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin asignaciones.</p>
              ) : (
                <div className="space-y-4">
                  {data.asignaciones.map((a) => (
                    <AsignacionCard key={a.id} asignacion={a} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h3>
      <Separator className="mb-3" />
    </>
  )
}

function PrimariaSection({ empleadoId }: { empleadoId: number }) {
  const asignar = useAsignarPrimaria()
  async function onAssign() {
    try {
      await asignar.mutateAsync([empleadoId])
      toast.success('Pensum primario asignado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }
  return (
    <div>
      <SectionTitle>Asignación primaria</SectionTitle>
      <Button size="sm" onClick={onAssign} disabled={asignar.isPending}>
        Asignar pensum primario (por puesto)
      </Button>
    </div>
  )
}

function SecundariaSection({ empleadoId }: { empleadoId: number }) {
  const { data: pensums } = usePensums()
  const asignar = useAsignarSecundaria(empleadoId)
  const [idPensum, setIdPensum] = useState<string>('')

  async function onAssign() {
    const parsed = asignacionSecundariaSchema.safeParse({ idPensum })
    if (!parsed.success) {
      toast.error('Selecciona un pensum')
      return
    }
    try {
      await asignar.mutateAsync(parsed.data.idPensum)
      toast.success('Pensum secundario asignado')
      setIdPensum('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div>
      <SectionTitle>Asignación secundaria</SectionTitle>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select value={idPensum} onValueChange={setIdPensum}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un pensum" />
            </SelectTrigger>
            <SelectContent>
              {(pensums ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onAssign} disabled={asignar.isPending || !idPensum}>
          Asignar
        </Button>
      </div>
    </div>
  )
}

function AsignacionCard({ asignacion }: { asignacion: AsignacionCap }) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant={asignacion.tipo === 'PRIMARIA' ? 'default' : 'secondary'}>
          {asignacion.tipo}
        </Badge>
        <span className="text-xs text-muted-foreground">Pensum #{asignacion.idPensum}</span>
        {asignacion.licenciaActiva ? (
          <Badge variant="success">Licencia vigente</Badge>
        ) : (
          <Badge variant="outline">Sin licencia</Badge>
        )}
      </div>
      <dl className="mb-3 space-y-1 text-xs text-muted-foreground">
        <div>Vence licencia: {asignacion.venceLicencia ? formatDate(asignacion.venceLicencia) : '—'}</div>
        <div>Finaliza: {asignacion.fechaFinaliza ? formatDate(asignacion.fechaFinaliza) : '—'}</div>
      </dl>
      <div className="space-y-2">
        {asignacion.detalles.map((d) => (
          <DetalleRow key={d.id} detalle={d} />
        ))}
      </div>
    </div>
  )
}

function estadoBadge(estado: string) {
  const e = estado.toLowerCase()
  if (e === 'aprobado') return <Badge variant="success">Aprobado</Badge>
  if (e === 'no aprobado') return <Badge variant="destructive">No aprobado</Badge>
  return <Badge variant="warning">{estado}</Badge>
}

function DetalleRow({ detalle }: { detalle: AsignacionDetalleCap }) {
  const generar = useGenerarExamen()
  const [examen, setExamen] = useState<GenerarExamenResult | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<GenerarExamenFormValues>({
    resolver: zodResolver(generarExamenSchema),
    defaultValues: { horasVigencia: 72 },
  })

  async function onGenerar(values: GenerarExamenFormValues) {
    try {
      const res = await generar.mutateAsync({
        idAsignacionDetalle: detalle.id,
        horasVigencia: values.horasVigencia,
      })
      setExamen(res)
      setDialogOpen(false)
      toast.success('Examen generado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  function copyLink() {
    if (!examen) return
    navigator.clipboard.writeText(examen.url)
    toast.success('Link copiado')
  }

  return (
    <div className="rounded border bg-muted/30 p-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-medium">Módulo #{detalle.idModulo}</span>
          <span className="text-xs text-muted-foreground">
            Nota: {detalle.puntuacion != null ? detalle.puntuacion : '—'}
          </span>
          {estadoBadge(detalle.estado)}
          <span className="text-xs text-muted-foreground">Intentos: {detalle.intentos}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          Generar examen
        </Button>
      </div>

      {examen && (
        <div className="mt-2 flex items-center gap-2">
          <Input readOnly value={examen.url} className="h-8 text-xs" />
          <Button variant="ghost" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            Copiar link
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar examen</DialogTitle>
            <DialogDescription>
              Define las horas de vigencia del link del examen.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onGenerar)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor={`horas-${detalle.id}`}>Horas de vigencia</Label>
              <Input
                id={`horas-${detalle.id}`}
                type="number"
                {...form.register('horasVigencia')}
              />
              {form.formState.errors.horasVigencia && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.horasVigencia.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={generar.isPending}>
                Generar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
