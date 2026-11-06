import { Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { avatarOf, contactName, type Contact } from './commercialRules'

export function avatarUrl(path: string | null): string | null {
  return path ? supabase.storage.from('contact-avatars').getPublicUrl(path).data.publicUrl : null
}

/** Foto do WhatsApp; sem foto, iniciais com uma cor fixa por pessoa. */
export function ContactAvatar({ contact, size = 44 }: { contact: Pick<Contact, 'avatarPath' | 'isGroup'> & Parameters<typeof contactName>[0]; size?: number }) {
  const url = avatarUrl(contact.avatarPath)
  const name = contactName(contact)
  const { initials, hue } = avatarOf(name)
  const style = { width: size, height: size }
  if (url) return <img src={url} alt="" width={size} height={size} loading="lazy" decoding="async" style={style} className="shrink-0 rounded-full bg-raised object-cover" />
  return (
    <span aria-hidden="true" style={{ ...style, background: `oklch(0.9 0.05 ${hue})`, color: `oklch(0.35 0.08 ${hue})` }}
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold', size >= 44 ? 'text-[15px]' : 'text-[12px]')}>
      {contact.isGroup ? <Users size={Math.round(size * 0.42)} /> : initials}
    </span>
  )
}
