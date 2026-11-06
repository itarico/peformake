import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
}

export function Field({ label, error, className, ...props }: FieldProps) {
  const id = useId()
  const errorId = `${id}-erro`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink',
          error && 'border-2 border-warn',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[13px] font-medium text-warn">
          {error}
        </p>
      )}
    </div>
  )
}
