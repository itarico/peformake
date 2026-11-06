import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { ClientAvatar } from './ClientAvatar'
import { addMonths, draftFromClient, emptyDraft, kindToDraft, moneyText, parseMoney, validateDraft, type DraftErrors } from './clientFormRules'
import { clientErrorMessage, getSetupFee, LOGO_MAX_BYTES, LOGO_TYPES, logoPublicUrl, saveClient, uploadLogo, type ClientDraft } from './clientsApi'
import { clientKind, type ClientKind } from './portfolioRules'
import { inputClass, Segmented } from './ui'
import { useClients } from './useClients'

const SEGMENTS = [
  'Advocacia', 'Automotivo', 'Construção civil', 'Contabilidade', 'E-commerce', 'Educação', 'Estética e beleza', 'Fitness',
  'Gastronomia', 'Imobiliário', 'Moda', 'Odontologia', 'Pet', 'Saúde', 'Serviços', 'Tecnologia', 'Varejo',
]
type FormTab = 'dados' | 'contrato' | 'negocio'
const CONTRACT_KEYS: readonly (keyof ClientDraft)[] = ['startDate', 'months', 'endDate', 'billingDay', 'setupFee']
const CHANNELS = ['Indicação', 'Instagram', 'Tráfego pago', 'Google', 'Prospecção ativa', 'Evento', 'Site']

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId()
  const describedBy = error ? `${id}-erro` : hint ? `${id}-dica` : undefined
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-[13px] font-semibold">{label}</label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-erro`} role="alert" className="mt-1 text-[13px] font-medium text-warn-ink">{error}</p>
      ) : hint ? (
        <p id={`${id}-dica`} className="mt-1 text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

/** flat: dentro do pop-up, sem cartão nem título (as abas já dizem onde você está). */
function Section({ title, text, children, flat = false, hidden = false }: { title: string; text?: string; children: ReactNode; flat?: boolean; hidden?: boolean }) {
  return (
    <section hidden={hidden} aria-label={title} className={cn('flex flex-col gap-3', !flat && 'rounded-3xl border border-line bg-surface p-5')}>
      {(!flat || text) && (
        <div>
          {!flat && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
          {text && <p className="text-[13px] text-muted">{text}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

export function ClientFormPage() {
  const { id } = useParams()
  const isNew = !id
  const { isAdmin, canManage, query } = useClients()
  const client = query.data?.find((item) => item.id === id)

  if (!canManage) return <CenteredMessage title="Sem permissão" text="Só administrador ou head de marketing cadastra e edita clientes." />
  if (!isNew && query.isPending) return <p role="status" className="text-muted">Carregando</p>
  if (!isNew && !client) return <CenteredMessage title="Cliente não encontrado" text="Volte para a lista de clientes." />
  return <ClientForm key={client?.id ?? 'novo'} clientId={id ?? null} isAdmin={isAdmin} initial={client ? draftFromClient(client) : emptyDraft(todayInBrazil())} updatedAt={client?.updatedAt ?? null} existingSegments={(query.data ?? []).map((c) => c.segment).filter((s): s is string => !!s)} />
}

/** Cadastro e edição de cliente em janela (pop-up). Fecha com Esc, no X ou em Cancelar. */
export function ClientDialog({ open, onClose, clientId = null }: { open: boolean; onClose: () => void; clientId?: string | null }) {
  const { isAdmin, query } = useClients()
  const client = clientId ? query.data?.find((item) => item.id === clientId) : undefined
  return (
    <Dialog open={open} onClose={onClose} size="lg"
      title={client ? `Editar ${client.name}` : 'Novo cliente'}
      description={client ? undefined : 'Depois de salvar, você define a equipe e os serviços na ficha do cliente.'}>
      {(!clientId || client) && (
        <ClientForm key={client?.updatedAt ?? 'novo'} clientId={clientId} isAdmin={isAdmin}
          initial={client ? draftFromClient(client) : emptyDraft(todayInBrazil())} updatedAt={client?.updatedAt ?? null}
          existingSegments={(query.data ?? []).map((c) => c.segment).filter((x): x is string => !!x)} onCancel={onClose} />
      )}
    </Dialog>
  )
}

function ClientForm({ clientId, isAdmin, initial, updatedAt, existingSegments, onCancel }: {
  clientId: string | null
  isAdmin: boolean
  initial: ClientDraft
  updatedAt: string | null
  existingSegments: string[]
  /** Dentro da janela: sem título nem link de voltar, e Cancelar fecha a janela. */
  onCancel?: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<ClientDraft>(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [logoError, setLogoError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const inDialog = !!onCancel
  const [tab, setTab] = useState<FormTab>('dados')
  const kind: ClientKind = clientKind(draft.clientType, draft.contractModel)
  const segments = useMemo(() => [...new Set([...SEGMENTS, ...existingSegments])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [existingSegments])

  const fee = useQuery({ queryKey: ['client-fee', clientId], queryFn: () => getSetupFee(clientId as string), enabled: isAdmin && !!clientId })
  const feeReady = !isAdmin || !clientId || fee.isSuccess
  if (isAdmin && draft.setupFee === undefined && feeReady) {
    setDraft((current) => ({ ...current, setupFee: moneyText(fee.data ?? null) }))
  }

  const update = <K extends keyof ClientDraft>(key: K, value: ClientDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const setStartOrMonths = (startDate: string, months: string) => {
    const count = Number(months)
    setDraft((current) => ({
      ...current,
      startDate,
      months,
      endDate: startDate && Number.isInteger(count) && count > 0 && count <= 120 ? addMonths(startDate, count) : current.endDate,
    }))
    setErrors((current) => ({ ...current, startDate: undefined, months: undefined, endDate: undefined }))
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: ClientDraft = { ...draft }
      if (payload.setupFee !== undefined) payload.setupFee = payload.setupFee.trim() ? String(parseMoney(payload.setupFee)) : ''
      if (kind === 'avulso') payload.months = ''
      return saveClient(clientId, updatedAt, payload)
    },
    onSuccess: (savedId) => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] })
      void queryClient.invalidateQueries({ queryKey: ['client-fee', savedId] })
      navigate(`/clientes/${savedId}${clientId ? '' : '?novo=1'}`)
      onCancel?.()
    },
  })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validateDraft(draft)
    setErrors(found)
    const keys = Object.keys(found) as (keyof ClientDraft)[]
    if (keys.length > 0) {
      // No pop-up, abre a aba do primeiro erro antes de focar o campo.
      if (inDialog) setTab(CONTRACT_KEYS.includes(keys[0]!) ? 'contrato' : 'dados')
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
      return
    }
    save.mutate()
  }

  const pickLogo = async (file: File | undefined) => {
    setLogoError(null)
    if (!file) return
    if (!LOGO_TYPES.includes(file.type as (typeof LOGO_TYPES)[number])) return setLogoError('Use PNG, JPG ou WEBP.')
    if (file.size > LOGO_MAX_BYTES) return setLogoError('A imagem passa de 2 MB. Reduza e tente de novo.')
    setUploading(true)
    try {
      update('logoPath', await uploadLogo(file, clientId))
    } catch {
      setLogoError('Não foi possível enviar a imagem. Tente de novo.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const invalid = (key: keyof ClientDraft) => (errors[key] ? true : undefined)
  const back = clientId ? `/clientes/${clientId}` : '/clientes'

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {!onCancel && (
        <>
          <Link to={back} className="flex min-h-9 w-fit items-center gap-1.5 font-medium text-muted hover:text-ink">
            <ArrowLeft size={16} aria-hidden="true" /> {clientId ? 'Voltar para o cliente' : 'Clientes'}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{clientId ? `Editar ${initial.name}` : 'Novo cliente'}</h1>
          {!clientId && <p className="-mt-2 text-muted">Depois de salvar, você define a equipe e os serviços na ficha do cliente.</p>}
        </>
      )}

      {inDialog && (
        <Segmented label="Parte do cadastro" value={tab} onChange={setTab}
          options={[{ id: 'dados', label: 'Dados' }, { id: 'contrato', label: kind === 'avulso' ? 'Projeto' : 'Contrato' }, { id: 'negocio', label: 'Sobre o negócio' }]} />
      )}

      <Section title="Identificação" flat={inDialog} hidden={inDialog && tab !== 'dados'}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold">Tipo de cliente</span>
          <Segmented
            label="Tipo de cliente"
            value={kind}
            onChange={(value) => setDraft((current) => ({ ...current, ...kindToDraft(value) }))}
            options={[{ id: 'fixo', label: 'Fixo mensal' }, { id: 'tcv', label: 'TCV' }, { id: 'avulso', label: 'Avulso' }]}
          />
        </div>
        <p className="-mt-2 text-[12px] text-muted">
          {kind === 'fixo' ? 'Paga todo mês enquanto o contrato durar.' : kind === 'tcv' ? 'Valor total fechado para o período do contrato.' : 'Projeto pontual, sem mensalidade.'}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <ClientAvatar name={draft.name || '?'} url={logoPublicUrl(draft.logoPath)} size="lg" />
            <input ref={fileRef} type="file" accept={LOGO_TYPES.join(',')} className="sr-only" id="foto" onChange={(event) => void pickLogo(event.target.files?.[0])} />
            <div className="flex gap-1">
              <label htmlFor="foto" className={cn('inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:border-ink', uploading && 'pointer-events-none opacity-50')}>
                <ImagePlus size={15} aria-hidden="true" /> {uploading ? 'Enviando' : draft.logoPath ? 'Trocar' : 'Foto'}
              </label>
              {draft.logoPath && (
                <button type="button" onClick={() => update('logoPath', null)} aria-label="Remover foto" className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              )}
            </div>
            {logoError && <p role="alert" className="max-w-[160px] text-center text-[12px] font-medium text-warn-ink">{logoError}</p>}
          </div>

          <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome do cliente *" error={errors.name}>
                {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('name')} value={draft.name} onChange={(e) => update('name', e.target.value)} className={inputClass} autoComplete="off" />}
              </Field>
            </div>
            <Field label="WhatsApp *" error={errors.phone} hint="Com DDD. Usado para contato e para o portal.">
              {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('phone')} inputMode="tel" value={draft.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} placeholder="(81) 98888-7777" />}
            </Field>
            <Field label="E-mail" error={errors.email}>
              {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('email')} type="email" inputMode="email" value={draft.email} onChange={(e) => update('email', e.target.value)} className={inputClass} placeholder="contato@empresa.com" />}
            </Field>
            <Field label="Segmento" hint="Escolha da lista ou digite um novo.">
              {(fid, by) => (
                <>
                  <input id={fid} aria-describedby={by} list={`${fid}-lista`} value={draft.segment} onChange={(e) => update('segment', e.target.value)} className={inputClass} />
                  <datalist id={`${fid}-lista`}>{segments.map((s) => <option key={s} value={s} />)}</datalist>
                </>
              )}
            </Field>
            <Field label="Como chegou">
              {(fid) => (
                <>
                  <input id={fid} list={`${fid}-lista`} value={draft.acquisitionChannel} onChange={(e) => update('acquisitionChannel', e.target.value)} className={inputClass} />
                  <datalist id={`${fid}-lista`}>{CHANNELS.map((s) => <option key={s} value={s} />)}</datalist>
                </>
              )}
            </Field>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={draft.showOnSite} onChange={(e) => update('showOnSite', e.target.checked)} className="size-5 accent-[var(--accent)]" />
              <span><b className="font-semibold">Mostrar no site</b> <span className="text-muted">na lista de clientes da página inicial</span></span>
            </label>
          </div>
        </div>
      </Section>

      <Section flat={inDialog} hidden={inDialog && tab !== 'contrato'} title={kind === 'avulso' ? 'Projeto' : 'Contrato'} text={kind === 'avulso' ? 'Datas do projeto, se houver.' : 'O fim é calculado pelo início e pela duração. Você pode ajustar.'}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
          <Field label="Início" error={errors.startDate}>
            {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('startDate')} type="date" value={draft.startDate} onChange={(e) => (kind === 'avulso' ? update('startDate', e.target.value) : setStartOrMonths(e.target.value, draft.months))} className={inputClass} />}
          </Field>
          {kind !== 'avulso' && (
            <Field label="Duração em meses" error={errors.months}>
              {(fid, by) => (
                <>
                  <input id={fid} aria-describedby={by} aria-invalid={invalid('months')} inputMode="numeric" list={`${fid}-lista`} value={draft.months} onChange={(e) => setStartOrMonths(draft.startDate, e.target.value.replace(/\D/g, ''))} className={inputClass} />
                  <datalist id={`${fid}-lista`}>{['3', '6', '12', '24'].map((m) => <option key={m} value={m} />)}</datalist>
                </>
              )}
            </Field>
          )}
          <Field label="Fim" error={errors.endDate}>
            {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('endDate')} type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => update('endDate', e.target.value)} className={inputClass} />}
          </Field>
          {kind !== 'avulso' && (
            <Field label="Dia de cobrança" error={errors.billingDay}>
              {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('billingDay')} inputMode="numeric" value={draft.billingDay} onChange={(e) => update('billingDay', e.target.value.replace(/\D/g, '').slice(0, 2))} className={inputClass} placeholder="10" />}
            </Field>
          )}
          {isAdmin && draft.setupFee !== undefined && (
            <Field label="Taxa de implantação (R$)" error={errors.setupFee} hint="Só administradores veem.">
              {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('setupFee')} inputMode="decimal" value={draft.setupFee ?? ''} onChange={(e) => update('setupFee', e.target.value)} className={inputClass} placeholder="0,00" />}
            </Field>
          )}
        </div>
      </Section>

      <Section flat={inDialog} hidden={inDialog && tab !== 'negocio'} title="Sobre o negócio" text="Ajuda a equipe a planejar. Tudo opcional.">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
          {([
            ['description', 'O que a empresa faz'],
            ['targetAudience', 'Público-alvo'],
            ['valueProposition', 'Diferencial'],
            ['competitors', 'Concorrentes'],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              {(fid) => <textarea id={fid} rows={inDialog ? 2 : 3} maxLength={2000} value={draft[key]} onChange={(e) => update(key, e.target.value)} className={cn(inputClass, 'resize-y')} />}
            </Field>
          ))}
        </div>
      </Section>

      {save.isError && <p role="alert" className="rounded-3xl bg-warn-soft p-4 font-medium text-warn-ink">{clientErrorMessage(save.error)}</p>}

      <div className={cn('sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/95 py-3 backdrop-blur', onCancel ? '-mx-5 -mb-4 px-5' : '-mx-4 px-4 md:-mx-7 md:px-7')}>
        {onCancel
          ? <button type="button" onClick={onCancel} className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-4 font-medium hover:border-ink">Cancelar</button>
          : <Link to={back} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 font-medium hover:border-ink">Cancelar</Link>}
        <Button type="submit" disabled={save.isPending || uploading || !feeReady}>{save.isPending ? 'Salvando' : clientId ? 'Salvar alterações' : 'Cadastrar cliente'}</Button>
      </div>
    </form>
  )
}
