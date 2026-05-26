import { Construction } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  title: string
  fase: string
}

export function PlaceholderPage({ title, fase }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Construction className="h-6 w-6 text-amber-500" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Esta sección se implementa en la {fase}.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Por ahora la navegación está habilitada pero el módulo se entregará después según el plan.
        </p>
      </CardContent>
    </Card>
  )
}
