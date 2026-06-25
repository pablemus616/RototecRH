import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function ReasignacionTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Reasignación de vencidos / reprobados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta función estará disponible en una próxima fase (Plan 4). Permitirá reasignar
          módulos a empleados con licencia vencida o evaluaciones reprobadas.
        </p>
      </CardContent>
    </Card>
  )
}
