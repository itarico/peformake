import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { planHtml, printPlan } from './monthlyPlanDoc'

type Any = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>

/**
 * /plano/:clientId/:month (ex.: /plano/<id>/2026-12): o plano de execução do mês para qualquer pessoa da equipe.
 * O link vai no briefing de cada peça/roteiro/tarefa que nasce da estratégia. Uma rolagem só (o quadro cresce com o conteúdo).
 */
export function MonthlyPlanPage() {
  const { clientId = '', month = '' } = useParams()
  const m = /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : ''
  // ?secao=trafego: só a parte da área (o link que vai no aviso e no briefing de cada responsável).
  const [params] = useSearchParams()
  const only = params.get('secao')
  const q = useQuery({
    queryKey: ['monthly-plan', clientId, m], enabled: !!clientId && !!m, retry: false,
    queryFn: async () => {
      const { data, error } = await rpc('monthly_plan_get', { _client: clientId, _month: m })
      if (error) throw new Error(error.code === '42501' ? 'Sem permissão para ver este plano.' : 'Não foi possível abrir o plano.')
      return (data ?? null) as Any | null
    },
  })
  const html = useMemo(() => (q.data?.doc ? planHtml({ name: String(q.data.name ?? ''), month: m, doc: q.data.doc, only }) : null), [q.data, m, only])
  const frame = useRef<HTMLIFrameElement>(null)
  const [h, setH] = useState(600)
  useEffect(() => { document.title = q.data?.name ? `Plano de execução · ${q.data.name}` : 'Plano de execução' }, [q.data?.name])
  const fit = () => { const b = frame.current?.contentDocument?.documentElement; if (b) setH(b.scrollHeight + 8) }

  if (!m) return <p className="p-4 text-sm text-muted">Link do plano inválido.</p>
  if (q.isLoading) return <p className="p-4 text-sm text-muted">Abrindo o plano...</p>
  if (q.error) return <p className="p-4 text-sm text-muted">{(q.error as Error).message}</p>
  if (!q.data || !html) return <p className="p-4 text-sm text-muted">Ainda não há plano deste mês para este cliente.</p>
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Plano de execução</h1>
        {only && <Link to={`/plano/${clientId}/${month}`} className="text-[13px] font-semibold">Ver o plano completo</Link>}
        <Button variant="secondary" onClick={() => printPlan({ name: String(q.data!.name ?? ''), month: m, doc: q.data!.doc, only })}>
          <Download size={15} aria-hidden="true" /> Baixar PDF
        </Button>
      </div>
      <iframe ref={frame} title="Plano de execução" srcDoc={html} onLoad={() => { fit(); setTimeout(fit, 400) }} scrolling="no"
        className="w-full rounded-xl border border-border bg-white" style={{ height: h }} />
    </div>
  )
}
