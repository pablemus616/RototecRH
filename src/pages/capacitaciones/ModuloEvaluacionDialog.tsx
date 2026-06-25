import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCreateEvaluacion,
  useCreatePregunta,
  useCreateRespuesta,
  useDeleteEvaluacion,
  useDeletePregunta,
  useDeleteRespuesta,
  useEvaluacion,
} from '@/hooks/useCapacitaciones'
import {
  preguntaSchema,
  respuestaSchema,
  type PreguntaFormValues,
  type RespuestaFormValues,
} from '@/lib/validators'
import type { Pregunta } from '@/types'

interface Props {
  idModulo: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModuloEvaluacionDialog({ idModulo, open, onOpenChange }: Props) {
  const { data, isLoading, isError } = useEvaluacion(open ? idModulo : undefined)
  const createEval = useCreateEvaluacion(idModulo ?? 0)
  const deleteEval = useDeleteEvaluacion(idModulo ?? 0)

  async function onCreate() {
    if (idModulo === undefined) return
    try {
      await createEval.mutateAsync({ idModulo })
      toast.success('Evaluación creada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear')
    }
  }
  async function onDeleteEval() {
    if (!data) return
    if (!window.confirm('¿Eliminar la evaluación completa?')) return
    try {
      await deleteEval.mutateAsync(data.evaluacion.id)
      toast.success('Evaluación eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Evaluación del módulo</DialogTitle>
          <DialogDescription>
            {data?.evaluacion.nombre ?? 'Define preguntas y respuestas para la evaluación.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <p className="text-center text-sm text-destructive">Error al cargar la evaluación</p>
        ) : !data ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Este módulo no tiene evaluación todavía.
            </p>
            <Button onClick={onCreate} disabled={createEval.isPending || idModulo === undefined}>
              <Plus className="h-4 w-4" />
              Crear evaluación
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {idModulo !== undefined && (
              <NuevaPregunta idModulo={idModulo} idEvaluacion={data.evaluacion.id} />
            )}

            {data.preguntas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin preguntas todavía</p>
            ) : (
              data.preguntas.map((p) => (
                <PreguntaCard key={p.id} idModulo={idModulo as number} pregunta={p} />
              ))
            )}

            <DialogFooter>
              <Button variant="destructive" onClick={onDeleteEval} disabled={deleteEval.isPending}>
                <Trash2 className="h-4 w-4" />
                Eliminar evaluación
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function NuevaPregunta({ idModulo, idEvaluacion }: { idModulo: number; idEvaluacion: number }) {
  const createMut = useCreatePregunta(idModulo)
  const form = useForm<PreguntaFormValues>({
    resolver: zodResolver(preguntaSchema),
    defaultValues: { pregunta: '' },
  })

  async function onSubmit(values: PreguntaFormValues) {
    try {
      await createMut.mutateAsync({
        idEvaluacion,
        input: { pregunta: values.pregunta, puntosPorRespuesta: values.puntosPorRespuesta },
      })
      toast.success('Pregunta agregada')
      form.reset({ pregunta: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <form
      className="flex items-end gap-2 rounded-md border bg-muted/40 p-3"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex-1">
        <Label className="mb-1.5 block">Nueva pregunta</Label>
        <Input placeholder="Texto de la pregunta" {...form.register('pregunta')} />
        {form.formState.errors.pregunta && (
          <p className="mt-1 text-xs text-destructive">
            {form.formState.errors.pregunta.message}
          </p>
        )}
      </div>
      <div className="w-24">
        <Label className="mb-1.5 block">Puntos</Label>
        <Input type="number" step="any" {...form.register('puntosPorRespuesta')} />
      </div>
      <Button type="submit" disabled={createMut.isPending}>
        <Plus className="h-4 w-4" />
        Agregar
      </Button>
    </form>
  )
}

function PreguntaCard({ idModulo, pregunta }: { idModulo: number; pregunta: Pregunta }) {
  const deletePregunta = useDeletePregunta(idModulo)
  const deleteRespuesta = useDeleteRespuesta(idModulo)
  const createRespuesta = useCreateRespuesta(idModulo)
  const [nueva, setNueva] = useState('')
  const [correcta, setCorrecta] = useState(false)

  async function onDeletePregunta() {
    if (!window.confirm('¿Eliminar esta pregunta?')) return
    try {
      await deletePregunta.mutateAsync(pregunta.id)
      toast.success('Pregunta eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }
  async function onAddRespuesta() {
    const parsed = respuestaSchema.safeParse({ respuesta: nueva, respuestaCorrecta: correcta })
    if (!parsed.success) {
      toast.error('Escribe el texto de la respuesta')
      return
    }
    const values: RespuestaFormValues = parsed.data
    try {
      await createRespuesta.mutateAsync({
        idPregunta: pregunta.id,
        input: { respuesta: values.respuesta, respuestaCorrecta: values.respuestaCorrecta },
      })
      toast.success('Respuesta agregada')
      setNueva('')
      setCorrecta(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }
  async function onDeleteRespuesta(id: number) {
    try {
      await deleteRespuesta.mutateAsync(id)
      toast.success('Respuesta eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{pregunta.pregunta}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeletePregunta}
          disabled={deletePregunta.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ul className="mt-2 space-y-1">
        {pregunta.respuestas.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-sm"
          >
            <span className="flex items-center gap-2">
              {r.respuesta}
              {r.respuestaCorrecta && <Badge variant="success">Correcta</Badge>}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteRespuesta(r.id)}
              disabled={deleteRespuesta.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-end gap-2">
        <div className="flex-1">
          <Input
            placeholder="Nueva respuesta"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={correcta}
            onChange={(e) => setCorrecta(e.target.checked)}
          />
          Correcta
        </label>
        <Button size="sm" onClick={onAddRespuesta} disabled={createRespuesta.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
