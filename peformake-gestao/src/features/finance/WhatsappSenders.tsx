import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'

/** Quem pode lançar gasto/entrada mandando mensagem no WhatsApp principal (admin). */
export function WhatsappSenders() {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: ['fin-wa-senders'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('fin_whatsapp_senders').select('phone, label, units').order('label')
      if (error) throw error
      return data ?? []
    },
  })
  const [f, setF] = useState({ phone: '', label: '', ellcazo: false })
  const save = useMutation({
    mutationFn: async (v: { phone: string; label: string; units: string[]; remove?: boolean }) => {
      const { error } = await supabase.rpc('fin_whatsapp_sender_save', { _phone: v.phone, _label: v.label, _units: v.units, _remove: v.remove ?? false })
      if (error) throw error
    },
    onSuccess: () => { setF({ phone: '', label: '', ellcazo: false }); void queryClient.invalidateQueries({ queryKey: ['fin-wa-senders'] }) },
  })
  if (list.isError) return null
  return (
    <section aria-labelledby="fin-wa" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="fin-wa" className="flex items-center gap-2 text-[17px] font-semibold"><MessageCircle size={18} aria-hidden="true" /> Lançar pelo WhatsApp</h2>
        <p className="max-w-[70ch] text-[13px] text-muted">Quem está aqui pode mandar no WhatsApp da Peformake: <b>gasto 89,90 canva</b> ou <b>entrada 1500 pix cliente</b>. Com a palavra <b>ellcazo</b> vai para o caixa da Ellcazo. O sistema responde confirmando.</p>
      </div>
      {(list.data ?? []).length > 0 && (
        <ul className="flex flex-col">
          {list.data!.map((s) => (
            <li key={s.phone} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[14px] last:border-b-0">
              <span>{s.label} <span className="text-muted">· +{s.phone} · {s.units.map((u) => (u === 'ellcazo' ? 'Ellcazo' : 'Peformake')).join(' e ')}</span></span>
              <button type="button" disabled={save.isPending} onClick={() => save.mutate({ phone: s.phone, label: s.label, units: s.units, remove: true })} className="min-h-9 cursor-pointer text-[13px] text-muted underline hover:text-ink">Remover</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-[13px] font-semibold">Nome<input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">WhatsApp com DDD<input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={field} /></label>
        <label className="flex min-h-11 items-center gap-2 text-[14px] font-medium"><input type="checkbox" checked={f.ellcazo} onChange={(e) => setF({ ...f, ellcazo: e.target.checked })} className="size-4" /> Pode lançar na Ellcazo</label>
        <Button variant="secondary" disabled={f.label.trim().length < 2 || f.phone.replace(/\D/g, '').length < 10 || save.isPending}
          onClick={() => save.mutate({ phone: f.phone, label: f.label, units: f.ellcazo ? ['peformake', 'ellcazo'] : ['peformake'] })}>Autorizar</Button>
      </div>
      {save.isError && <p role="alert" className="font-medium text-warn-ink">Não foi possível salvar.</p>}
    </section>
  )
}
