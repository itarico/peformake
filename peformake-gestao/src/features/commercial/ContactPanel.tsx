import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, ExternalLink, Info, Plus, RefreshCw, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { analyzeNow, commercialErrorMessage, listEvents, listMessages, saveContact, saveDeal, setContactTag, type ContactDraft } from './commercialApi'
import {
  contactName,
  formatPhone,
  groupByDay,
  INTENT_LABEL,
  isOpenDeal,
  KIND_LABEL,
  MEDIA_LABEL,
  SENTIMENT_LABEL,
  STAGE_LABEL,
  type Contact,
  type ContactKind,
} from './commercialRules'
import { ContactAvatar } from './ContactAvatar'
import { SuggestionCard } from './SuggestionCard'
import { TagChip } from './TagChip'
import { commercialKeys, useCommercialData, useDeals, useSuggestions } from './useCommercial'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
const timeFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const hourFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' })
const FN = import.meta.env.VITE_SUPABASE_URL as string

async function callFn(name: string, body: unknown) {
  const { data: s } = await supabase.auth.getSession()
  const res = await fetch(`${FN}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok || out.error) throw new Error(out.error ?? 'Não foi possível agora.')
  return out
}

function draftOf(contact: Contact): ContactDraft {
  return {
    displayName: contact.displayName ?? '',
    kind: contact.kind,
    clientId: contact.clientId ?? '',
    ownerId: contact.ownerId ?? '',
    notes: contact.notes ?? '',
    hidden: contact.hidden,
  }
}

export function ContactPanel({ contact, data, onClose }: {
  contact: Contact
  data: ReturnType<typeof useCommercialData>
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const messages = useQuery({ queryKey: commercialKeys.messages(contact.id), queryFn: () => listMessages(contact.id), refetchInterval: 30_000 })
  const deals = useDeals()
  const suggestions = useSuggestions()
  const events = useQuery({ queryKey: commercialKeys.events(contact.id), queryFn: () => listEvents(contact.id) })
  const [details, setDetails] = useState(true)
  const [reply, setReply] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { const el = end.current; if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end' }) }, [messages.data?.length])

  const analyze = useMutation({
    mutationFn: () => analyzeNow(contact.id),
    onSettled: () => {
      for (const key of [commercialKeys.contacts, commercialKeys.suggestions, commercialKeys.sales, commercialKeys.events(contact.id)]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
  const enrich = useMutation({
    mutationFn: () => callFn('wa-enrich', { contact_id: contact.id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: commercialKeys.contacts }),
  })
  const send = useMutation({
    mutationFn: () => callFn('wa-send', { contact_id: contact.id, text: reply }),
    onSuccess: () => {
      setReply('')
      // O webhook grava a mensagem enviada; recarrega em seguida.
      setTimeout(() => void queryClient.invalidateQueries({ queryKey: commercialKeys.messages(contact.id) }), 2500)
    },
  })
  const [draft, setDraft] = useState<ContactDraft>(() => draftOf(contact))
  const [addingTag, setAddingTag] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(contact))
  const set = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: commercialKeys.contacts })
    void queryClient.invalidateQueries({ queryKey: commercialKeys.deals })
  }

  const save = useMutation({ mutationFn: () => saveContact(contact.id, draft), onSuccess: refresh })
  const tag = useMutation({
    mutationFn: ({ tagId, on }: { tagId: string; on: boolean }) => setContactTag(contact.id, tagId, on),
    onSuccess: () => {
      setAddingTag('')
      void queryClient.invalidateQueries({ queryKey: commercialKeys.contacts })
    },
  })
  const openDeal = useMutation({
    mutationFn: () =>
      saveDeal(null, null, {
        contactId: contact.id,
        title: `Oportunidade: ${contactName(contact)}`.slice(0, 200),
        serviceId: '',
        valueCents: null,
        ownerId: contact.ownerId ?? '',
        nextStep: '',
        nextStepAt: '',
      }),
    onSuccess: refresh,
  })

  const contactDeals = (deals.data ?? []).filter((d) => d.contactId === contact.id)
  const hasOpenDeal = contactDeals.some(isOpenDeal)
  const availableTags = (data.tags ?? []).filter((t) => !contact.tags.some((ct) => ct.tagId === t.id))
  const error = save.error ?? tag.error ?? openDeal.error
  const days = groupByDay(messages.data ?? [])
  const waLink = contact.phone && !contact.isGroup ? `https://wa.me/${contact.phone.replace(/\D/g, '')}` : null

  return (
    <section aria-label={`Conversa com ${contactName(contact)}`} className="flex min-h-[70dvh] min-w-0 flex-col lg:min-h-0">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5">
        <button type="button" onClick={onClose} aria-label="Voltar para a lista" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink lg:hidden">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <ContactAvatar contact={contact} size={42} />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 truncate text-[16px] font-semibold tracking-tight">
            <span className="truncate">{contactName(contact)}</span>
            {contact.verifiedName && <span title={`Perfil comercial: ${contact.verifiedName}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-px text-[11px] font-semibold text-accent-ink"><BadgeCheck size={12} aria-hidden="true" /> Comercial</span>}
          </h2>
          <p className="truncate text-[12px] text-muted">
            {contact.isGroup ? 'Grupo' : contact.phone ? formatPhone(contact.phone) : 'Telefone ainda não identificado'}
            {contact.verifiedName && contact.verifiedName !== contactName(contact) ? ` · ${contact.verifiedName}` : ''}
            {contact.about ? ` · ${contact.about}` : ''}
          </p>
        </div>
        {!contact.isGroup && (
          <button type="button" title="Atualizar foto e dados do WhatsApp" aria-label="Atualizar foto e dados do WhatsApp" disabled={enrich.isPending} onClick={() => enrich.mutate()}
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink disabled:opacity-50">
            <RefreshCw size={17} aria-hidden="true" className={cn(enrich.isPending && 'animate-spin')} />
          </button>
        )}
        <button type="button" aria-pressed={details} aria-label="Detalhes do contato" onClick={() => setDetails((d) => !d)}
          className={cn('grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-raised', details ? 'text-ink' : 'text-muted')}>
          <Info size={18} aria-hidden="true" />
        </button>
      </header>
      {enrich.isError && <p role="alert" className="bg-warn-soft px-4 py-1.5 text-[12px] text-warn-ink">{(enrich.error as Error).message}</p>}

      <div className={cn('grid min-h-0 flex-1', details && 'xl:grid-cols-[minmax(0,1fr)_320px]')}>
        <div className="flex min-h-0 flex-col">
          <div className="wa-wallpaper flex min-h-72 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 md:px-6" aria-live="polite">
            {messages.isPending && <p role="status" className="text-center text-[13px] text-muted">Carregando mensagens</p>}
            {messages.isError && <p role="alert" className="text-center text-warn-ink">Não foi possível carregar as mensagens.</p>}
            {messages.data?.length === 0 && <p className="text-center text-[13px] text-muted">Sem mensagens gravadas.</p>}
            {days.map((d) => (
              <div key={d.day} className="flex flex-col gap-1">
                <p className="sticky top-0 z-10 my-2 self-center rounded-lg bg-surface/95 px-3 py-1 text-[12px] font-medium text-muted shadow-sm">{d.label}</p>
                {d.items.map((m) => (
                  <div key={m.id} className={cn('max-w-[78%] rounded-2xl px-3 py-1.5 shadow-[0_1px_0.5px_rgb(0_0_0/0.08)]', m.fromMe ? 'wa-out self-end rounded-tr-md' : 'self-start rounded-tl-md bg-surface')}>
                    {contact.isGroup && !m.fromMe && m.senderName && <p className="text-[12px] font-semibold text-accent-ink">{m.senderName}</p>}
                    {m.body
                      ? <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">{m.body}</p>
                      : <p className="text-[14px] italic text-muted">{MEDIA_LABEL[m.messageType ?? ''] ?? 'Mensagem'}</p>}
                    <p className="mt-0.5 text-right text-[11px] text-muted tabular-nums">{hourFormat.format(new Date(m.sentAt))}</p>
                  </div>
                ))}
              </div>
            ))}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (reply.trim()) send.mutate() }} className="flex items-end gap-2 border-t border-line bg-surface p-2.5">
            <label htmlFor={`resp-${contact.id}`} className="sr-only">Responder</label>
            <textarea id={`resp-${contact.id}`} rows={1} value={reply} maxLength={4000} placeholder="Escreva uma mensagem"
              onChange={(e) => { send.reset(); setReply(e.target.value) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (reply.trim()) send.mutate() } }}
              className="max-h-40 min-h-11 flex-1 resize-none rounded-3xl bg-raised px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-accent" />
            {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer" title="Abrir no WhatsApp" aria-label="Abrir no WhatsApp" className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"><ExternalLink size={18} aria-hidden="true" /></a>}
            <button type="submit" aria-label="Enviar" disabled={!reply.trim() || send.isPending} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ok text-white disabled:opacity-40">
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
          {send.isError && <p role="alert" className="bg-warn-soft px-4 py-1.5 text-[12px] text-warn-ink">{(send.error as Error).message}</p>}
        </div>

        {details && (
          <aside aria-label="Detalhes do contato" className="flex flex-col gap-3 overflow-y-auto border-t border-line bg-canvas/40 p-3 xl:border-l xl:border-t-0">
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
              <h3 className="flex items-center gap-1.5 font-semibold"><Sparkles size={16} aria-hidden="true" /> Leitura da IA</h3>
              {contact.aiSummary ? (
                <>
                  <p className="text-[14px]">{contact.aiSummary}</p>
                  <p className="flex flex-wrap gap-1">
                    {contact.aiIntent && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-ink">{INTENT_LABEL[contact.aiIntent]}</span>}
                    {contact.aiSentiment && (
                      <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', contact.aiSentiment === 'negativo' ? 'bg-warn-soft text-warn-ink' : contact.aiSentiment === 'positivo' ? 'bg-ok-soft text-ok-ink' : 'bg-raised')}>
                        {SENTIMENT_LABEL[contact.aiSentiment]}
                      </span>
                    )}
                  </p>
                  {contact.aiAnalyzedAt && <p className="text-[12px] text-muted">Lida em {timeFormat.format(new Date(contact.aiAnalyzedAt))}</p>}
                </>
              ) : (
                <p className="text-[13px] text-muted">Ainda não lida. A IA lê as conversas com mensagem nova a cada 15 minutos.</p>
              )}
              {(suggestions.data ?? []).filter((s) => s.contactId === contact.id).map((s) => <SuggestionCard key={s.id} suggestion={s} />)}
              {analyze.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{commercialErrorMessage(analyze.error)}</p>}
              {analyze.isSuccess && <p role="status" className="text-[13px] text-ok-ink">Leitura feita. {analyze.data.created > 0 ? `${analyze.data.created} sugestão(ões) nova(s).` : 'Nada novo para sugerir.'}</p>}
              <Button variant="secondary" disabled={analyze.isPending} onClick={() => analyze.mutate()}>{analyze.isPending ? 'Lendo a conversa' : 'Ler agora'}</Button>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
              <h3 className="font-semibold">Oportunidades</h3>
              {contactDeals.length === 0 && <p className="text-[13px] text-muted">Nenhuma oportunidade com este contato.</p>}
              {contactDeals.map((d) => (
                <p key={d.id} className="text-[13px]"><b className="font-semibold">{STAGE_LABEL[d.stage]}</b> · {d.title}</p>
              ))}
              {!hasOpenDeal && (
                <Button variant="secondary" disabled={openDeal.isPending} onClick={() => openDeal.mutate()}>
                  <Plus size={16} aria-hidden="true" /> Abrir oportunidade
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
              <h3 className="font-semibold">Contato</h3>
              <label className="flex flex-col text-[13px] font-semibold">Nome
                <input value={draft.displayName} maxLength={120} placeholder={contact.waName ?? 'Nome do contato'} onChange={(e) => set('displayName', e.target.value)} className={cn(field, 'mt-1 font-normal')} />
              </label>
              <label className="flex flex-col text-[13px] font-semibold">Tipo
                <select value={draft.kind} onChange={(e) => set('kind', e.target.value as ContactKind)} className={cn(field, 'mt-1 font-normal')}>
                  {Object.entries(KIND_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              {draft.kind === 'lead' && !hasOpenDeal && <p className="text-[12px] text-muted">Ao salvar como Lead, uma oportunidade abre no Funil.</p>}
              <label className="flex flex-col text-[13px] font-semibold">Cliente
                <select value={draft.clientId} onChange={(e) => set('clientId', e.target.value)} className={cn(field, 'mt-1 font-normal')}>
                  <option value="">Nenhum</option>
                  {(data.clients ?? []).filter((c) => c.isActive || c.id === draft.clientId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col text-[13px] font-semibold">Responsável
                <select value={draft.ownerId} onChange={(e) => set('ownerId', e.target.value)} className={cn(field, 'mt-1 font-normal')}>
                  <option value="">Ninguém ainda</option>
                  {(data.staff ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col text-[13px] font-semibold">Observações
                <textarea rows={3} maxLength={4000} value={draft.notes} onChange={(e) => set('notes', e.target.value)} className={cn(field, 'mt-1 resize-y font-normal')} placeholder="O que ele procura, combinados, cuidados." />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px]">
                <input type="checkbox" checked={draft.hidden} onChange={(e) => set('hidden', e.target.checked)} className="size-4" />
                Ocultar da lista (sem interesse comercial)
              </label>
              <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar contato'}</Button>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
              <h3 className="font-semibold">Etiquetas</h3>
              <div className="flex flex-wrap gap-1">
                {contact.tags.length === 0 && <span className="text-[13px] text-muted">Nenhuma ainda.</span>}
                {contact.tags.map((t) => {
                  const item = data.tagById.get(t.tagId)
                  return item ? <TagChip key={t.tagId} tag={item} auto={t.source === 'auto'} onRemove={() => tag.mutate({ tagId: t.tagId, on: false })} /> : null
                })}
              </div>
              {availableTags.length > 0 && (
                <div className="flex gap-1">
                  <label htmlFor={`tag-${contact.id}`} className="sr-only">Adicionar etiqueta</label>
                  <select id={`tag-${contact.id}`} value={addingTag} onChange={(e) => setAddingTag(e.target.value)} className={cn(field, 'min-h-10 flex-1')}>
                    <option value="">Adicionar etiqueta</option>
                    {availableTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <Button className="min-h-10 px-3" disabled={!addingTag || tag.isPending} onClick={() => tag.mutate({ tagId: addingTag, on: true })} aria-label="Adicionar"><Plus size={16} aria-hidden="true" /></Button>
                </div>
              )}
            </div>

            <details className="rounded-2xl border border-line bg-surface p-4 [&_summary]:cursor-pointer">
              <summary className="font-semibold">Histórico</summary>
              <div className="mt-2 flex flex-col gap-1.5">
                {events.data?.length === 0 && <p className="text-[13px] text-muted">Nada registrado ainda.</p>}
                {events.data?.slice(0, 20).map((e) => (
                  <p key={e.id} className="text-[13px]">
                    <span className="text-[12px] tabular-nums text-muted">{timeFormat.format(new Date(e.createdAt))}</span> {e.detail}
                    {e.actorId ? '' : <span className="text-muted"> (automático)</span>}
                  </p>
                ))}
              </div>
            </details>
            {error && <p role="alert" className="font-medium text-warn-ink">{commercialErrorMessage(error)}</p>}
          </aside>
        )}
      </div>
    </section>
  )
}
