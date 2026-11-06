import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clapperboard, LogIn, LogOut, MapPin, Plus, Send, Trash2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

interface View {
  id: string; title: string; client: string; status: string; shoot_at: string | null; duration_min: number | null; location: string | null; has_point: boolean
  notes: string | null; script: string | null; videomaker: string | null; editor: string | null; checkin_at: string | null; checkin_distance_m: number | null
  checkout_at: string | null; raw_links: { kind: string; url: string; note?: string }[]; raw_sent_at: string | null; radius_m: number; raw_until_hour: number
}

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const btn = 'inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-semibold disabled:cursor-not-allowed disabled:opacity-50'

/** Página do link que vai no WhatsApp de quem grava: check-in no local, checkout e envio do material bruto. Sem senha: o link é a chave. */
export function StaffCapturePage() {
  const { token = '' } = useParams()
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ['staff-capture', token],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('av_staff_view', { _token: token })
      if (error) throw error
      return data as unknown as View | null
    },
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [links, setLinks] = useState<{ kind: string; url: string; note: string }[]>([{ kind: 'video', url: '', note: '' }])
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['staff-capture', token] })

  const checkin = useMutation({
    mutationFn: async () => {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null)
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 12_000 })
      })
      const { data, error } = await supabase.rpc('av_staff_checkin', { _token: token, _lat: pos?.coords.latitude ?? null, _lng: pos?.coords.longitude ?? null })
      if (error) throw error
      return { pos, out: data as { distance_m: number | null; inside: boolean } }
    },
    onSuccess: ({ pos, out }) => {
      setMsg(!pos ? 'Check-in feito, sem localização (o celular não liberou).' : out.distance_m == null ? 'Check-in feito.' : out.inside ? `Check-in feito no local (${out.distance_m} m).` : `Check-in feito, mas você está a ${out.distance_m} m do endereço marcado. O responsável foi avisado.`)
      refresh()
    },
    onError: () => setMsg('Não deu para fazer o check-in. Tente de novo.'),
  })
  const checkout = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc('av_staff_checkout', { _token: token }); if (error) throw error },
    onSuccess: () => { setMsg('Checkout feito. Agora mande o material bruto abaixo.'); refresh() },
  })
  const send = useMutation({
    mutationFn: async () => {
      const clean = links.filter((l) => l.url.trim()).map((l) => ({ kind: l.kind, url: l.url.trim(), note: l.note.trim() }))
      const { error } = await supabase.rpc('av_staff_raw', { _token: token, _links: clean })
      if (error) throw error
    },
    onSuccess: () => { setMsg('Material enviado. O editor, o responsável e o cliente foram avisados.'); refresh() },
    onError: (e) => setMsg((e as Error).message?.includes('https') ? 'Os links precisam começar com https://' : 'Não deu para enviar. Confira os links.'),
  })

  if (q.isPending) return <div className="theme-ellcazo grid min-h-dvh place-items-center bg-[var(--ellcazo-band)] text-[var(--ellcazo-band-ink)]">Carregando</div>
  if (!q.data) return <div className="theme-ellcazo grid min-h-dvh place-items-center bg-[var(--ellcazo-band)] p-6 text-center text-[var(--ellcazo-band-ink)]">Link inválido ou expirado. Peça o link novo ao responsável.</div>
  const v = q.data
  document.title = `Captação · ${v.client}`
  const step = v.raw_sent_at ? 3 : v.checkout_at ? 2 : v.checkin_at ? 1 : 0
  const valid = links.some((l) => /^https:\/\//.test(l.url.trim()))

  return (
    <div className="theme-ellcazo min-h-dvh bg-[var(--ellcazo-band)] text-[var(--ellcazo-band-ink)]">
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-6">
        <header>
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-accent"><Clapperboard size={14} aria-hidden="true" /> Ellcazo · Captação</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight">{v.client}</h1>
          <p className="opacity-75">{v.title}</p>
        </header>

        <section className="flex flex-col gap-1 rounded-3xl bg-white/5 p-4">
          {v.shoot_at && <p className="text-[17px] font-semibold first-letter:uppercase">{when(v.shoot_at)}{v.duration_min ? ` · ${v.duration_min / 60} h` : ''}</p>}
          {v.location && <a href={`https://maps.google.com/?q=${encodeURIComponent(v.location)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-accent"><MapPin size={15} aria-hidden="true" /> {v.location}</a>}
          {v.notes && <p className="mt-1 text-[14px] opacity-80">{v.notes}</p>}
          <p className="mt-1 text-[13px] opacity-70">Videomaker: {v.videomaker ?? '—'} · Editor: {v.editor ?? '—'}</p>
        </section>

        <ol className="grid grid-cols-3 gap-1.5 text-[12px]">
          {['Check-in', 'Checkout', 'Bruto enviado'].map((s, i) => (
            <li key={s} className="flex flex-col gap-1"><span className={cn('h-1.5 rounded-full', i < step ? 'bg-accent' : 'bg-white/15')} /><span className={cn(i < step ? 'font-semibold' : 'opacity-60')}>{s}</span></li>
          ))}
        </ol>

        {msg && <p role="status" className="rounded-2xl bg-white/10 px-4 py-3 text-[14px]">{msg}</p>}

        {step === 0 && (
          <button type="button" disabled={checkin.isPending} onClick={() => checkin.mutate()} className={cn(btn, 'bg-accent text-[var(--ellcazo-band)]')}>
            <LogIn size={20} aria-hidden="true" /> {checkin.isPending ? 'Pegando a localização' : 'Cheguei: fazer check-in'}
          </button>
        )}
        {step === 0 && v.has_point && <p className="text-center text-[12px] opacity-60">O celular vai pedir a localização para confirmar que você está no local (até {v.radius_m} m).</p>}
        {step === 1 && (
          <button type="button" disabled={checkout.isPending} onClick={() => checkout.mutate()} className={cn(btn, 'bg-accent text-[var(--ellcazo-band)]')}>
            <LogOut size={20} aria-hidden="true" /> Terminei: fazer checkout
          </button>
        )}
        {step >= 1 && step < 3 && (
          <section className="flex flex-col gap-3 rounded-3xl bg-white/5 p-4">
            <h2 className="text-[17px] font-semibold">Material bruto</h2>
            <p className="text-[13px] opacity-75">Mande até as {v.raw_until_hour}h de hoje. Quanto antes, melhor a sua pontuação.</p>
            {links.map((l, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-2xl bg-white/5 p-3">
                <div className="flex gap-2">
                  <select aria-label="Tipo" value={l.kind} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, kind: e.target.value } : x))} className="min-h-11 rounded-xl border border-white/20 bg-transparent px-2 text-[14px]">
                    <option value="video">Vídeos</option><option value="foto">Fotos</option><option value="extra">Extra</option>
                  </select>
                  <input value={l.url} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} inputMode="url" placeholder="https://drive.google.com/…" className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-transparent px-3 text-[14px]" />
                  {links.length > 1 && <button type="button" aria-label="Tirar link" onClick={() => setLinks(links.filter((_, j) => j !== i))} className="grid size-11 cursor-pointer place-items-center rounded-xl opacity-70 hover:opacity-100"><Trash2 size={16} aria-hidden="true" /></button>}
                </div>
                <input value={l.note} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} placeholder="Observação (opcional)" className="min-h-10 rounded-xl border border-white/20 bg-transparent px-3 text-[13px]" />
              </div>
            ))}
            <button type="button" onClick={() => setLinks([...links, { kind: 'extra', url: '', note: '' }])} className="inline-flex min-h-10 cursor-pointer items-center gap-1 self-start text-[14px] font-semibold text-accent"><Plus size={15} aria-hidden="true" /> Mais um link</button>
            <button type="button" disabled={!valid || send.isPending} onClick={() => send.mutate()} className={cn(btn, 'bg-accent text-[var(--ellcazo-band)]')}><Send size={18} aria-hidden="true" /> {send.isPending ? 'Enviando' : 'Enviar para o editor'}</button>
          </section>
        )}
        {step === 3 && <p className="flex items-center gap-2 rounded-3xl bg-white/5 p-4 text-[15px] font-semibold"><CheckCircle2 size={20} aria-hidden="true" className="text-accent" /> Tudo certo. Material entregue para a edição.</p>}

        {v.script && (
          <details className="rounded-3xl bg-white/5 p-4">
            <summary className="cursor-pointer font-semibold">Roteiro aprovado</summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[14px] leading-relaxed opacity-90">{v.script}</pre>
          </details>
        )}
      </main>
    </div>
  )
}
