import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { addLink, clientErrorMessage, deleteClient, listEvents, listLinks, removeLink, setClientStatus } from './clientsApi'
import type { ClientRecord } from './clientRules'
import { dateBr } from './format'
import { Block, inputClass, selectClass } from './ui'

export function LinksSection({ clientId, canManage }: { clientId: string; canManage: boolean }) {
  const queryClient = useQueryClient()
  const key = ['client-links', clientId]
  const links = useQuery({ queryKey: key, queryFn: () => listLinks(clientId) })
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const validUrl = /^https?:\/\/\S+$/i.test(url.trim())
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key })
  const add = useMutation({
    mutationFn: () => addLink(clientId, name.trim(), url.trim()),
    onSuccess: () => {
      setName('')
      setUrl('')
      setAdding(false)
      refresh()
    },
  })
  const remove = useMutation({ mutationFn: removeLink, onSuccess: refresh })

  return (
    <Block title="Arquivos e links" action={canManage ? <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setAdding(true)}>Adicionar</Button> : undefined}>
      {links.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar os links.</p>}
      {links.data?.length === 0 && <p className="text-muted">Nenhum link. Guarde aqui a pasta do Drive, o contrato assinado e materiais do cliente.</p>}
      <ul className="flex flex-col">
        {links.data?.map((link) => (
          <li key={link.id} className="flex items-center justify-between gap-2 border-t border-line py-1.5 first:border-t-0">
            <a href={link.url} target="_blank" rel="noreferrer noopener" className="flex min-h-9 min-w-0 items-center gap-1.5 font-medium hover:underline">
              <ExternalLink size={14} aria-hidden="true" className="shrink-0" /> <span className="truncate">{link.name}</span>
            </a>
            {canManage && (
              <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(link.id)} aria-label={`Remover ${link.name}`} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink">
                <Trash2 size={15} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <Dialog open={adding} onClose={() => setAdding(false)} title="Adicionar arquivo ou link" size="sm">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col text-[13px] font-semibold">Nome
            <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className={cn(inputClass, 'mt-1 font-normal')} placeholder="Pasta do Drive" />
          </label>
          <label className="flex flex-col text-[13px] font-semibold">Endereço
            <input value={url} inputMode="url" onChange={(e) => setUrl(e.target.value)} className={cn(inputClass, 'mt-1 font-normal')} placeholder="https://" />
          </label>
          {url.trim() && !validUrl && <p className="text-[12px] text-warn-ink">O endereço precisa começar com https://</p>}
          {add.isError && <p role="alert" className="text-[13px] text-warn-ink">{clientErrorMessage(add.error)}</p>}
          <div className="flex gap-2">
            <Button disabled={!name.trim() || !validUrl || add.isPending} onClick={() => add.mutate()}>Salvar link</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      </Dialog>
    </Block>
  )
}

const EVENT_LABEL = { joined: 'Entrou', churned: 'Saiu', reactivated: 'Voltou' } as const

export function HistorySection({ clientId }: { clientId: string }) {
  const events = useQuery({ queryKey: ['client-events', clientId], queryFn: () => listEvents(clientId) })
  return (
    <Block title="Histórico">
      {events.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar o histórico.</p>}
      {events.data?.length === 0 && <p className="text-muted">Sem registros de entrada ou saída.</p>}
      <ol className="flex flex-col">
        {events.data?.map((event) => (
          <li key={event.id} className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 text-[13px] first:border-t-0">
            <span><b className={cn('font-semibold', event.type === 'churned' && 'text-warn-ink')}>{EVENT_LABEL[event.type]}</b>{event.notes && <span className="text-muted"> | {event.notes}</span>}</span>
            <span className="shrink-0 tabular-nums text-muted">{dateBr(event.date)}</span>
          </li>
        ))}
      </ol>
    </Block>
  )
}

const REASONS = ['Cancelou por preço', 'Insatisfação com resultado', 'Fim do contrato', 'Mudou de agência', 'Internalizou o marketing', 'Inadimplência', 'Outro']

export function StatusSection({ client, canManage, isAdmin }: { client: ClientRecord; canManage: boolean; isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'idle' | 'lose' | 'delete'>('idle')
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['clients'] })
    void queryClient.invalidateQueries({ queryKey: ['client-events', client.id] })
    void queryClient.invalidateQueries({ queryKey: ['portal-link', client.id] })
    void queryClient.invalidateQueries({ queryKey: ['ad-accounts'] })
  }
  const fullReason = [reason, detail.trim()].filter(Boolean).join(': ')
  const status = useMutation({
    mutationFn: (lost: boolean) => setClientStatus(client.id, lost, lost ? fullReason : null),
    onSuccess: () => {
      setMode('idle')
      setReason('')
      setDetail('')
      refresh()
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteClient(client.id, confirmName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] })
      navigate('/clientes', { replace: true })
    },
  })
  if (!canManage) return null

  return (
    <Block title="Situação do cliente" className="border-dashed">
      {client.isActive ? (
        <p className="text-[13px] text-muted">Cliente ativo. Ao marcar como perdido, o portal é desativado e as contas de anúncios param de ser lidas.</p>
      ) : (
        <p className="text-[13px]"><b>Perdido em {dateBr(client.lostAt)}.</b> {client.lostReason && <span className="text-muted">Motivo: {client.lostReason}</span>}</p>
      )}

      {(
        <div className="flex flex-wrap gap-2">
          {client.isActive ? (
            <Button variant="secondary" onClick={() => { status.reset(); setMode('lose') }}>Marcar como perdido</Button>
          ) : (
            <Button variant="secondary" disabled={status.isPending} onClick={() => status.mutate(false)}>{status.isPending ? 'Reativando' : 'Reativar cliente'}</Button>
          )}
          {isAdmin && <Button variant="link" onClick={() => { remove.reset(); setConfirmName(''); setMode('delete') }}>Excluir de vez</Button>}
        </div>
      )}

      <Dialog open={mode === 'lose'} onClose={() => setMode('idle')} title="Marcar como perdido" size="sm">
        <div className="flex flex-col gap-2">
          <label htmlFor={`motivo-${client.id}`} className="text-[13px] font-semibold">Motivo da saída *</label>
          <select id={`motivo-${client.id}`} value={reason} onChange={(e) => setReason(e.target.value)} className={`${selectClass} w-full`}>
            <option value="">Escolha</option>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label htmlFor={`detalhe-${client.id}`} className="text-[13px] font-semibold">Detalhe {reason === 'Outro' ? '*' : '(opcional)'}</label>
          <textarea id={`detalhe-${client.id}`} rows={2} maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)} className={cn(inputClass, 'resize-y')} />
          <p className="text-[12px] text-muted">O motivo alimenta a análise de perdas. Seja específico.</p>
          <div className="flex gap-2">
            <Button disabled={!reason || (reason === 'Outro' && detail.trim().length < 5) || status.isPending} onClick={() => status.mutate(true)}>Confirmar saída</Button>
            <Button variant="secondary" onClick={() => setMode('idle')}>Cancelar</Button>
          </div>
          {status.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{clientErrorMessage(status.error)}</p>}
        </div>
      </Dialog>

      <Dialog open={mode === 'delete'} onClose={() => setMode('idle')} title="Excluir cliente de vez" size="sm">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-warn-ink">Excluir apaga o cliente, serviços, equipe, avaliações, links e histórico. Não tem volta.</p>
          <p className="text-[13px]">Na maioria dos casos, marcar como perdido é melhor: guarda o histórico para análise.</p>
          <label htmlFor={`confirmar-${client.id}`} className="text-[13px] font-semibold">Digite <b>{client.name}</b> para confirmar</label>
          <input id={`confirmar-${client.id}`} value={confirmName} onChange={(e) => setConfirmName(e.target.value)} className={inputClass} autoComplete="off" />
          {remove.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{clientErrorMessage(remove.error)}</p>}
          <div className="flex gap-2">
            <Button disabled={confirmName.trim().toLowerCase() !== client.name.trim().toLowerCase() || remove.isPending} onClick={() => remove.mutate()}>Excluir de vez</Button>
            <Button variant="secondary" onClick={() => setMode('idle')}>Cancelar</Button>
          </div>
        </div>
      </Dialog>
      {status.isError && <p role="alert" className="text-[13px] font-medium text-warn-ink">{clientErrorMessage(status.error)}</p>}
    </Block>
  )
}
