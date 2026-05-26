import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Users,
  Clock,
  CalendarCheck,
  CalendarX,
  FileSpreadsheet,
  Gift,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/empleados', label: 'Empleados', icon: Users },
  { to: '/turnos', label: 'Turnos', icon: Clock },
  { to: '/asistencias', label: 'Asistencias', icon: CalendarCheck },
  { to: '/ausencias', label: 'Ausencias', icon: CalendarX },
  { to: '/bonificaciones', label: 'Bonificaciones', icon: Gift },
  { to: '/planilla', label: 'Planilla', icon: FileSpreadsheet },
]

function getActiveLabel(pathname: string): string {
  const match = NAV.find((n) => pathname === n.to || pathname.startsWith(n.to + '/'))
  return match?.label ?? 'Rototec HR'
}

export function AppShell() {
  const location = useLocation()
  const activeLabel = getActiveLabel(location.pathname)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-muted/30">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Rototec HR</span>
            <span className="text-xs text-muted-foreground leading-tight">Recursos Humanos</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">v0.1.0</p>
          <p>Plan HR Rototec</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-8">
          <h1 className="text-xl font-semibold tracking-tight">{activeLabel}</h1>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
