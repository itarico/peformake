import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Hand, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

/** Arte pedida pelo WhatsApp: mostra quanto falta para a IA assumir e deixa a equipe assumir antes. */
export function AiTakeoverBanner({ itemId }: { itemId: string }) {
  const queryClient = useQueryClient()
  const data = useQuery({
    queryKey: ['content-ai', itemId],
    queryFn: async () => {
      const [item, req] = await Promise.all([
        supabase.from('content_items').select('ai_deadline_at, status').eq('id', itemId).single(),
        supabase.from('creative_requests').select('status, error, created_at').eq('item_id', itemId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (item.error) throw item.error
      return { deadline: item.data.ai_deadline_at as string | null, status: item.data.status as string, request: req.data }
    },
    refetchInterval: 15_000,
  })
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const claim = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('content_item_claim', { _item_id: itemId })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content-ai', itemId] })
      void queryClient.invalidateQueries({ queryKey: ['content-item', itemId] })
      void queryClient.invalidateQueries({ queryKey: ['content-events', itemId] })
    },
  })
  if (!data.data) return null
  const { deadline, request } = data.data
  if (request && (request.status === 'queued' || request.status === 'rendering')) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-3xl bg-accent-soft px-5 py-3 text-[14px] text-accent-ink">
        <Loader2 size={16} aria-hidden="true" className="animate-spin" /> A IA está criando esta arte com a foto do cliente.
      </p>
    )
  }
  if (!deadline) return null
  const left = Math.max(0, Math.round((Date.parse(deadline) - now) / 1000))
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-accent/30 bg-accent-soft/60 px-5 py-3">
      <p className="flex items-center gap-2 text-[14px]">
        <Sparkles size={16} aria-hidden="true" className="text-accent-ink" />
        {left > 0 ? <>Pedido do cliente pelo WhatsApp. Se ninguém assumir em <b className="tabular-nums">{mm}:{ss}</b>, a IA faz a arte.</> : 'A IA vai assumir agora.'}
      </p>
      <Button className="min-h-10 px-4 text-[13px]" disabled={claim.isPending || left === 0} onClick={() => claim.mutate()}>
        <Hand size={15} aria-hidden="true" /> {claim.isPending ? 'Assumindo' : 'Eu faço'}
      </Button>
    </div>
  )
}
