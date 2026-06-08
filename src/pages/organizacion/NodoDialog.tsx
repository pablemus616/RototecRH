import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { extractApiErrorMessage } from '@/api/client'
import {
  useActualizarDepartamento,
  useActualizarPuesto,
  useActualizarSubDepartamento,
  useCrearDepartamento,
  useCrearPuesto,
  useCrearSubDepartamento,
} from '@/hooks/useEstructura'

export type Nivel = 'departamento' | 'subdepartamento' | 'puesto'

export interface NodoDialogState {
  open: boolean
  nivel: Nivel
  mode: 'crear' | 'editar'
  /** empresaId (depto) · idDepartamento (sub) · idSubdepartamento (puesto) */
  parentId?: number
  nodo?: { id: number; nombre: string; codigo?: string | null; codigoBiotime?: number | null }
}

const LABEL: Record<Nivel, string> = {
  departamento: 'departamento',
  subdepartamento: 'sub-departamento',
  puesto: 'puesto',
}

const MAX_NOMBRE: Record<Nivel, number> = {
  departamento: 25,
  subdepartamento: 50,
  puesto: 255,
}

function makeSchema(nivel: Nivel) {
  return z.object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Requerido')
      .max(MAX_NOMBRE[nivel], `Máximo ${MAX_NOMBRE[nivel]} caracteres`),
    codigo: z.string().trim().max(20, 'Máximo 20 caracteres').optional(),
    codigoBiotime: z.string().trim().regex(/^\d*$/, 'Solo números enteros').optional(),
  })
}
type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function NodoDialog({
  state,
  onOpenChange,
}: {
  state: NodoDialogState
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {state.open && (
          <NodoForm
            key={`${state.nivel}-${state.mode}-${state.nodo?.id ?? 'new'}`}
            state={state}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NodoForm({ state, onDone }: { state: NodoDialogState; onDone: () => void }) {
  const { nivel, mode, parentId, nodo } = state
  const label = LABEL[nivel]

  const crearDepto = useCrearDepartamento()
  const actDepto = useActualizarDepartamento()
  const crearSub = useCrearSubDepartamento()
  const actSub = useActualizarSubDepartamento()
  const crearPuesto = useCrearPuesto()
  const actPuesto = useActualizarPuesto()

  const pending =
    crearDepto.isPending ||
    actDepto.isPending ||
    crearSub.isPending ||
    actSub.isPending ||
    crearPuesto.isPending ||
    actPuesto.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(makeSchema(nivel)),
    defaultValues: {
      nombre: nodo?.nombre ?? '',
      codigo: nodo?.codigo ?? '',
      codigoBiotime: nodo?.codigoBiotime != null ? String(nodo.codigoBiotime) : '',
    },
  })

  async function onSubmit(values: FormValues) {
    const nombre = values.nombre.trim()
    const codigo = (values.codigo ?? '').trim()
    const codigoBiotime = values.codigoBiotime?.trim() ? Number(values.codigoBiotime) : undefined
    try {
      if (nivel === 'departamento') {
        if (mode === 'crear') await crearDepto.mutateAsync({ departamento: nombre, codigo, empresaId: parentId! })
        else await actDepto.mutateAsync({ id: nodo!.id, input: { departamento: nombre, codigo } })
      } else if (nivel === 'subdepartamento') {
        if (mode === 'crear') await crearSub.mutateAsync({ nombre, idDepartamento: parentId! })
        else await actSub.mutateAsync({ id: nodo!.id, input: { nombre } })
      } else {
        if (mode === 'crear') await crearPuesto.mutateAsync({ nombre, idSubdepartamento: parentId!, codigoBiotime })
        else await actPuesto.mutateAsync({ id: nodo!.id, input: { nombre, codigoBiotime } })
      }
      toast.success(mode === 'crear' ? `Se creó el ${label}` : `Se guardó el ${label}`)
      onDone()
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  const errors = form.formState.errors

  return (
    <>
      <DialogHeader>
        <DialogTitle className="capitalize">
          {mode === 'crear' ? `Nuevo ${label}` : `Editar ${label}`}
        </DialogTitle>
        <DialogDescription>
          {nivel === 'puesto'
            ? 'El código Biotime es opcional y enlaza el puesto con el reloj.'
            : nivel === 'departamento'
              ? 'Nombre corto (máx. 25) y un código opcional.'
              : 'Nombre del sub-departamento.'}
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <Label className="mb-1.5 block">Nombre *</Label>
          <Input autoFocus maxLength={MAX_NOMBRE[nivel]} {...form.register('nombre')} />
          {errors.nombre && <p className="mt-1 text-xs text-destructive">{errors.nombre.message}</p>}
        </div>

        {nivel === 'departamento' && (
          <div>
            <Label className="mb-1.5 block">Código</Label>
            <Input maxLength={20} placeholder="Opcional" {...form.register('codigo')} />
            {errors.codigo && <p className="mt-1 text-xs text-destructive">{errors.codigo.message}</p>}
          </div>
        )}

        {nivel === 'puesto' && (
          <div>
            <Label className="mb-1.5 block">Código Biotime</Label>
            <Input inputMode="numeric" placeholder="Opcional" {...form.register('codigoBiotime')} />
            {errors.codigoBiotime && (
              <p className="mt-1 text-xs text-destructive">{errors.codigoBiotime.message}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Guardando…' : mode === 'crear' ? 'Crear' : 'Guardar'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
