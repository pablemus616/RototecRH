import { Badge } from '@/components/ui/badge'
import type { EstadoEmpleadoType } from '@/types'

export function EmpleadoStatusBadge({ estado }: { estado: EstadoEmpleadoType }) {
  if (estado === 'ACTIVO') {
    return <Badge variant="success">Activo</Badge>
  }
  return <Badge variant="destructive">Baja</Badge>
}
