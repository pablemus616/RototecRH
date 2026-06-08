import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Stepper } from '@/components/ui/stepper'
import { empleadoCreateSchema, WIZARD_STEP_FIELDS, type EmpleadoCreateValues } from '@/lib/validators'
import type { CreateEmpleadoInput } from '@/types'
import { useCrearAltaEmpleado } from '@/hooks/useEmpleados'
import { useDepartamentos, usePuestos } from '@/hooks/useCompanyCatalogos'
import { extractApiErrorMessage } from '@/api/client'
import { WIZARD_STEPS, StepContent, numOrUndef } from './wizardSteps'
import { BiotimeCodeDialog, type AltaResumen } from './BiotimeCodeDialog'

const LAST = WIZARD_STEPS.length - 1

export default function EmpleadoCreateWizard() {
  const navigate = useNavigate()
  const crearMut = useCrearAltaEmpleado()
  const [step, setStep] = useState(0)
  const [resumen, setResumen] = useState<AltaResumen | null>(null)

  const form = useForm<EmpleadoCreateValues>({
    resolver: zodResolver(empleadoCreateSchema),
    mode: 'onTouched',
    defaultValues: { cantidad_hijos: 0, forma_pago: 'TRANSFERENCIA' },
  })

  // Reseteo en cascada: cambiar un padre limpia a sus hijos.
  const paisW = form.watch('PAIS')
  const empresaId = form.watch('empresa_id')
  const depId = form.watch('id_departamento')
  const subId = form.watch('id_sub_departamento')
  useEffect(() => {
    form.resetField('empresa_id')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paisW])
  useEffect(() => {
    form.resetField('id_departamento')
    form.resetField('id_sub_departamento')
    form.resetField('id_puesto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])
  useEffect(() => {
    form.resetField('id_sub_departamento')
    form.resetField('id_puesto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depId])
  useEffect(() => {
    form.resetField('id_puesto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId])

  // Para el resumen del diálogo (cacheado por TanStack Query, sin red extra).
  const departamentosQ = useDepartamentos(numOrUndef(empresaId))
  const puestosQ = usePuestos(numOrUndef(subId))

  async function next() {
    const ok = await form.trigger(WIZARD_STEP_FIELDS[step], { shouldFocus: true })
    if (ok) setStep((s) => Math.min(LAST, s + 1))
  }
  function back() {
    setStep((s) => Math.max(0, s - 1))
  }

  async function onSubmit(values: EmpleadoCreateValues) {
    try {
      // Quita opcionales vacíos/NaN para que el backend (@IsOptional) los omita
      // (evita "must be a valid ISO 8601 date" en fechas en blanco como reingreso).
      const payload = Object.fromEntries(
        Object.entries(values).filter(
          ([, v]) => v !== '' && v !== null && !(typeof v === 'number' && Number.isNaN(v)),
        ),
      ) as unknown as CreateEmpleadoInput
      const res = await crearMut.mutateAsync(payload)
      const nombre = [values.primer_nombre, values.segundo_nombre, values.primer_apellido, values.segundo_apellido]
        .filter(Boolean)
        .join(' ')
      setResumen({
        id: res.id,
        nombre,
        puesto: puestosQ.data?.find((p) => p.id === values.id_puesto)?.nombre ?? '—',
        departamento: departamentosQ.data?.find((d) => d.id === values.id_departamento)?.nombre ?? '—',
        codigoBiotime: res.codigoEmpleadoBio != null ? String(res.codigoEmpleadoBio) : 'N/D',
      })
    } catch (err) {
      const msg = extractApiErrorMessage(err)
      if (/identificaci[oó]n|dpi|duplicad/i.test(msg)) setStep(5)
      toast.error(msg)
    }
  }

  const progreso = Math.round(((step + 1) / WIZARD_STEPS.length) * 100)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Nuevo empleado</h2>
          <p className="text-sm text-muted-foreground">
            Paso {step + 1} de {WIZARD_STEPS.length} · {WIZARD_STEPS[step].title}
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/empleados')}>
          <X className="h-4 w-4" />
          Cancelar
        </Button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progreso}%` }} />
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <Card className="h-fit p-3 md:sticky md:top-6">
          <Stepper steps={WIZARD_STEPS} current={step} onStepClick={setStep} />
        </Card>

        <Card className="p-6">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <h3 className="mb-1 text-lg font-semibold">{WIZARD_STEPS[step].title}</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
              </p>

              <div key={step} className="min-h-[300px] animate-in fade-in slide-in-from-right-4 duration-300">
                <StepContent index={step} />
              </div>

              <div className="mt-8 flex items-center justify-between border-t pt-5">
                <Button type="button" variant="outline" onClick={back} disabled={step === 0}>
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
                {step < LAST ? (
                  <Button type="button" onClick={next}>
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={crearMut.isPending}>
                    {crearMut.isPending ? 'Creando…' : 'Crear empleado'}
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </Card>
      </div>

      <BiotimeCodeDialog resumen={resumen} onClose={() => navigate('/empleados')} />
    </div>
  )
}
