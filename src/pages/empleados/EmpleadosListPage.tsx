import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatQ, nombreParaMostrar } from '@/lib/utils'
import { useEmpleadosList } from '@/hooks/useEmpleados'
import { EmpleadoFormSheet } from './EmpleadoFormSheet'
import { EmpleadoStatusBadge } from './EmpleadoStatusBadge'

type EstadoFilter = 'TODOS' | 'ACTIVO' | 'BAJA'
const PAGE_SIZE = 20

export default function EmpleadosListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useEmpleadosList()
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoFilter>('TODOS')
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = useMemo(() => {
    const t = filtroTexto.trim().toLowerCase()
    return (data ?? []).filter((e) => {
      if (filtroEstado !== 'TODOS' && e.estado !== filtroEstado) return false
      if (!t) return true
      const full = nombreParaMostrar(e).toLowerCase()
      return full.includes(t) || e.dpi.includes(t)
    })
  }, [data, filtroTexto, filtroEstado])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function onChangeFiltro(v: string) {
    setFiltroTexto(v)
    setPage(1)
  }
  function onChangeEstado(v: string) {
    setFiltroEstado(v as EstadoFilter)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} empleado{filtered.length === 1 ? '' : 's'} en la vista actual
        </p>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Empleado
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtroTexto}
                onChange={(e) => onChangeFiltro(e.target.value)}
                placeholder="Nombre o DPI"
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-full sm:w-56">
            <label className="text-xs font-medium text-muted-foreground">Estado</label>
            <Select value={filtroEstado} onValueChange={onChangeEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="ACTIVO">Activos</SelectItem>
                <SelectItem value="BAJA">Bajas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre completo</TableHead>
              <TableHead>DPI</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Depto.</TableHead>
              <TableHead>Jornada</TableHead>
              <TableHead className="text-right">Salario mensual</TableHead>
              <TableHead>Fecha Ingreso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-destructive">
                  Error al cargar empleados
                </TableCell>
              </TableRow>
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Sin resultados
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/empleados/${e.id}`)}
                >
                  <TableCell className="font-medium">{nombreParaMostrar(e)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.dpi}</TableCell>
                  <TableCell>{e.puesto}</TableCell>
                  <TableCell className="capitalize">
                    {e.departamento.replace(/_/g, ' / ').toLowerCase()}
                  </TableCell>
                  <TableCell className="capitalize">{e.jornada.toLowerCase()}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQ(e.salarioMensual)}
                  </TableCell>
                  <TableCell>{formatDate(e.fechaIngreso)}</TableCell>
                  <TableCell>
                    <EmpleadoStatusBadge estado={e.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        navigate(`/empleados/${e.id}`)
                      }}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Página {safePage} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <EmpleadoFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="create"
      />
    </div>
  )
}
