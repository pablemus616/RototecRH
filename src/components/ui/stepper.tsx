import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepperItem {
  id: string
  title: string
}

type StepState = 'done' | 'active' | 'todo'

/** Riel de pasos vertical. El estado se deriva del paso actual; los pasos ya vistos son clickeables. */
export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: StepperItem[]
  current: number
  onStepClick?: (index: number) => void
}) {
  return (
    <ol className="relative flex flex-col">
      {steps.map((s, i) => {
        const state: StepState = i < current ? 'done' : i === current ? 'active' : 'todo'
        const clickable = Boolean(onStepClick) && i <= current
        const isLast = i === steps.length - 1
        return (
          <li key={s.id} className="relative">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-px',
                  i < current ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              aria-current={state === 'active' ? 'step' : undefined}
              className={cn(
                'relative z-10 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                clickable && 'hover:bg-secondary/60',
                !clickable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200',
                  state === 'done' && 'border-primary bg-primary text-primary-foreground',
                  state === 'active' && 'border-primary text-primary ring-4 ring-primary/15',
                  state === 'todo' && 'border-border bg-background text-muted-foreground',
                )}
              >
                {state === 'done' ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-sm font-medium',
                    state === 'todo' ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {s.title}
                </span>
                <span className="block text-xs text-muted-foreground">Paso {i + 1}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
