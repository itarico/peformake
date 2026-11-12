import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { logoPublicUrl } from '@/features/clients/clientsApi'
import { presentHtml, type Orientation } from './consultDeck'

type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>

/**
 * Link público da apresentação (/apresentacao/:token): só os slides do cliente, um por vez, sem login.
 * Celular em pé abre em retrato; computador, em paisagem. Nunca mostra os slides internos.
 */
export function PublicDeckPage() {
  const { token = '' } = useParams()
  const q = useQuery({
    queryKey: ['consult-public', token], retry: false,
    queryFn: async () => { const { data, error } = await rpc('consult_public', { _token: token }); if (error) throw new Error(error.message); return data as Doc },
  })
  const [o, setO] = useState<Orientation>(() => (typeof window !== 'undefined' && window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem'))
  useEffect(() => {
    const on = () => setO(window.innerWidth < window.innerHeight ? 'vertical' : 'paisagem')
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  useEffect(() => { document.title = q.data?.name ? `${q.data.name} · Peformake` : 'Peformake' }, [q.data?.name])
  const html = useMemo(() => {
    const d = q.data
    if (!d?.doc) return null
    return presentHtml({
      name: String(d.name ?? ''), doc: d.doc, questions: (d.questions ?? []) as Doc[] as { question: string; why?: string | null; answer?: string | null }[],
      clientLogoUrl: logoPublicUrl(d.logo_path ?? null), peformakeLogoUrl: `${window.location.origin}/logo-pfmk.png`, updatedAt: d.updated_at ?? null,
    }, o)
  }, [q.data, o])

  const msg = (t: string, sub?: string) => (
    <main className="grid min-h-dvh place-items-center bg-[#0a1d22] p-6 text-center text-[#cfe3e7]">
      <div><p className="text-[18px] font-semibold text-white">{t}</p>{sub && <p className="mt-1 text-[14px]">{sub}</p>}</div>
    </main>
  )
  if (q.isPending) return msg('Abrindo a apresentação…')
  if (q.isError) return msg('Este link não está mais ativo.', 'Peça um link novo para a equipe da Peformake.')
  if (q.data?.updating) return msg('A apresentação está sendo atualizada.', 'Volte daqui a pouco.')
  if (!html) return msg('Apresentação indisponível.')
  return <iframe title="Apresentação" srcDoc={html} className="fixed inset-0 size-full border-0" allow="fullscreen" />
}
