import { useState } from 'react'
import { cn } from '@/lib/cn'
import { initials } from './clientRules'

export function ClientAvatar({ name, url, size = 'md' }: { name: string; url: string | null; size?: 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  const box = size === 'lg' ? 'size-20 rounded-3xl text-2xl' : 'size-14 rounded-2xl text-base'

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('shrink-0 border border-line bg-white object-contain', box)}
      />
    )
  }
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center bg-accent-soft font-semibold text-accent-ink', box)}>
      {initials(name)}
    </span>
  )
}
