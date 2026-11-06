import { useMemo, useState } from 'react'
import { BadgeCheck, Search, SlidersHorizontal } from 'lucide-react'
import { LoadState } from '@/features/traffic/LoadState'
import { cn } from '@/lib/cn'
import {
  conversationStatus,
  contactName,
  countByStatus,
  EMPTY_CONTACT_FILTERS,
  filterContacts,
  INTENT_LABEL,
  KIND_LABEL,
  listTime,
  sortContacts,
  STATUS_HINT,
  STATUS_LABEL,
  type ContactFilters,
  type ContactKind,
  type ConversationStatus,
} from './commercialRules'
import { ContactAvatar } from './ContactAvatar'
import { ContactPanel } from './ContactPanel'
import { TagChip } from './TagChip'
import { useCommercialData } from './useCommercial'

const pill = 'min-h-10 rounded-full border border-line-strong bg-surface px-3.5 text-[13px]'

const STATUS_TONE: Record<ConversationStatus, string> = {
  sem_resposta: 'bg-warn-soft text-warn-ink',
  aguardando_cliente: 'bg-accent-soft text-accent-ink',
  parada: 'bg-raised text-muted',
  em_dia: 'bg-ok-soft text-ok-ink',
}
const STATUS_ORDER: readonly ConversationStatus[] = ['sem_resposta', 'em_dia', 'aguardando_cliente', 'parada']

/** Conversas do WhatsApp no estilo do próprio WhatsApp: lista à esquerda, conversa à direita (uma de cada vez no celular). */
export function ConversationsPage() {
  const data = useCommercialData()
  const [filters, setFilters] = useState<ContactFilters>(EMPTY_CONTACT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [moreFilters, setMoreFilters] = useState(false)
  const [now] = useState(() => Date.now())

  const { contacts, settings, clientName } = data
  const scoped = useMemo(
    () => (contacts && settings ? filterContacts(contacts, { ...filters, status: '' }, settings, now, (id) => clientName.get(id)) : []),
    [contacts, settings, filters, now, clientName],
  )
  const visible = useMemo(
    () => (settings ? sortContacts(filters.status ? scoped.filter((c) => conversationStatus(c, settings, now) === filters.status) : scoped, settings, now) : []),
    [scoped, filters.status, settings, now],
  )

  if (!contacts || !settings || !data.tags || !data.clients || !data.staff) {
    return <LoadState isPending={data.isPending} isError={data.isError} refetch={data.refetch} />
  }

  const counts = countByStatus(scoped, settings, now)
  const selected = selectedId ? data.contactById.get(selectedId) ?? null : null
  const set = <K extends keyof ContactFilters>(key: K, value: ContactFilters[K]) => setFilters((current) => ({ ...current, [key]: value }))
  const extraFilters = (filters.kind ? 1 : 0) + (filters.tagId ? 1 : 0) + (filters.showHidden ? 1 : 0)

  return (
    <>
      <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-line bg-surface lg:h-[calc(100dvh-220px)] lg:min-h-[560px] lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className={cn('flex min-h-0 flex-col border-line lg:border-r', selected && 'hidden lg:flex')}>
          <div className="flex flex-col gap-2 border-b border-line p-3">
            <div className="relative">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <label htmlFor="com-busca" className="sr-only">Buscar conversa</label>
              <input id="com-busca" type="search" placeholder="Buscar nome, telefone, cliente ou mensagem" value={filters.search} onChange={(e) => set('search', e.target.value)}
                className="min-h-11 w-full rounded-full bg-raised pl-10 pr-4 text-[14px] outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              <div role="group" aria-label="Tipo de conversa" className="flex shrink-0 rounded-full border border-line-strong p-0.5">
                {(['conversas', 'grupos', 'todos'] as const).map((audience) => (
                  <button key={audience} type="button" aria-pressed={filters.audience === audience} onClick={() => set('audience', audience)}
                    className={cn('min-h-9 cursor-pointer rounded-full px-3 text-[13px] font-medium capitalize', filters.audience === audience ? 'bg-fill text-on-fill' : 'text-muted hover:text-ink')}>
                    {audience}
                  </button>
                ))}
              </div>
              <button type="button" aria-expanded={moreFilters} onClick={() => setMoreFilters((v) => !v)} className={cn(pill, 'inline-flex shrink-0 cursor-pointer items-center gap-1.5', extraFilters > 0 && 'border-ink')}>
                <SlidersHorizontal size={14} aria-hidden="true" /> Filtros{extraFilters > 0 ? ` (${extraFilters})` : ''}
              </button>
            </div>
            <div role="group" aria-label="Situação" className="flex flex-wrap gap-1">
              {STATUS_ORDER.map((status) => (
                <button key={status} type="button" title={STATUS_HINT[status]} aria-pressed={filters.status === status} onClick={() => set('status', filters.status === status ? '' : status)}
                  className={cn('inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold', filters.status === status ? 'bg-fill text-on-fill' : STATUS_TONE[status])}>
                  {STATUS_LABEL[status]} <span className="tabular-nums">{counts[status]}</span>
                </button>
              ))}
            </div>
            {moreFilters && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-raised p-2">
                <label htmlFor="com-tipo" className="sr-only">Tipo de contato</label>
                <select id="com-tipo" value={filters.kind} onChange={(e) => set('kind', e.target.value as ContactKind | '')} className={pill}>
                  <option value="">Todo tipo</option>
                  {Object.entries(KIND_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <label htmlFor="com-etiqueta" className="sr-only">Etiqueta</label>
                <select id="com-etiqueta" value={filters.tagId} onChange={(e) => set('tagId', e.target.value)} className={pill}>
                  <option value="">Toda etiqueta</option>
                  {data.tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={filters.showHidden} onChange={(e) => set('showHidden', e.target.checked)} className="size-4" />
                  Pessoais e ocultas
                </label>
              </div>
            )}
          </div>

          <section aria-label="Conversas" className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 && <p className="p-8 text-center text-muted">Nenhuma conversa com esses filtros.</p>}
            {visible.map((contact) => {
              const status = conversationStatus(contact, settings, now)
              const unread = !contact.lastFromMe && contact.unansweredCount > 0
              return (
                <button key={contact.id} type="button" onClick={() => setSelectedId(contact.id)} aria-current={selectedId === contact.id ? 'true' : undefined}
                  className={cn('flex w-full cursor-pointer items-center gap-3 border-b border-line px-3 py-2.5 text-left transition-colors last:border-b-0', selectedId === contact.id ? 'bg-raised' : 'hover:bg-raised/60')}>
                  <ContactAvatar contact={contact} size={48} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate font-semibold">{contactName(contact)}</span>
                      {contact.verifiedName && <BadgeCheck size={14} aria-label="Perfil comercial" className="shrink-0 text-accent-ink" />}
                      <span className={cn('shrink-0 text-[12px] tabular-nums', unread ? 'font-semibold text-ok-ink' : 'text-muted')}>{listTime(contact.lastMessageAt, now)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{contact.lastFromMe ? 'Você: ' : ''}{contact.lastPreview}</span>
                      {unread && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-ok px-1.5 text-[11px] font-semibold text-white tabular-nums" aria-label={`${contact.unansweredCount} sem resposta`}>{contact.unansweredCount}</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-1">
                      <span className={cn('rounded-full px-2 py-px text-[11px] font-semibold', STATUS_TONE[status])}>
                        {STATUS_LABEL[status]}{status === 'sem_resposta' && contact.unansweredCount > 1 ? ` (${contact.unansweredCount})` : ''}
                      </span>
                      <span className="rounded-full bg-raised px-2 py-px text-[11px] font-medium">
                        {contact.clientId ? clientName.get(contact.clientId) ?? KIND_LABEL[contact.kind] : KIND_LABEL[contact.kind]}
                      </span>
                      {contact.aiIntent && contact.aiIntent !== 'sem_intencao' && (
                        <span className={cn('rounded-full px-2 py-px text-[11px] font-medium', contact.aiIntent === 'reclamacao' || contact.aiSentiment === 'negativo' ? 'bg-warn-soft text-warn-ink' : 'bg-accent-soft text-accent-ink')}>
                          {INTENT_LABEL[contact.aiIntent]}
                        </span>
                      )}
                      {contact.tags.slice(0, 2).map((t) => {
                        const tag = data.tagById.get(t.tagId)
                        return tag ? <TagChip key={t.tagId} tag={tag} /> : null
                      })}
                      {contact.tags.length > 2 && <span className="text-[11px] text-muted">+{contact.tags.length - 2}</span>}
                    </span>
                  </span>
                </button>
              )
            })}
          </section>
        </div>

        {selected ? (
          <ContactPanel key={`${selected.id}-${selected.updatedAt}`} contact={selected} data={data} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="hidden flex-col items-center justify-center gap-2 bg-raised/40 p-10 text-center lg:flex">
            <p className="text-[17px] font-semibold">Escolha uma conversa</p>
            <p className="max-w-[40ch] text-[14px] text-muted">Veja as mensagens, responda, classifique o contato e abra uma oportunidade sem sair daqui.</p>
          </div>
        )}
      </div>
      <p className="text-[12px] text-muted">
        Atualiza sozinho a cada 30 segundos. Sem resposta conta depois de {settings.replySlaMinutes} minutos; parada, depois de {settings.staleDays} dias.
      </p>
    </>
  )
}
