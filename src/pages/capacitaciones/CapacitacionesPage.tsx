import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PensumsTab from './PensumsTab'
import EmpleadosTab from './EmpleadosTab'
import ReasignacionTab from './ReasignacionTab'

export default function CapacitacionesPage() {
  return (
    <Tabs defaultValue="pensums" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pensums">Pensums</TabsTrigger>
        <TabsTrigger value="empleados">Empleados</TabsTrigger>
        <TabsTrigger value="reasignacion">Reasignación</TabsTrigger>
      </TabsList>
      <TabsContent value="pensums"><PensumsTab /></TabsContent>
      <TabsContent value="empleados"><EmpleadosTab /></TabsContent>
      <TabsContent value="reasignacion"><ReasignacionTab /></TabsContent>
    </Tabs>
  )
}
