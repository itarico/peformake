import { ellcazoSvg } from '@/components/ui/EllcazoMark'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clapperboard, FileDown, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { LoadState } from '@/features/traffic/LoadState'
import { inArea, useProduction } from '@/features/production/useProduction'
import { AvTabs, EllcazoHeader } from './AvBoard'

type ScriptStatus = 'rascunho' | 'aprovado' | 'gravado' | 'arquivado'
interface Script { id: string; clientId: string; title: string; body: string; source: string; status: ScriptStatus; createdAt: string }

const STATUS: Record<ScriptStatus, { label: string; tone: string }> = {
  rascunho: { label: 'Rascunho', tone: 'bg-raised text-muted' },
  aprovado: { label: 'Aprovado', tone: 'bg-accent-soft text-accent-ink' },
  gravado: { label: 'Gravado', tone: 'bg-ok-soft text-ok-ink' },
  arquivado: { label: 'Arquivado', tone: 'bg-raised text-muted' },
}
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 font-normal text-ink'
const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })

async function listScripts(): Promise<Script[]> {
  const { data, error } = await supabase.from('client_scripts').select('id, client_id, title, body, source, status, created_at').order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return (data ?? []).map((s) => ({ id: s.id, clientId: s.client_id, title: s.title, body: s.body, source: s.source, status: s.status as ScriptStatus, createdAt: s.created_at }))
}

/** Abre uma janela só com o roteiro, no layout da Ellcazo, pronta para salvar em PDF. */
function exportScript(s: Script, client: string) {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(s.title)} · Ellcazo</title>
<style>@page{margin:18mm}body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#15181e;margin:0}
header{background:#1b1d18;color:#f4f7ea;padding:28px 32px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.k{color:#b5e61d;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}h1{font-size:26px;margin:8px 0 4px;line-height:1.2}
.m{font-size:13px;opacity:.75}main{padding:24px 32px;font-size:15px;line-height:1.65;white-space:pre-wrap}footer{padding:0 32px 24px;font-size:11px;color:#6b7280}</style></head>
<body><header><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">${ellcazoSvg('#b5e61d', 34)}<div class="k">Ellcazo · Produtora audiovisual</div></div><h1>${esc(s.title)}</h1><div class="m">Roteiro para ${esc(client)} · ${when(s.createdAt)}</div></header>
<main>${esc(s.body || 'Roteiro sem texto.')}</main><footer>Ellcazo · Roteiro aprovado antes da gravação.</footer>
<script>window.onload=function(){window.print()}</script></body></html>`)
  w.document.close()
}

function ScriptForm({ script, onClose }: { script: Script | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { clients } = useProduction()
  const [d, setD] = useState({ clientId: script?.clientId ?? '', title: script?.title ?? '', body: script?.body ?? '', status: script?.status ?? 'rascunho' as ScriptStatus })
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('client_script_save', { _id: script?.id ?? null, _client_id: d.clientId, _title: d.title, _body: d.body, _status: d.status })
      if (error) throw error
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['client-scripts'] }); onClose() },
  })
  const valid = !!d.clientId && d.title.trim().length >= 2
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate() }} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-[13px] font-semibold">Cliente
          <select value={d.clientId} disabled={!!script} onChange={(e) => setD({ ...d, clientId: e.target.value })} className={field}>
            <option value="">Escolha o cliente</option>
            {(clients ?? []).filter((c) => inArea(c, 'audiovisual')).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Situação
          <select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as ScriptStatus })} className={field}>
            {(Object.keys(STATUS) as ScriptStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
        </label>
      </div>
      <label className="flex flex-col text-[13px] font-semibold">Título
        <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={200} className={field} />
      </label>
      <label className="flex flex-col text-[13px] font-semibold">Roteiro
        <textarea rows={14} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} placeholder={'Gancho (0 a 3s):\nDesenvolvimento:\nProva:\nChamada para ação:'} className={cn(field, 'text-[14px] leading-relaxed')} />
      </label>
      {save.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar.</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={!valid || save.isPending}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
      </div>
    </form>
  )
}

/** Roteiros de todos os clientes: os aprovados na estratégia chegam sozinhos; exporta no layout da Ellcazo. */
export function ScriptsPage() {
  const { clientName, isLive } = useProduction()
  const data = useQuery({ queryKey: ['client-scripts'], queryFn: listScripts })
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ScriptStatus | 'ativos'>('ativos')
  const [editing, setEditing] = useState<Script | 'new' | null>(null)

  const list = useMemo(() => (data.data ?? []).filter((s) => isLive(s.clientId, 'audiovisual') &&
    (status === 'ativos' ? s.status !== 'arquivado' : s.status === status) &&
    (!q.trim() || `${clientName(s.clientId)} ${s.title}`.toLowerCase().includes(q.trim().toLowerCase()))), [data.data, status, q, clientName, isLive])

  return (
    <div className="theme-ellcazo flex flex-col gap-4">
      <EllcazoHeader sub="Os roteiros aprovados na estratégia de tráfego chegam aqui sozinhos. Exporte com a marca da Ellcazo.">Roteiros</EllcazoHeader>
      <AvTabs />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Situação" className="flex flex-wrap gap-1">
          {(['ativos', 'rascunho', 'aprovado', 'gravado', 'arquivado'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
              className={cn('min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-medium', status === s ? 'bg-fill text-on-fill' : 'text-muted hover:bg-raised hover:text-ink')}>
              {s === 'ativos' ? 'Em uso' : STATUS[s].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative"><span className="sr-only">Buscar</span>
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente ou roteiro" className="min-h-10 w-[220px] rounded-full border border-line-strong bg-surface pl-9 pr-3 text-[14px]" />
          </label>
          <Button onClick={() => setEditing('new')}><Plus size={16} aria-hidden="true" /> Novo roteiro</Button>
        </div>
      </div>

      {!data.data ? <LoadState isPending={data.isPending} isError={data.isError} refetch={() => void data.refetch()} /> : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-muted">{clientName(s.clientId)}</p>
                  <button type="button" onClick={() => setEditing(s)} className="cursor-pointer text-left font-semibold leading-snug hover:underline">{s.title}</button>
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold', STATUS[s.status].tone)}>{STATUS[s.status].label}</span>
              </div>
              <p className="line-clamp-4 whitespace-pre-line text-[13px] text-muted">{s.body || 'Sem texto ainda.'}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1">{s.source === 'estrategia' && <Clapperboard size={12} aria-hidden="true" />}{s.source === 'estrategia' ? 'Da estratégia' : 'Escrito à mão'} · {when(s.createdAt)}</span>
                <button type="button" onClick={() => exportScript(s, clientName(s.clientId))} className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2.5 font-medium text-ink hover:bg-raised"><FileDown size={14} aria-hidden="true" /> PDF</button>
              </div>
            </li>
          ))}
          {list.length === 0 && <li className="rounded-3xl border border-dashed border-line-strong p-8 text-center text-muted md:col-span-2 xl:col-span-3">Nenhum roteiro aqui. Quando um roteiro da estratégia for aprovado, ele aparece sozinho.</li>}
        </ul>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} size="lg" title={editing === 'new' ? 'Novo roteiro' : 'Roteiro'}>
        {editing && <ScriptForm script={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      </Dialog>
    </div>
  )
}
