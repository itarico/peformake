import type { AriaRole, ReactNode } from 'react'

interface CenteredMessageProps {
  title: string
  text?: string
  role?: AriaRole
  children?: ReactNode
}

export function CenteredMessage({ title, text, role, children }: CenteredMessageProps) {
  return (
    <div role={role} className="flex min-h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {text && <p className="mt-1 text-muted">{text}</p>}
        {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  )
}
