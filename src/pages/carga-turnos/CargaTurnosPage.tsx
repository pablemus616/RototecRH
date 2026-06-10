import { useRef, useState } from 'react'
import { Check, Download, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { cargaTurnosApi } from '@/api/cargaTurnos'
import type { PreviewTurnos } from '@/types'
import PreviewTurnosDialog from './PreviewTurnosDialog'

export default function CargaTurnosPage() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [area, setArea] = useState<1 | 2>(2)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewTurnos | null>(null)
  const [cargando, setCargando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [resultado, setResultado] = useState<{ acabados: number; maquinas: number; avisos: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const rangoOk = Boolean(desde && hasta && desde <= hasta)

  const descargar = async () => {
    const blob = await cargaTurnosApi.descargarPlantilla(desde, hasta, area)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla_turnos_${area === 1 ? 'acabados' : 'maquinas'}_${desde}_a_${hasta}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const limpiar = () => {
    setPreview(null)
    setArchivo(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onArchivo = async (f: File) => {
    setArchivo(f)
    setCargando(true)
    setPreview(null)
    setResultado(null)
    try {
      setPreview(await cargaTurnosApi.preview(f, desde, hasta, area))
    } finally {
      setCargando(false)
    }
  }

  const aplicar = async () => {
    if (!archivo) return
    setAplicando(true)
    try {
      const r = await cargaTurnosApi.aplicar(archivo, desde, hasta, area)
      setResultado(r)
      limpiar()
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-teal-500/20 to-violet-500/20 p-2.5 ring-1 ring-border">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-none tracking-tight">Carga de turnos</h1>
          <p className="mt-1 text-xs text-muted-foreground">Genera la plantilla, llénala y súbela · el sistema se infiere de los días</p>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Desde</label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 w-40" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hasta</label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 w-40" />
          </div>
          <div role="group" aria-label="Área" className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              aria-pressed={area === 1}
              onClick={() => setArea(1)}
              className={cn('h-7 rounded-md px-3 text-xs font-medium', area === 1 ? 'bg-violet-600 text-white shadow-sm' : 'text-muted-foreground')}
            >
              Acabados
            </button>
            <button
              type="button"
              aria-pressed={area === 2}
              onClick={() => setArea(2)}
              className={cn('h-7 rounded-md px-3 text-xs font-medium', area === 2 ? 'bg-teal-600 text-white shadow-sm' : 'text-muted-foreground')}
            >
              Máquinas
            </button>
          </div>
          <Button onClick={descargar} disabled={!rangoOk} variant="outline" className="h-9 gap-2">
            <Download className="h-4 w-4" /> Descargar plantilla
          </Button>
          <Button onClick={() => fileRef.current?.click()} disabled={!rangoOk || cargando} className="h-9 gap-2">
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {cargando ? 'Leyendo…' : 'Subir Excel'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onArchivo(e.target.files[0])}
          />
        </div>
        {resultado && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Check className="h-4 w-4" />
            Aplicado: <b>{resultado.acabados}</b> acabados · <b>{resultado.maquinas}</b> máquinas · {resultado.avisos} avisos
          </div>
        )}
      </Card>

      <PreviewTurnosDialog
        open={!!preview}
        preview={preview}
        area={(preview?.idArea ?? area) as 1 | 2}
        desde={desde}
        hasta={hasta}
        aplicando={aplicando}
        onCancel={limpiar}
        onConfirm={aplicar}
      />
    </div>
  )
}
