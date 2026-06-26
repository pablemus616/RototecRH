import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { empleadoCreateSchema, type EmpleadoCreateValues } from '@/lib/validators'
import type { CreateEmpleadoInput, EmpleadoBackend } from '@/types'
import { useActualizarEmpleado, useEmpleadoBackend } from '@/hooks/useEmpleados'
import { extractApiErrorMessage } from '@/api/client'
import { StepContent } from './nuevo/wizardSteps'

/** EmpleadoBackend (camelCase) → valores del formulario (snake_case del wizard). */
function aValoresForm(e: EmpleadoBackend): Partial<EmpleadoCreateValues> {
  const dia = (s: string | null) => (s ? s.slice(0, 10) : '')
  return {
    PAIS: e.pais ?? '',
    empresa_id: e.empresaId ?? undefined,
    id_departamento: e.idDepartamento ?? undefined,
    id_sub_departamento: e.idSubDepartamento ?? undefined,
    id_puesto: e.idPuesto ?? undefined,
    primer_nombre: e.primerNombre ?? '',
    segundo_nombre: e.segundoNombre ?? '',
    tercer_nombre: e.tercerNombre ?? '',
    primer_apellido: e.primerApellido ?? '',
    segundo_apellido: e.segundoApellido ?? '',
    apellido_casada: e.apellidoCasada ?? '',
    numero_identificacion_nacional: e.numeroIdentificacionNacional ?? '',
    id_tributario: e.idTributario ?? '',
    id_seguro_social: e.idSeguroSocial ?? '',
    fecha_nacimiento: dia(e.fechaNacimiento),
    sexo: e.sexo ?? '',
    estado_civil: e.estadoCivil ?? '',
    cantidad_hijos: e.cantidadHijos ?? 0,
    tipo_discapacidad: e.tipoDiscapacidad ?? '',
    telefono: e.telefono ?? '',
    correo: e.correo ?? '',
    direccion: e.direccion ?? '',
    pasaporte: e.pasaporte ?? '',
    pueblo_pertenencia: e.puebloPertenencia ?? '',
    comunidad_linguistica: e.comunidadLinguistica ?? '',
    grupo_etnico: e.grupoEtnico ?? '',
    lugar_nacimiento_municipio: e.lugarNacimientoMunicipio ?? '',
    permiso_extranjero: e.permisoExtranjero ?? '',
    jornada: e.jornada ?? '',
    temporalidad_contrato: e.temporalidadContrato ?? '',
    tipo_contrato: e.tipoContrato ?? '',
    fecha_contratacion: dia(e.fechaContratacion),
    fecha_reingreso: dia(e.fechaReingreso),
    salario_base_contrato: e.salarioBaseContrato ?? undefined,
    profesion: e.profesion ?? '',
    titulo: e.titulo ?? '',
    forma_pago: e.formaPago ?? 'TRANSFERENCIA',
    codigo_banco: e.codigoBanco ?? '',
    numero_cuenta: e.numeroCuenta ?? '',
    tipo_cuenta: e.tipoCuenta ?? '',
    habilitar_horas_extra: e.habilitarHorasExtra ?? false,
    // Biométrico: el wizard lo exige al crear; en edición no aplica → dummies válidos que NO se envían.
    departamento_biotime: 1,
    ubicacion_biometrico: 1,
  }
}

/** Corre `reset` cuando `value` cambia, PERO no en el montaje (preserva el prefill). */
function useResetOnChange(value: unknown, reset: () => void) {
  const primero = useRef(true)
  useEffect(() => {
    if (primero.current) {
      primero.current = false
      return
    }
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function EditForm({ id, empleado }: { id: string; empleado: EmpleadoBackend }) {
  const navigate = useNavigate()
  const mut = useActualizarEmpleado(id)
  const form = useForm<EmpleadoCreateValues>({
    resolver: zodResolver(empleadoCreateSchema),
    mode: 'onTouched',
    defaultValues: aValoresForm(empleado),
  })

  // Cascada: cambiar un padre limpia a sus hijos (sin pisar el prefill en el montaje).
  useResetOnChange(form.watch('PAIS'), () => form.setValue('empresa_id', undefined as never, { shouldValidate: false }))
  useResetOnChange(form.watch('empresa_id'), () => {
    form.setValue('id_departamento', undefined as never)
    form.setValue('id_sub_departamento', undefined as never)
    form.setValue('id_puesto', undefined as never)
  })
  useResetOnChange(form.watch('id_departamento'), () => {
    form.setValue('id_sub_departamento', undefined as never)
    form.setValue('id_puesto', undefined as never)
  })
  useResetOnChange(form.watch('id_sub_departamento'), () => form.setValue('id_puesto', undefined as never))

  async function onSubmit(values: EmpleadoCreateValues) {
    // Quita los campos biométricos (solo creación) y los vacíos/NaN (el backend solo toca lo provisto).
    const { departamento_biotime: _d, ubicacion_biometrico: _u, ...rest } = values
    const payload = Object.fromEntries(
      Object.entries(rest).filter(
        ([, v]) => v !== '' && v !== null && v !== undefined && !(typeof v === 'number' && Number.isNaN(v)),
      ),
    ) as Partial<CreateEmpleadoInput>
    try {
      await mut.mutateAsync(payload)
      toast.success('Empleado actualizado')
      navigate(`/empleados/${id}`)
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/empleados/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Editar empleado</h2>
          <p className="text-sm text-muted-foreground">
            Corrige o completa los datos. Los campos con <span className="text-destructive">*</span> son obligatorios.
          </p>
        </div>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, () => toast.error('Revisá los campos marcados en rojo'))} className="space-y-5">
          <Seccion titulo="Organización">
            <div className="grid gap-4 sm:grid-cols-2">
              <StepContent index={0} />
              <StepContent index={1} />
              <StepContent index={2} />
              <StepContent index={3} />
              <StepContent index={4} />
            </div>
          </Seccion>
          <Seccion titulo="Datos personales">
            <StepContent index={5} />
          </Seccion>
          <Seccion titulo="Datos culturales">
            <StepContent index={6} />
          </Seccion>
          <Seccion titulo="Contrato y pago">
            <StepContent index={7} />
          </Seccion>

          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background/95 py-3 backdrop-blur">
            <Button type="button" variant="outline" onClick={() => navigate(`/empleados/${id}`)} disabled={mut.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending} className="gap-2">
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {mut.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

export default function EmpleadoEditPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useEmpleadoBackend(id)

  if (isLoading) return <Skeleton className="mx-auto h-96 max-w-4xl" />
  if (isError || !data || !id)
    return <p className="mx-auto max-w-4xl text-sm text-muted-foreground">No se pudo cargar el empleado.</p>
  return <EditForm id={id} empleado={data} />
}
