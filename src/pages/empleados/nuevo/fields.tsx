import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { EmpleadoCreateValues } from '@/lib/validators'

export type Opt = { value: string; label: string }
type Name = keyof EmpleadoCreateValues

function FieldShell({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function TextField({
  name,
  label,
  required,
  type = 'text',
  placeholder,
  disabled,
}: {
  name: Name
  label: string
  required?: boolean
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<EmpleadoCreateValues>()
  const err = errors[name]?.message as string | undefined
  return (
    <FieldShell label={label} required={required} error={err}>
      <Input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!err}
        className={cn(err && 'border-destructive focus-visible:ring-destructive')}
        {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
      />
    </FieldShell>
  )
}

export function SelectField({
  name,
  label,
  required,
  options,
  disabled,
  loading,
  placeholder = 'Seleccionar',
}: {
  name: Name
  label: string
  required?: boolean
  options: Opt[]
  disabled?: boolean
  loading?: boolean
  placeholder?: string
}) {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<EmpleadoCreateValues>()
  const err = errors[name]?.message as string | undefined
  const value = watch(name)
  return (
    <FieldShell label={label} required={required} error={err}>
      <Select
        value={value == null || value === '' ? undefined : String(value)}
        onValueChange={(v) => setValue(name, v as never, { shouldValidate: true, shouldDirty: true })}
        disabled={disabled || loading}
      >
        <SelectTrigger className={cn(err && 'border-destructive focus:ring-destructive')}>
          <SelectValue placeholder={loading ? 'Cargando…' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}
