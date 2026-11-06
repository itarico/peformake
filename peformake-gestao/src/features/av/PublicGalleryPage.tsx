import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Clapperboard, Download, ExternalLink, Heart, X } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { getPublicGallery, payLink, publicDownloadUrls, publicPreviewUrls, submitSelection } from './galleryApi'

const brl = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Galeria do cliente (sem login): escolhe as fotos, paga as extras e baixa em boa resolução. */
export function PublicGalleryPage() {
  const { token = '' } = useParams()
  const q = useQuery({ queryKey: ['public-gallery', token], queryFn: () => getPublicGallery(token), refetchInterval: (s) => (s.state.data?.status === 'aguardando_pagamento' ? 15_000 : false) })
  const g = q.data
  const previews = useQuery({ queryKey: ['public-gallery-previews', token], queryFn: () => publicPreviewUrls(token), enabled: !!g, staleTime: 50 * 60_000, retry: false })
  const released = g?.status === 'paga' || g?.status === 'entregue'
  const downloads = useQuery({ queryKey: ['public-gallery-downloads', token], queryFn: () => publicDownloadUrls(token), enabled: released, staleTime: 5 * 3600_000, retry: false })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)
  const [doc, setDoc] = useState('')
  useEffect(() => { if (g) setPicked(new Set(g.items.filter((x) => x.selected).map((x) => x.id))) }, [g?.id, g?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const choosing = g?.status === 'enviada'
  const extra = g ? Math.max(0, picked.size - g.included) : 0
  const amount = g ? Math.round(extra * g.extra_price * 100) / 100 : 0
  const needsDoc = !!g?.needs_document && extra > 0
  const docOk = [11, 14].includes(doc.replace(/\D/g, '').length)

  const pay = useMutation({ mutationFn: () => payLink(token), onSuccess: (r) => { if (r.url) window.location.href = r.url } })
  const submit = useMutation({
    mutationFn: () => submitSelection(token, [...picked], needsDoc ? doc : undefined),
    onSuccess: async (r) => { await q.refetch(); if (r.amount > 0) pay.mutate() },
  })
  const list = useMemo(() => g?.items ?? [], [g])
  const toggle = (id: string) => setPicked((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })

  if (q.isPending) return <main className="grid min-h-dvh place-items-center bg-canvas text-muted">Carregando as fotos</main>
  if (!g) return <main className="grid min-h-dvh place-items-center bg-canvas px-4 text-center"><p>Galeria não encontrada. Confira o link que você recebeu.</p></main>

  const shown = released ? list.filter((x) => x.selected) : list
  const openItem = open ? list.find((x) => x.id === open) : null

  return (
    <main className="theme-ellcazo min-h-dvh bg-canvas pb-32 text-ink">
      <header className="bg-[var(--ellcazo-band)] px-4 py-6 text-[var(--ellcazo-band-ink)] md:px-8">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-accent"><Clapperboard size={14} aria-hidden="true" /> Ellcazo · Produtora audiovisual</p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight">{g.title}</h1>
        <p className="mt-1 text-[14px] opacity-80">
          {choosing ? `Escolha suas favoritas: ${g.included} já estão incluídas no seu pacote${g.extra_price > 0 ? `; cada foto a mais sai por ${brl(g.extra_price)}` : ''}${g.partner ? ' (com o seu desconto de parceiro)' : ''}.`
            : g.status === 'aguardando_pagamento' ? 'Escolha recebida. Falta só o pagamento das fotos extras para liberar o download.'
              : released ? 'Suas fotos estão liberadas. Baixe em boa resolução.' : ''}
        </p>
      </header>

      {g.status === 'aguardando_pagamento' && (
        <section className="mx-auto mt-4 flex max-w-3xl flex-col gap-2 rounded-3xl border border-line bg-surface p-5 md:mx-auto">
          <p className="text-[15px]">Total das fotos extras: <b>{brl(g.amount ?? 0)}</b></p>
          {g.payment_url ? <a href={g.payment_url} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 font-semibold text-[var(--ellcazo-band)] no-underline">Pagar agora (Pix, boleto ou cartão) <ExternalLink size={16} aria-hidden="true" /></a>
            : <button type="button" onClick={() => pay.mutate()} disabled={pay.isPending} className="min-h-12 cursor-pointer rounded-full bg-accent px-5 font-semibold text-[var(--ellcazo-band)]">{pay.isPending ? 'Gerando pagamento' : 'Gerar pagamento'}</button>}
          {pay.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{(pay.error as Error).message}</p>}
          <p className="text-[12px] text-muted">Assim que o pagamento cair, esta página libera o download sozinha.</p>
        </section>
      )}

      {released && (
        <section className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center gap-2 px-4">
          {g.drive_link && <a href={g.drive_link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-medium text-ink no-underline"><ExternalLink size={15} aria-hidden="true" /> Abrir no Drive</a>}
          <span className="text-[13px] text-muted">Toque em cada foto para baixar. Os links valem algumas horas; se expirar, é só abrir esta página de novo.</span>
        </section>
      )}

      <ul className="mx-auto mt-4 grid max-w-6xl grid-cols-2 gap-2 px-4 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((it) => {
          const on = picked.has(it.id)
          const src = previews.data?.urls[it.id]
          return (
            <li key={it.id} className={cn('relative overflow-hidden rounded-xl border bg-surface', on && choosing ? 'border-accent ring-2 ring-accent' : 'border-line')}>
              <button type="button" onClick={() => setOpen(it.id)} className="block w-full cursor-zoom-in">
                {src ? <img src={src} alt={it.name} loading="lazy" className="aspect-square w-full object-cover" /> : <span className="grid aspect-square place-items-center bg-raised text-[12px] text-muted">Carregando</span>}
              </button>
              {choosing && (
                <button type="button" aria-pressed={on} aria-label={on ? `Tirar ${it.name}` : `Escolher ${it.name}`} onClick={() => toggle(it.id)}
                  className={cn('absolute right-2 top-2 grid size-10 cursor-pointer place-items-center rounded-full shadow', on ? 'bg-accent text-on-fill' : 'bg-white/90 text-[#15181e]')}>
                  <Heart size={18} aria-hidden="true" fill={on ? 'currentColor' : 'none'} />
                </button>
              )}
              {released && downloads.data?.urls[it.id] && (
                <a href={downloads.data.urls[it.id]} download={it.name} className="absolute bottom-2 right-2 inline-flex min-h-9 items-center gap-1 rounded-full bg-white/95 px-3 text-[13px] font-semibold text-[#15181e] no-underline shadow"><Download size={14} aria-hidden="true" /> Baixar</a>
              )}
            </li>
          )
        })}
      </ul>

      {choosing && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-raised" aria-hidden="true"><span className="block h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.min(100, g.included ? (picked.size / g.included) * 100 : 100)}%` }} /></div>
              <p className="mt-1 text-[13px]"><b>{Math.min(picked.size, g.included)} de {g.included}</b> incluídas{extra > 0 ? <> · <b>{extra} extras</b> × {brl(g.extra_price)} = <b>{brl(amount)}</b></> : ''}</p>
            </div>
            {needsDoc && <input inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="CPF ou CNPJ para o pagamento" aria-label="CPF ou CNPJ" className="min-h-11 w-48 rounded-xl border border-line-strong bg-surface px-3" />}
            <button type="button" disabled={!picked.size || submit.isPending || (needsDoc && !docOk)} onClick={() => submit.mutate()}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-accent px-5 font-semibold text-[var(--ellcazo-band)] disabled:cursor-not-allowed disabled:opacity-50">
              <Check size={16} aria-hidden="true" /> {submit.isPending ? 'Enviando' : extra > 0 ? `Confirmar e pagar ${brl(amount)}` : 'Confirmar escolha'}
            </button>
          </div>
          {submit.isError && <p role="alert" className="mx-auto mt-1 max-w-4xl text-[13px] font-medium text-warn-ink">{(submit.error as Error).message}</p>}
        </div>
      )}

      {openItem && (
        <div role="dialog" aria-label={openItem.name} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3" onClick={() => setOpen(null)}>
          <button type="button" aria-label="Fechar" className="absolute right-3 top-3 grid size-11 cursor-pointer place-items-center rounded-full bg-white/15 text-white"><X size={20} aria-hidden="true" /></button>
          {previews.data?.urls[openItem.id] && <img src={previews.data.urls[openItem.id]} alt={openItem.name} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />}
          {choosing && (
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(openItem.id) }} className={cn('absolute bottom-6 left-1/2 inline-flex min-h-12 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full px-5 font-semibold', picked.has(openItem.id) ? 'bg-accent text-on-fill' : 'bg-white text-[#15181e]')}>
              <Heart size={18} aria-hidden="true" fill={picked.has(openItem.id) ? 'currentColor' : 'none'} /> {picked.has(openItem.id) ? 'Escolhida' : 'Escolher esta'}
            </button>
          )}
        </div>
      )}
    </main>
  )
}
