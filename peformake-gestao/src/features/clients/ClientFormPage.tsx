import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, Search, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { todayInBrazil } from '@/features/traffic/metricsRules'
import { cn } from '@/lib/cn'
import { ClientAvatar } from './ClientAvatar'
import { addMonths, draftFromClient, emptyDraft, formatDocument, instagramHandle, kindToDraft, moneyText, parseMoney, validateDraft, type DraftErrors } from './clientFormRules'
import { clientErrorMessage, getSetupFee, LOGO_MAX_BYTES, lookupCnpj, LOGO_TYPES, logoPublicUrl, saveClient, uploadLogo, type ClientDraft } from './clientsApi'
import { clientKind, type ClientKind } from './portfolioRules'
import { inputClass, Segmented } from './ui'
import { useClients } from './useClients'

const SEGMENTS = [
  'Advocacia', 'Automotivo', 'Construção civil', 'Contabilidade', 'E-commerce', 'Educação', 'Estética e beleza', 'Fitness',
  'Gastronomia', 'Imobiliário', 'Indústria', 'Moda', 'Odontologia', 'Ótica', 'Pet', 'Saúde', 'Serviços', 'Tecnologia', 'Varejo',
]
// Pop-up sem rolagem: cada aba cabe na tela (computador e celular). "perfil" = presença on-line e origem; "negocio" = textos opcionais.
type FormTab = 'dados' | 'empresa' | 'perfil' | 'contrato' | 'negocio'
const COMPANY_KEYS: readonly (keyof ClientDraft)[] = ['document', 'legalName', 'address', 'billingEmail']
const PROFILE_KEYS: readonly (keyof ClientDraft)[] = ['instagram', 'website']
const ORDER: FormTab[] = ['empresa', 'dados', 'perfil', 'contrato', 'negocio']
const STEP_KEYS: Record<FormTab, readonly (keyof ClientDraft)[]> = {
  empresa: COMPANY_KEYS, dados: ['name', 'phone', 'email'], perfil: PROFILE_KEYS, contrato: ['startDate', 'months', 'endDate', 'billingDay', 'setupFee'], negocio: [],
}
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
        <p id={`${id}-dica`} className="mt-1 text-[12px] text-muted max-md:sr-only">{hint}</p>
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
          {text && <p className={cn('text-[13px] text-muted', flat && 'max-md:sr-only')}>{text}</p>}
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
export function ClientDialog({ open, onClose, clientId = null, startTab }: { open: boolean; onClose: () => void; clientId?: string | null; startTab?: FormTab }) {
  const { isAdmin, query } = useClients()
  const client = clientId ? query.data?.find((item) => item.id === clientId) : undefined
  return (
    <Dialog open={open} onClose={onClose} size="lg"
      title={client ? `Editar ${client.name}` : 'Novo cliente'}
      description={client ? undefined : 'Comece pelo CNPJ: o sistema busca na Receita e preenche o resto. Depois de cadastrar, você define equipe, serviços e contrato na ficha.'}>
      {(!clientId || client) && (
        <ClientForm key={client?.updatedAt ?? 'novo'} clientId={clientId} isAdmin={isAdmin}
          initial={client ? draftFromClient(client) : emptyDraft(todayInBrazil())} updatedAt={client?.updatedAt ?? null}
          existingSegments={(query.data ?? []).map((c) => c.segment).filter((x): x is string => !!x)} onCancel={onClose} startTab={startTab} />
      )}
    </Dialog>
  )
}

function ClientForm({ clientId, isAdmin, initial, updatedAt, existingSegments, onCancel, startTab }: {
  startTab?: FormTab
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
  // Cliente novo: passo a passo, começando pela empresa (o CNPJ preenche o resto). Editar: abas livres.
  const wizard = inDialog && !clientId
  const [tab, setTab] = useState<FormTab>(startTab ?? (wizard ? 'empresa' : 'dados'))
  const stepIndex = ORDER.indexOf(tab)
  const next = () => {
    const found = validateDraft(draft)
    const here = Object.fromEntries(Object.entries(found).filter(([k]) => STEP_KEYS[tab].includes(k as keyof ClientDraft)))
    setErrors(here)
    if (Object.keys(here).length) { setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); return }
    setTab(ORDER[Math.min(stepIndex + 1, ORDER.length - 1)]!)
  }
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

  const lookup = useMutation({
    mutationFn: lookupCnpj,
    onSuccess: (found) => {
      setDraft((current) => ({
        ...current,
        legalName: found.legalName || current.legalName,
        name: current.name || found.tradeName || found.legalName,
        companySize: found.size ?? current.companySize,
        companyCapital: found.capital ?? current.companyCapital,
        address: found.address || current.address,
        billingEmail: current.billingEmail || found.email || '',
        email: current.email || found.email || '',
        phone: current.phone || found.phone || '',
      }))
      setErrors((current) => ({ ...current, document: undefined }))
    },
  })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (wizard && stepIndex < ORDER.length - 1) return next()
    const found = validateDraft(draft)
    setErrors(found)
    const keys = Object.keys(found) as (keyof ClientDraft)[]
    if (keys.length > 0) {
      // No pop-up, abre a aba do primeiro erro antes de focar o campo.
      if (inDialog) setTab(CONTRACT_KEYS.includes(keys[0]!) ? 'contrato' : COMPANY_KEYS.includes(keys[0]!) ? 'empresa' : PROFILE_KEYS.includes(keys[0]!) ? 'perfil' : 'dados')
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

      {inDialog && !wizard && (
        <Segmented label="Parte do cadastro" value={tab} onChange={setTab}
          options={[{ id: 'empresa', label: 'Empresa' }, { id: 'dados', label: 'Contato' }, { id: 'perfil', label: 'Perfil' }, { id: 'contrato', label: kind === 'avulso' ? 'Projeto' : 'Condições' }, { id: 'negocio', label: 'Sobre' }]} />
      )}
      {wizard && (
        <ol aria-label="Etapas do cadastro" className="grid grid-cols-5 gap-1.5">
          {['Empresa', 'Contato', 'Perfil', kind === 'avulso' ? 'Projeto' : 'Condições', 'Sobre'].map((label, i) => (
            <li key={label} className="flex flex-col gap-1">
              <span className={cn('h-1.5 rounded-full', i <= stepIndex ? 'bg-accent' : 'bg-raised')} />
              <span className={cn('truncate text-[12px]', i === stepIndex ? 'font-semibold' : 'text-muted')}>{i + 1}. {label}</span>
            </li>
          ))}
        </ol>
      )}

      <Section title="Identificação" flat={inDialog} hidden={inDialog && tab !== 'dados'}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:gap-2">
            <ClientAvatar name={draft.name || '?'} url={logoPublicUrl(draft.logoPath)} size="lg" />
            <input ref={fileRef} type="file" accept={LOGO_TYPES.join(',')} className="sr-only" id="foto" onChange={(event) => void pickLogo(event.target.files?.[0])} />
            <div className="flex gap-1">
              <label htmlFor="foto" className={cn('inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:border-ink', uploading && 'pointer-events-none opacity-50')}>
                <ImagePlus size={15} aria-hidden="true" /> {uploading ? 'Enviando' : draft.logoPath ? 'Trocar' : 'Foto'}
              </label>
              {draft.logoPath && (
                <button type="button" onClick={() => update('logoPath', null)} aria-label="Remover foto" className="flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              )}
            </div>
            {logoError && <p role="alert" className="max-w-[160px] text-center text-[12px] font-medium text-warn-ink">{logoError}</p>}
          </div>

          <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome do cliente *" error={errors.name}>
                {(fid, by) => <input id={fid} name="pf-cliente-nome" aria-describedby={by} aria-invalid={invalid('name')} value={draft.name} onChange={(e) => update('name', e.target.value)} className={inputClass} autoComplete="off" />}
              </Field>
            </div>
            <Field label="WhatsApp *" error={errors.phone} hint="Com DDD. Usado para contato e para o portal.">
              {(fid, by) => <input id={fid} name="pf-cliente-whatsapp" aria-describedby={by} aria-invalid={invalid('phone')} inputMode="tel" value={draft.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} placeholder="(81) 98888-7777" autoComplete="off" />}
            </Field>
            <Field label="E-mail" error={errors.email}>
              {(fid, by) => <input id={fid} name="pf-cliente-email" aria-describedby={by} aria-invalid={invalid('email')} type="email" inputMode="email" value={draft.email} onChange={(e) => update('email', e.target.value)} className={inputClass} placeholder="contato@empresa.com" autoComplete="off" />}
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Perfil" flat={inDialog} hidden={inDialog && tab !== 'perfil'}>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <Field label="Instagram" error={errors.instagram} hint="@perfil ou o link do perfil.">
            {(fid, by) => <input id={fid} name="pf-cliente-instagram" aria-describedby={by} aria-invalid={invalid('instagram')} value={draft.instagram} onChange={(e) => update('instagram', e.target.value)} onBlur={(e) => e.target.value.trim() && update('instagram', `@${instagramHandle(e.target.value)}`)} className={inputClass} placeholder="@empresa" autoComplete="off" />}
          </Field>
          <Field label="Site" error={errors.website}>
            {(fid, by) => <input id={fid} name="pf-cliente-site" aria-describedby={by} aria-invalid={invalid('website')} inputMode="url" value={draft.website} onChange={(e) => update('website', e.target.value)} className={inputClass} placeholder="empresa.com.br" autoComplete="off" />}
          </Field>
          <Field label="Segmento" hint="Digite e escolha, ou adicione um novo.">
            {(fid, by) => <SearchSelect id={fid} name="pf-cliente-segmento" describedBy={by} value={draft.segment} onChange={(v) => update('segment', v)} options={segments} placeholder="Ex.: Estética e beleza" />}
          </Field>
          <Field label="Como chegou">
            {(fid) => <SearchSelect id={fid} name="pf-cliente-origem" value={draft.acquisitionChannel} onChange={(v) => update('acquisitionChannel', v)} options={CHANNELS} placeholder="Ex.: Indicação" />}
          </Field>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={draft.showOnSite} onChange={(e) => update('showOnSite', e.target.checked)} className="size-5 accent-[var(--accent)]" />
            <span><b className="font-semibold">Mostrar no site</b> <span className="text-muted">na lista de clientes da página inicial</span></span>
          </label>
        </div>
      </Section>

      <Section flat={inDialog} hidden={inDialog && tab !== 'empresa'} title="Empresa" text="Dados que vão no contrato e na cobrança. Com CNPJ, a busca preenche o resto pela Receita.">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <Field label="CPF ou CNPJ" error={errors.document ?? lookup.error?.message}>
            {(fid, by) => (
              <div className="flex gap-2">
                <input id={fid} name="pf-cliente-documento" autoComplete="off" aria-describedby={by} aria-invalid={invalid('document')} inputMode="numeric" value={draft.document}
                  onChange={(e) => update('document', e.target.value)} onBlur={(e) => update('document', formatDocument(e.target.value))}
                  className={inputClass} placeholder="00.000.000/0000-00" />
                <Button type="button" variant="secondary" className="shrink-0" disabled={draft.document.replace(/\D/g, '').length !== 14 || lookup.isPending}
                  onClick={() => lookup.mutate(draft.document)}>
                  <Search size={15} aria-hidden="true" /> {lookup.isPending ? 'Buscando' : 'Buscar'}
                </Button>
              </div>
            )}
          </Field>
          <Field label="E-mail de cobrança" error={errors.billingEmail} hint="Recebe o contrato e as faturas.">
            {(fid, by) => <input id={fid} name="pf-cliente-email-cobranca" autoComplete="off" aria-describedby={by} aria-invalid={invalid('billingEmail')} type="email" inputMode="email" value={draft.billingEmail} onChange={(e) => update('billingEmail', e.target.value)} className={inputClass} placeholder="financeiro@empresa.com" />}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Razão social (ou nome completo, se for CPF)">
              {(fid) => <input id={fid} name="pf-cliente-razao" autoComplete="off" value={draft.legalName} onChange={(e) => update('legalName', e.target.value)} className={inputClass} />}
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Endereço completo">
              {(fid) => <input id={fid} value={draft.address} onChange={(e) => update('address', e.target.value)} className={inputClass} name="pf-cliente-endereco" autoComplete="off" />}
            </Field>
          </div>
          {lookup.data && (
            <p role="status" className="rounded-xl bg-ok-soft px-3 py-2 text-[13px] text-ok-ink sm:col-span-2">
              Achamos na Receita: <b>{lookup.data.legalName}</b>{lookup.data.status && ` · situação ${lookup.data.status.toLowerCase()}`}{lookup.data.size && ` · porte ${lookup.data.size === 'media' ? 'médio' : lookup.data.size === 'pequena' ? 'pequeno' : lookup.data.size}`}{lookup.data.activity && ` · ${lookup.data.activity}`}. Confira e ajuste se precisar.
            </p>
          )}
        </div>
      </Section>

      <Section flat={inDialog} hidden={inDialog && tab !== 'contrato'} title={kind === 'avulso' ? 'Projeto' : 'Contrato'} text={!isAdmin ? 'Só o administrador muda o dia de cobrança e as datas do contrato.' : kind === 'avulso' ? 'Datas do projeto, se houver.' : 'O fim é calculado pelo início e pela duração. Você pode ajustar.'}>
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
          {kind === 'fixo' ? 'Paga em parcelas mensais. O contrato mostra o total e a parcela.' : kind === 'tcv' ? 'Valor total do contrato, cobrado de uma vez.' : 'Serviço pontual, sem mensalidade. Fica na base, mas não entra na carteira recorrente.'}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
          <Field label="Início" error={errors.startDate}>
            {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('startDate')} disabled={!isAdmin} type="date" value={draft.startDate} onChange={(e) => (kind === 'avulso' ? update('startDate', e.target.value) : setStartOrMonths(e.target.value, draft.months))} className={inputClass} />}
          </Field>
          {kind !== 'avulso' && (
            <Field label="Duração em meses" error={errors.months}>
              {(fid, by) => (
                <>
                  <input id={fid} name="pf-contrato-meses" autoComplete="off" aria-describedby={by} aria-invalid={invalid('months')} disabled={!isAdmin} inputMode="numeric" list={`${fid}-lista`} value={draft.months} onChange={(e) => setStartOrMonths(draft.startDate, e.target.value.replace(/\D/g, ''))} className={inputClass} />
                  <datalist id={`${fid}-lista`}>{['3', '6', '12', '24'].map((m) => <option key={m} value={m} />)}</datalist>
                </>
              )}
            </Field>
          )}
          <Field label="Fim" error={errors.endDate}>
            {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('endDate')} disabled={!isAdmin} type="date" value={draft.endDate} min={draft.startDate || undefined} onChange={(e) => update('endDate', e.target.value)} className={inputClass} />}
          </Field>
          {kind !== 'avulso' && (
            <Field label="Dia de cobrança" error={errors.billingDay}>
              {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('billingDay')} disabled={!isAdmin} inputMode="numeric" value={draft.billingDay} onChange={(e) => update('billingDay', e.target.value.replace(/\D/g, '').slice(0, 2))} className={inputClass} placeholder="10" />}
            </Field>
          )}
          {isAdmin && draft.setupFee !== undefined && (
            <Field label="Taxa de implantação (R$)" error={errors.setupFee} hint="Só administradores veem.">
              {(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={invalid('setupFee')} inputMode="decimal" value={draft.setupFee ?? ''} onChange={(e) => update('setupFee', e.target.value)} className={inputClass} placeholder="0,00" />}
            </Field>
          )}
        </div>
      </Section>

      <Section flat={inDialog} hidden={inDialog && tab !== 'negocio'} title="Sobre o negócio" text="Opcional: ajuda a equipe a planejar.">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:gap-x-4">
          {([
            ['description', 'O que a empresa faz'],
            ['targetAudience', 'Público-alvo'],
            ['valueProposition', 'Diferencial'],
            ['competitors', 'Concorrentes'],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              {(fid) => <textarea id={fid} rows={3} maxLength={2000} value={draft[key]} onChange={(e) => update(key, e.target.value)} className={cn(inputClass, 'resize-y')} />}
            </Field>
          ))}
        </div>
      </Section>

      {save.isError && <p role="alert" className="rounded-3xl bg-warn-soft p-4 font-medium text-warn-ink">{clientErrorMessage(save.error)}</p>}

      <div className={cn('sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/95 py-3 backdrop-blur', onCancel ? '-mx-5 -mb-4 px-5' : '-mx-4 px-4 md:-mx-7 md:px-7')}>
        {onCancel
          ? <button type="button" onClick={onCancel} className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-4 font-medium hover:border-ink">Cancelar</button>
          : <Link to={back} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 font-medium hover:border-ink">Cancelar</Link>}
        {wizard && stepIndex > 0 && <Button variant="secondary" onClick={() => setTab(ORDER[stepIndex - 1]!)}>Voltar</Button>}
        {wizard && stepIndex < ORDER.length - 1
          ? <Button type="button" onClick={next}>Continuar</Button>
          : <Button type="submit" disabled={save.isPending || uploading || !feeReady}>{save.isPending ? 'Salvando' : clientId ? 'Salvar alterações' : 'Cadastrar cliente'}</Button>}
      </div>
    </form>
  )
}
