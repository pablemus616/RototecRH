import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import EmpleadosListPage from '@/pages/empleados/EmpleadosListPage'
import EmpleadoDetailPage from '@/pages/empleados/EmpleadoDetailPage'
import TurnosListPage from '@/pages/turnos/TurnosListPage'
import AsistenciasListPage from '@/pages/asistencias/AsistenciasListPage'
import AsistenciaEmpleadoPage from '@/pages/asistencias/AsistenciaEmpleadoPage'
import AusenciasPage from '@/pages/ausencias/AusenciasPage'
import BonificacionesPage from '@/pages/bonificaciones/BonificacionesPage'
import PlanillaPage from '@/pages/planilla/PlanillaPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/empleados" replace /> },
      { path: 'empleados', element: <EmpleadosListPage /> },
      { path: 'empleados/:id', element: <EmpleadoDetailPage /> },
      { path: 'turnos', element: <TurnosListPage /> },
      { path: 'asistencias', element: <AsistenciasListPage /> },
      { path: 'asistencias/:id', element: <AsistenciaEmpleadoPage /> },
      { path: 'ausencias', element: <AusenciasPage /> },
      { path: 'bonificaciones', element: <BonificacionesPage /> },
      { path: 'planilla', element: <PlanillaPage /> },
      { path: '*', element: <Navigate to="/empleados" replace /> },
    ],
  },
])
