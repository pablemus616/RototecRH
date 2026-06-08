import { useState } from 'react'
import { Check, Copy, PartyPopper } from 'lucide-react'
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

export interface AltaResumen {
  id: number
  nombre: string
  puesto: string
  departamento: string
  codigoBiotime: string
}

export function BiotimeCodeDialog({
  resumen,
  onClose,
}: {
  resumen: AltaResumen | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const open = resumen != null

  async function copiar() {
    if (!resumen) return
    try {
      await navigator.clipboard.writeText(resumen.codigoBiotime)
      setCopied(true)
      toast.success('Código copiado')
    } catch {
      toast.error('No se pudo copiar; cópialo manualmente')
    }
  }

  function handleClose() {
    setCopied(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && copied) handleClose() }}>
      <DialogContent
        onEscapeKeyDown={(e) => { if (!copied) e.preventDefault() }}
        onInteractOutside={(e) => { if (!copied) e.preventDefault() }}
        onPointerDownOutside={(e) => { if (!copied) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-emerald-600" />
            Empleado creado
          </DialogTitle>
          <DialogDescription>
            Copia el código de Biotime para registrarlo en el biométrico. Es obligatorio copiarlo para cerrar.
          </DialogDescription>
        </DialogHeader>

        {resumen && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-medium tabular-nums">{resumen.id}</dd>
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{resumen.nombre}</dd>
              <dt className="text-muted-foreground">Puesto</dt>
              <dd className="font-medium">{resumen.puesto}</dd>
              <dt className="text-muted-foreground">Departamento</dt>
              <dd className="font-medium">{resumen.departamento}</dd>
            </dl>

            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-secondary/40 p-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Código Biotime</div>
                <div className="truncate font-mono text-3xl font-bold tracking-wider">{resumen.codigoBiotime}</div>
              </div>
              <Button type="button" variant={copied ? 'outline' : 'default'} onClick={copiar} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleClose} disabled={!copied}>
            {copied ? 'Cerrar' : 'Copia el código para cerrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
