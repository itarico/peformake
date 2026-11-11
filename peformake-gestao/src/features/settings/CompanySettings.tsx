import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, FileText, Search, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { lookupCnpj } from '@/features/clients/clientsApi'
import { formatDocument } from '@/features/clients/clientFormRules'
import { maskPhone } from '@/features/team/teamRules'
import { LoadState } from '@/features/traffic/LoadState'
import { companyMissing, type CompanyProfile, type Unit, UNIT_LABEL } from './companyRules'

// Configurações → Dados das empresas (só administrador). Os contratos de clientes e de membros puxam daqui.
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc: Rpc = (fn, a) => supabase.rpc(fn as never, a as never) as never
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const STEPS = ['Empresa', 'Representante', 'Documentos'] as const
const DOCS = [['cnpj_card_path', 'Cartão CNPJ ou CCMEI'], ['social_contract_path', 'Contrato social']] as const

export async function fetchCompanyProfiles(): Promise<CompanyProfile[]> {
  const { data, error } = await (supabase.from('company_profiles' as never) as unknown as { select: (c: string) => Promise<{ data: unknown; error: { message: string } | null }> })
    .select('unit, legal_name, trade_name, document, address, representative_name, representative_document, email, phone, cnpj_card_path, social_contract_path')
  if (error) throw new Error(error.message)
  return (data ?? []) as CompanyProfile[]
}

/** Abre um documento do bucket privado num link temporário. */
async function openDoc(path: string) {
  const w = window.open('', '_blank')
  const { data } = await supabase.storage.from('company-docs').createSignedUrl(path, 300)
  if (w && data?.signedUrl) w.location.href = data.signedUrl
  else if (w) w.close()
}

export function CompanySettings() {
  const [params, setParams] = useSearchParams()
  const unit: Unit = params.get('empresa') === 'ellcazo' ? 'ellcazo' : 'peformake'
  const editing = params.get('editar') === '1'
  const q = useQuery({ queryKey: ['company-profiles'], queryFn: fetchCompanyProfiles })
  const set = (patch: Record<string, string | null>) => setParams((c) => {
    const n = new URLSearchParams(c)
    for (const [k, v] of Object.entries(patch)) { if (v === null) n.delete(k); else n.set(k, v) }
    return n
  }, { replace: true })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  const p = q.data.find((x) => x.unit === unit) ?? ({ unit } as CompanyProfile)
  const missing = companyMissing(p)

  return (
    <section aria-labelledby="empresas" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="empresas" className="flex items-center gap-2 text-[17px] font-semibold"><Building2 size={18} aria-hidden="true" /> Dados das empresas</h3>
        <div role="tablist" aria-label="Empresa" className="inline-flex rounded-full bg-raised p-0.5 text-[13px]">
          {(['peformake', 'ellcazo'] as const).map((u) => (
            <button key={u} type="button" role="tab" aria-selected={unit === u} onClick={() => set({ empresa: u, editar: null })}
              className={cn('min-h-9 cursor-pointer rounded-full px-4 font-semibold', unit === u ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>{UNIT_LABEL[u]}</button>
          ))}
        </div>
      </div>
      <p className={cn('rounded-xl px-3 py-2 text-[13px]', missing.length ? 'bg-warn-soft text-warn-ink' : 'bg-ok-soft text-ok-ink')}>
        {missing.length ? `Falta: ${missing.join(', ')}. Sem isso os contratos da ${UNIT_LABEL[unit]} não saem.` : 'Completo: os contratos já puxam estes dados.'}
      </p>
      <dl className="grid grid-cols-1 gap-2 text-[13.5px] sm:grid-cols-2">
        {[
          ['Razão social', p.legal_name], ['Nome fantasia', p.trade_name], ['CNPJ', p.document ? formatDocument(p.document) : null], ['Endereço', p.address],
          ['Representante', p.representative_name ? `${p.representative_name}${p.representative_document ? ` · CPF ${formatDocument(p.representative_document)}` : ''}` : null],
          ['Documentos', [p.cnpj_card_path && 'Cartão CNPJ', p.social_contract_path && 'Contrato social'].filter(Boolean).join(' · ') || null],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-xl bg-raised px-3 py-2">
            <dt className="text-[12px] text-muted">{k}</dt>
            <dd className={cn('truncate font-medium', !v && 'text-muted')}>{v || 'Não preenchido'}</dd>
          </div>
        ))}
      </dl>
      <div><Button onClick={() => set({ editar: '1' })}>{missing.length ? 'Completar dados' : 'Editar dados'}</Button></div>
      {editing && <CompanyDialog key={unit} profile={p} onClose={() => set({ editar: null })} />}
    </section>
  )
}

function CompanyDialog({ profile, onClose }: { profile: CompanyProfile; onClose: () => void }) {
  const queryClient = useQueryClient()
  const unit = profile.unit
  const [step, setStep] = useState(0)
  const [v, setV] = useState({
    document: formatDocument(profile.document ?? ''), legal_name: profile.legal_name ?? '', trade_name: profile.trade_name ?? '', address: profile.address ?? '',
    representative_name: profile.representative_name ?? '', representative_document: formatDocument(profile.representative_document ?? ''),
    email: profile.email ?? '', phone: maskPhone(profile.phone),
  })
  const [paths, setPaths] = useState({ cnpj_card_path: profile.cnpj_card_path ?? null, social_contract_path: profile.social_contract_path ?? null })
  const [problem, setProblem] = useState<string | null>(null)
  const files = useRef<Record<string, HTMLInputElement | null>>({})
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['company-profiles'] })

  const lookup = useMutation({
    mutationFn: lookupCnpj,
    onSuccess: (f) => setV((c) => ({ ...c, legal_name: f.legalName || c.legal_name, trade_name: c.trade_name || f.tradeName || '', address: f.address || c.address })),
    onError: (e) => setProblem((e as Error).message),
  })
  const save = useMutation({
    mutationFn: async (data: Record<string, string | null>) => {
      const { error } = await rpc('company_profile_save', { _unit: unit, _data: data })
      if (error) throw new Error(/CNPJ/.test(error.message) ? 'CNPJ inválido.' : /CPF/.test(error.message) ? 'CPF do representante inválido.' : /mail/i.test(error.message) ? 'E-mail inválido.' : 'Não foi possível salvar.')
    },
    onSuccess: refresh,
  })
  const upload = useMutation({
    mutationFn: async ({ key, file }: { key: 'cnpj_card_path' | 'social_contract_path'; file: File }) => {
      if (file.type !== 'application/pdf') throw new Error('Envie o arquivo em PDF.')
      if (file.size > 10 * 1024 * 1024) throw new Error('PDF grande demais (até 10 MB).')
      const path = `${unit}/${key === 'cnpj_card_path' ? 'cartao-cnpj' : 'contrato-social'}-${Date.now()}.pdf`
      const { error } = await supabase.storage.from('company-docs').upload(path, file, { contentType: 'application/pdf' })
      if (error) throw new Error('Não consegui guardar o PDF.')
      const { error: e2 } = await rpc('company_profile_save', { _unit: unit, _data: { [key]: path } })
      if (e2) throw new Error('Não foi possível salvar.')
      return { key, path }
    },
    onSuccess: ({ key, path }) => { setPaths((c) => ({ ...c, [key]: path })); refresh() },
    onError: (e) => setProblem((e as Error).message),
  })

  const digits = (s: string) => s.replace(/\D/g, '')
  const okCompany = digits(v.document).length === 14 && v.legal_name.trim().length >= 3 && v.address.trim().length >= 8
  const okRep = v.representative_name.trim().length >= 3 && digits(v.representative_document).length === 11
  const next = () => {
    setProblem(null)
    const data: Record<string, string> = step === 0
      ? { document: v.document, legal_name: v.legal_name, trade_name: v.trade_name, address: v.address }
      : { representative_name: v.representative_name, representative_document: v.representative_document, email: v.email, phone: v.phone }
    save.mutate(data, { onSuccess: () => setStep(step + 1), onError: (e) => setProblem((e as Error).message) })
  }

  return (
    <Dialog open onClose={onClose} title={`Dados da ${UNIT_LABEL[unit]}`} size="md"
      description="Vale para todos os contratos de clientes e de membros."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {step > 0 ? <Button variant="secondary" onClick={() => setStep(step - 1)}>Voltar</Button> : <span />}
          {step < 2
            ? <Button disabled={(step === 0 ? !okCompany : !okRep) || save.isPending} onClick={next}>{save.isPending ? 'Salvando' : 'Salvar e continuar'}</Button>
            : <Button onClick={onClose}>Concluir</Button>}
        </div>
      }>
      <div className="flex flex-col gap-3">
        <ol aria-label="Etapas" className="grid grid-cols-3 gap-1.5">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-col gap-1">
              <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-accent' : 'bg-raised')} />
              <span className={cn('flex items-center gap-1 text-[12px]', i === step ? 'font-semibold' : 'text-muted')}>{i < step && <Check size={11} aria-hidden="true" />}{label}</span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <>
            <label className="flex flex-col text-[13px] font-semibold">CNPJ
              <span className="mt-1 flex gap-2">
                <input inputMode="numeric" value={v.document} onChange={(e) => setV({ ...v, document: e.target.value })} onBlur={(e) => setV({ ...v, document: formatDocument(e.target.value) })} className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal" />
                <Button variant="secondary" className="shrink-0" disabled={digits(v.document).length !== 14 || lookup.isPending} onClick={() => lookup.mutate(v.document)}><Search size={14} aria-hidden="true" /> {lookup.isPending ? 'Buscando' : 'Buscar pelo CNPJ'}</Button>
              </span>
            </label>
            <label className="flex flex-col text-[13px] font-semibold">Razão social (como no registro)<input value={v.legal_name} onChange={(e) => setV({ ...v, legal_name: e.target.value })} className={field} /></label>
            <label className="flex flex-col text-[13px] font-semibold">Nome fantasia<input value={v.trade_name} onChange={(e) => setV({ ...v, trade_name: e.target.value })} className={field} /></label>
            <label className="flex flex-col text-[13px] font-semibold">Endereço completo<input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} className={field} /></label>
          </>
        )}

        {step === 1 && (
          <>
            <label className="flex flex-col text-[13px] font-semibold">Nome de quem assina<input value={v.representative_name} onChange={(e) => setV({ ...v, representative_name: e.target.value })} className={field} /></label>
            <label className="flex flex-col text-[13px] font-semibold">CPF<input inputMode="numeric" value={v.representative_document} onChange={(e) => setV({ ...v, representative_document: e.target.value })} onBlur={(e) => setV({ ...v, representative_document: formatDocument(e.target.value) })} className={field} /></label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-[13px] font-semibold">E-mail<input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className={field} /></label>
              <label className="flex flex-col text-[13px] font-semibold">Telefone<input inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: maskPhone(e.target.value) })} placeholder="(81) 99999-0000" className={field} /></label>
            </div>
          </>
        )}

        {step === 2 && (
          <ul className="flex flex-col gap-2">
            {DOCS.map(([key, label]) => (
              <li key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-[14px] font-medium"><FileText size={16} aria-hidden="true" className="shrink-0 text-muted" />{label}
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', paths[key] ? 'bg-ok-soft text-ok-ink' : 'bg-raised text-muted')}>{paths[key] ? 'Guardado' : 'Falta'}</span>
                </span>
                <span className="flex gap-1.5">
                  {paths[key] && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => void openDoc(paths[key]!)}>Ver</Button>}
                  <input ref={(el) => { files.current[key] = el }} type="file" accept="application/pdf" className="sr-only" id={`doc-${key}`}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate({ key, file: f }); e.target.value = '' }} />
                  <label htmlFor={`doc-${key}`} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:border-ink">
                    <Upload size={14} aria-hidden="true" /> {upload.isPending && upload.variables?.key === key ? 'Enviando' : paths[key] ? 'Trocar' : 'Enviar PDF'}
                  </label>
                </span>
              </li>
            ))}
            <li className="text-[12px] text-muted">Os PDFs ficam guardados só para administradores.</li>
          </ul>
        )}
        {problem && <p role="alert" className="text-[13px] font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}
