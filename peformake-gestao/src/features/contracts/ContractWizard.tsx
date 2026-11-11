import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FileUp, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import type { ClientRecord } from '@/features/clients/clientRules'
import { lookupCnpj } from '@/features/clients/clientsApi'
import { formatDocument, isValidDocument } from '@/features/clients/clientFormRules'
import { clientValue, clientKind, KIND_LABEL } from '@/features/clients/portfolioRules'
import { brlValue, dateBr } from '@/features/clients/format'
import { inputClass } from '@/features/clients/ui'
import { readDocument } from './docReader'
import { ContractPreview } from './ContractPreview'
import { fetchCompanyProfiles } from '@/features/settings/CompanySettings'
import { companyLink, companyMissing, UNIT_LABEL, type Unit } from '@/features/settings/companyRules'

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc

const STEPS = ['Contratante', 'Contratada', 'Condições', 'Revisar', 'Enviar'] as const
const field = cn(inputClass, 'mt-1 font-normal')

function Stepper({ step }: { step: number }) {
  return (
    <ol aria-label="Etapas" className="grid grid-cols-5 gap-1.5">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-col gap-1">
          <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-accent' : 'bg-raised')} />
          <span className={cn('flex items-center gap-1 text-[12px]', i === step ? 'font-semibold' : 'text-muted')}>{i < step && <Check size={11} aria-hidden="true" />}{label}</span>
        </li>
      ))}
    </ol>
  )
}

/** Gerar contrato por etapas: só avança com os dados certos. Nada sai sem revisar. */
export function ContractWizard({ client, open, onClose, onSent }: { client: ClientRecord; open: boolean; onClose: () => void; onSent: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const kind = clientKind(client.clientType, client.contract?.model ?? null)
  const value = clientValue(client.services, kind)

  // Etapa 1: contratante
  const [party, setParty] = useState({ document: formatDocument(client.document ?? ''), legalName: client.legalName ?? '', address: client.address ?? '', email: client.billingEmail ?? client.email ?? '' })
  const [reading, setReading] = useState<string | null>(null)
  const lookup = useMutation({
    mutationFn: lookupCnpj,
    onSuccess: (f) => setParty((p) => ({ ...p, legalName: f.legalName || p.legalName, address: f.address || p.address, email: p.email || f.email || '' })),
  })
  const readFile = async (file: File | undefined) => {
    if (!file) return
    setReading('Lendo o documento')
    try {
      const found = await readDocument(file)
      const doc = found.cnpj ?? found.cpf
      if (!doc) { setReading('Não achei CNPJ nem CPF no arquivo. Digite o número.'); return }
      setParty((p) => ({ ...p, document: formatDocument(doc) }))
      setReading(found.cnpj ? 'CNPJ encontrado. Buscando os dados na Receita.' : 'CPF encontrado. Preencha nome e endereço.')
      if (found.cnpj) lookup.mutate(found.cnpj)
      // Guarda o documento na pasta do cliente.
      void supabase.storage.from('client-files').upload(`documentos/${client.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`, file, { upsert: false })
    } catch {
      setReading('Não consegui ler o arquivo. Tente um PDF ou uma foto nítida.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const partyOk = isValidDocument(party.document) && party.legalName.trim().length >= 3 && party.address.trim().length >= 8 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(party.email.trim())
  const saveParty = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('client_save_legal', { _client_id: client.id, _data: { document: party.document, legal_name: party.legalName, address: party.address, billing_email: party.email } })
      if (error) throw new Error(error.message.includes('CPF') ? 'CPF ou CNPJ inválido.' : 'Não foi possível salvar.')
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['clients'] }); setStep(1) },
  })

  // Etapa 2: modelo e contratada
  const templates = useQuery({
    queryKey: ['contract-templates-full'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_templates').select('id, name, area').eq('is_active', true).order('name')
      if (error) throw error
      return data ?? []
    },
  })
  const profiles = useQuery({ queryKey: ['company-profiles'], enabled: open, queryFn: fetchCompanyProfiles })
  const [template, setTemplate] = useState('')
  const chosen = (templates.data ?? []).find((t) => t.id === template)
  const unit: Unit = chosen?.area === 'audiovisual' ? 'ellcazo' : 'peformake'
  const profile = profiles.data?.find((p) => p.unit === unit)
  const missingCompany = companyMissing(profile)
  const profileOk = !!profile && missingCompany.length === 0

  // Etapa 3: condições
  const c = client.contract
  const needsDates = kind !== 'avulso' && (!c?.startDate || !c?.months)

  // Etapa 4: revisar
  const [docId, setDocId] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [docTitle, setDocTitle] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await rpc('contract_create', { _client: client.id, _template: template })
      if (error) throw new Error(error.message.includes('contratante') ? 'Faltam dados do contratante.' : error.message.includes('contratada') ? `Complete os dados da ${UNIT_LABEL[unit]} em Configurações.` : 'Não foi possível gerar.')
      const id = String(data)
      const { data: doc } = await supabase.from('client_contract_docs').select('title, body').eq('id', id).single()
      const row = doc as { title: string | null; body: string } | null
      return { id, body: row?.body ?? '', title: row?.title ?? null }
    },
    onSuccess: (d) => { setDocId(d.id); setBody(d.body); setDocTitle(d.title); setStep(3) },
  })
  const saveBody = useMutation({
    mutationFn: async () => {
      const { error } = await rpc('contract_update_body', { _id: docId, _body: body })
      if (error) throw new Error('Não foi possível salvar o texto.')
    },
    onSuccess: () => setStep(4),
  })

  // Etapa 5: enviar
  const [method, setMethod] = useState<'assinafy' | 'aceite'>(kind === 'avulso' ? 'aceite' : 'assinafy')
  const send = useMutation({
    mutationFn: async () => {
      const { error: e1 } = await rpc('contract_set_method', { _id: docId, _method: method })
      if (e1) throw new Error(e1.message)
      if (method === 'aceite') {
        const { error } = await rpc('contract_release', { _id: docId })
        if (error) throw new Error(error.message)
        return
      }
      const { data: s } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contract-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` },
        body: JSON.stringify({ contract_id: docId }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error ?? 'Não foi possível enviar.')
    },
    onSuccess: () => { onSent(); close() },
  })

  const close = () => { setStep(0); setDocId(null); setTemplate(''); onClose() }
  const errors = [lookup, saveParty, create, saveBody, send].filter((m) => m.isError).map((m) => (m.error as Error).message)

  return (
    <Dialog open={open} onClose={close} title="Gerar contrato" size="lg">
      <div className="flex flex-col gap-4">
        <Stepper step={step} />

        {step === 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-raised px-3 py-2 text-[13px]">
              <span>Tem o cartão CNPJ ou o CCMEI? Envie o PDF ou uma foto: o sistema lê e preenche.</span>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" className="sr-only" id="doc-contratante" onChange={(e) => void readFile(e.target.files?.[0])} />
              <label htmlFor="doc-contratante" className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 font-medium hover:border-ink"><FileUp size={14} aria-hidden="true" /> Enviar documento</label>
            </div>
            {reading && <p role="status" className="text-[13px] text-muted">{reading}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-[13px] font-semibold">CPF ou CNPJ
                <span className="mt-1 flex gap-2">
                  <input inputMode="numeric" value={party.document} onChange={(e) => setParty({ ...party, document: e.target.value })} onBlur={(e) => setParty({ ...party, document: formatDocument(e.target.value) })} className={cn(inputClass, 'font-normal')} />
                  <Button type="button" variant="secondary" className="shrink-0" disabled={party.document.replace(/\D/g, '').length !== 14 || lookup.isPending} onClick={() => lookup.mutate(party.document)}><Search size={14} aria-hidden="true" /> {lookup.isPending ? 'Buscando' : 'Buscar'}</Button>
                </span>
              </label>
              <label className="flex flex-col text-[13px] font-semibold">E-mail de quem assina
                <input type="email" value={party.email} onChange={(e) => setParty({ ...party, email: e.target.value })} className={field} />
              </label>
              <label className="flex flex-col text-[13px] font-semibold sm:col-span-2">Razão social (ou nome completo)
                <input value={party.legalName} onChange={(e) => setParty({ ...party, legalName: e.target.value })} className={field} />
              </label>
              <label className="flex flex-col text-[13px] font-semibold sm:col-span-2">Endereço completo
                <input value={party.address} onChange={(e) => setParty({ ...party, address: e.target.value })} className={field} />
              </label>
            </div>
            <div className="flex justify-end"><Button disabled={!partyOk || saveParty.isPending} onClick={() => saveParty.mutate()}>{saveParty.isPending ? 'Salvando' : 'Continuar'}</Button></div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col text-[13px] font-semibold">Modelo do contrato
              <select value={template} onChange={(e) => setTemplate(e.target.value)} className={field}>
                <option value="">Escolha</option>
                {(templates.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            {chosen && profiles.data && (
              <div className={cn('flex flex-wrap items-start justify-between gap-2 rounded-2xl px-3 py-2 text-[13px]', profileOk ? 'bg-ok-soft/60' : 'bg-warn-soft/60')}>
                <span>
                  <b>Contratada: {UNIT_LABEL[unit]}</b><br />
                  {profileOk ? `${profile!.legal_name} · ${formatDocument(profile!.document ?? '')} · ${profile!.representative_name}` : `Complete os dados da ${UNIT_LABEL[unit]} (falta: ${missingCompany.join(', ')}). Vale para todos os contratos.`}
                </span>
                {!profileOk && <Link to={companyLink(unit)} onClick={close} className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3 text-[13px] font-semibold text-ink no-underline hover:border-ink">Completar agora</Link>}
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(0)}>Voltar</Button>
              <Button disabled={!template || !profileOk} onClick={() => setStep(2)}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['Tipo', KIND_LABEL[kind]],
                ['Início', dateBr(c?.startDate ?? null)],
                ['Duração', c?.months ? `${c.months} meses` : 'Não definida'],
                ['Fim', dateBr(c?.endDate ?? null)],
                ['Vencimento', c?.billingDay ? `Todo dia ${c.billingDay}` : 'Não definido'],
                [kind === 'fixo' ? 'Parcela mensal' : kind === 'tcv' ? 'Valor total (de uma vez)' : 'Valor do serviço', brlValue(value.value)],
                ...(kind === 'fixo' && c?.months ? [['Total do contrato', `${brlValue(value.value * c.months)} em ${c.months}x`]] : []),
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-raised px-3 py-2">
                  <dt className="text-[12px] text-muted">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            {needsDates && <p className="rounded-2xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">Faltam início e duração do contrato. Ajuste em Editar → Contrato e volte aqui.</p>}
            {value.missingPrices > 0 && <p className="rounded-2xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink">{value.missingPrices} serviço sem preço. O valor do contrato vai sair incompleto.</p>}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
              <Button disabled={needsDates || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Gerando' : 'Gerar o texto'}</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-muted">Leia e ajuste o que precisar. Os dados das duas partes, os serviços e os valores já estão no texto.</p>
            <textarea aria-label="Texto do contrato" value={body} onChange={(e) => setBody(e.target.value)} className="h-[45dvh] w-full resize-none rounded-2xl border border-line-strong bg-surface p-4 text-[13px] leading-relaxed" />
            <div className="flex justify-end gap-2"><ContractPreview title={docTitle} body={body} /><Button disabled={body.trim().length < 50 || saveBody.isPending} onClick={() => saveBody.mutate()}>{saveBody.isPending ? 'Salvando' : 'Texto pronto'}</Button></div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <div role="group" aria-label="Como o cliente assina" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([
                ['assinafy', 'Assinafy', `Assinatura eletrônica certificada por e-mail (${party.email}). Usa 1 dos 10 do mês.`],
                ['aceite', 'Aceite no portal', 'O cliente lê e aceita no portal com nome e CPF/CNPJ. Grátis, com registro de data, IP e navegador.'],
              ] as const).map(([id, label, text]) => (
                <button key={id} type="button" aria-pressed={method === id} onClick={() => setMethod(id)}
                  className={cn('flex cursor-pointer flex-col gap-1 rounded-2xl border p-3 text-left', method === id ? 'border-ink bg-raised' : 'border-line hover:border-line-strong')}>
                  <span className="font-semibold">{label}</span>
                  <span className="text-[12px] text-muted">{text}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(3)}>Voltar</Button>
              <span className="flex flex-wrap gap-2">
              <ContractPreview title={docTitle} body={body} note={method === 'aceite' ? 'Assim o cliente vai ler no portal. Nada foi enviado.' : `Assim vai para a Assinafy (${party.email}). Nada foi enviado.`} />
              <Button disabled={send.isPending} onClick={() => send.mutate()}>{send.isPending ? 'Enviando' : method === 'aceite' ? 'Liberar no portal' : 'Enviar para assinar'}</Button>
              </span>
            </div>
          </div>
        )}

        {errors.length > 0 && <p role="alert" className="text-[13px] font-medium text-warn-ink">{errors[errors.length - 1]}</p>}
      </div>
    </Dialog>
  )
}
