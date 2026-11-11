import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { avatarUrl } from '@/features/commercial/ContactAvatar'
import { maskPhone } from '@/features/team/teamRules'
import { supabase } from '@/lib/supabase'

export interface WaContactHit { id: string; phone: string; name: string | null; avatar_path: string | null; client_name: string | null }

const looksLikePhone = (t: string) => /^[\d\s()+-]*$/.test(t)

/**
 * WhatsApp do responsável com busca nos contatos do WhatsApp (nome ou parte do número).
 * Escolher preenche o número formatado e devolve o nome do contato; "já é cliente" evita duplicar.
 * Continua aceitando digitar um número novo, com máscara (81) 98888-7777.
 */
export function WhatsappContactField({ id, value, onChange, onPick, invalid, describedBy }: {
  id?: string
  value: string
  onChange: (phone: string) => void
  onPick?: (contact: WaContactHit) => void
  invalid?: boolean
  describedBy?: string
}) {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 200); return () => clearTimeout(t) }, [text])
  const search = useQuery({
    queryKey: ['wa-contact-search', q],
    enabled: q.replace(/\D/g, '').length >= 3 || (!looksLikePhone(q) && q.length >= 2),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)('wa_contact_search', { _q: q })
      if (error) return [] as WaContactHit[]
      return (Array.isArray(data) ? data : []) as WaContactHit[]
    },
  })
  const hits = useMemo(() => (search.data ?? []).filter((h) => h.phone), [search.data])
  const labelOf = (h: WaContactHit) => `${h.name || 'Sem nome'} · ${maskPhone(h.phone)}`
  const byLabel = useMemo(() => new Map(hits.map((h) => [labelOf(h), h])), [hits])

  return (
    <SearchSelect id={id} name="pf-responsavel-whatsapp" value={value} invalid={invalid} describedBy={describedBy}
      inputMode={looksLikePhone(text) ? 'tel' : 'text'} placeholder="Nome do contato ou (81) 98888-7777"
      filter={false} options={[...byLabel.keys()]} tidy={false}
      liveFormat={(t) => (looksLikePhone(t) ? maskPhone(t) : t)}
      format={(t) => (looksLikePhone(t) ? maskPhone(t) : t)}
      addLabel={(t) => (looksLikePhone(t) ? `Usar o número ${t}` : `Usar “${t}”`)}
      allowNew={looksLikePhone(text)}
      onTextChange={setText}
      onChange={(v) => {
        const hit = byLabel.get(v)
        if (hit) { onChange(maskPhone(hit.phone)); onPick?.(hit) } else onChange(v)
      }}
      renderOption={(label) => {
        const h = byLabel.get(label)
        if (!h) return label
        const url = avatarUrl(h.avatar_path)
        return (
          <span className="flex min-w-0 flex-1 items-center gap-2 py-1">
            {url ? <img src={url} alt="" className="size-8 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold text-muted">{(h.name || '?').slice(0, 1).toUpperCase()}</span>}
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-medium">{h.name || 'Sem nome'}</span>
              <span className="truncate text-[12px] text-muted">{maskPhone(h.phone)}{h.client_name && <b className="ml-1.5 rounded-full bg-warn-soft px-1.5 py-0.5 font-semibold text-warn-ink">já é cliente: {h.client_name}</b>}</span>
            </span>
          </span>
        )
      }} />
  )
}
