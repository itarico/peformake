import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FileSignature, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { formatDocument, isValidDocument } from '@/features/clients/clientFormRules'
import { ContractPreview } from '@/features/contracts/ContractPreview'
import { companyLink, UNIT_LABEL, type Unit } from '@/features/settings/companyRules'
import { CONTRACT_STATUS, needsLawyer, type StaffContractStatus } from './memberContractRules'
import type { Contract } from './teamRules'

// Equipe → Membro → Pagamento → Contrato: enviar o contrato para assinar pela Assinafy.
// Nada sai sozinho: prévia, confirmação com nome e e-mail, e só então o envio.
type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc: Rpc = (fn, a) => supabase.rpc(fn as never, a as never) as never
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const CONTRACT_LABEL: Record<Contract, string> = { clt: 'CLT', pj: 'PJ', freela: 'Freela', socio: 'Sócio' }
const FREE_PER_MONTH = 10

interface Info {
  email: string | null; document: string | null; address: string | null; contract: Contract | null; unit: Unit
  missing: string[]; usage: number; enabled: boolean
  last: { id: string; status: StaffContractStatus; title: string; mode: 'modelo' | 'pdf'; sent_at: string | null; signed_at: string | null; signed_path: string | null; provider_error: string | null; signer_email: string | null } | null
}

async function openStaffFile(path: string) {
  const w = window.open('', '_blank')
  const { data } = await supabase.storage.from('staff-docs').createSignedUrl(path, 300)
  if (w && data?.signedUrl) w.location.href = data.signedUrl
  else if (w) w.close()
}

const dayBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

/** Situação do contrato do membro e o botão de enviar. */
export function MemberContractPanel({ staffId, name }: { staffId: string; name: string }) {
  const q = useQuery({ queryKey: ['staff-contract', staffId], queryFn: async () => { const { data, error } = await rpc('staff_contract_info', { _staff: staffId }); if (error) throw new Error(error.message); return data as Info } })
  const [open, setOpen] = useState(false)
  if (!q.data) return <p className="text-[13px] text-muted">{q.isError ? 'Não foi possível carregar.' : 'Carregando'}</p>
  const i = q.data
  const last = i.last
  const st = last ? CONTRACT_STATUS[last.status] : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line px-3 py-2.5">
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 text-[14px] font-semibold"><FileSignature size={16} aria-hidden="true" /> Contrato {i.contract ? CONTRACT_LABEL[i.contract] : ''}
            {st ? <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-semibold', st.tone)}>{st.label}</span> : <span className="rounded-full bg-raised px-2 py-0.5 text-[11.5px] font-semibold text-muted">Sem contrato</span>}
          </span>
          {last && <span className="truncate text-[12px] text-muted">{last.signed_at ? `Assinado em ${dayBr(last.signed_at)}` : last.sent_at ? `Enviado em ${dayBr(last.sent_at)} para ${last.signer_email}` : last.title}</span>}
          {last?.status === 'erro' && last.provider_error && <span className="text-[12px] text-warn-ink">{last.provider_error}</span>}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {last?.signed_path && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => void openStaffFile(last.signed_path!)}>PDF assinado</Button>}
          {(!last || ['rascunho', 'erro', 'recusado', 'assinado'].includes(last.status)) && (
            <Button className="min-h-9 px-3 text-[13px]" onClick={() => setOpen(true)}>{last?.status === 'assinado' ? 'Novo contrato' : 'Enviar contrato para assinar'}</Button>
          )}
        </span>
      </div>
      <p className="text-[12px] text-muted">Assinafy: {i.usage} de {FREE_PER_MONTH} documentos grátis usados neste mês (contagem do sistema, clientes e membros).</p>
      {open && <SendDialog staffId={staffId} name={name} info={i} onClose={() => setOpen(false)} />}
    </div>
  )
}

function SendDialog({ staffId, name, info, onClose }: { staffId: string; name: string; info: Info; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'modelo' | 'pdf'>(info.contract ? 'modelo' : 'pdf')
  const [file, setFile] = useState<File | null>(null)
  const [email, setEmail] = useState(info.email ?? '')
  const [doc, setDoc] = useState(formatDocument(info.document ?? ''))
  const [address, setAddress] = useState(info.address ?? '')
  const [draft, setDraft] = useState<{ id: string; title: string; body: string | null } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const companyBlocked = mode === 'modelo' && info.missing.length > 0
  const okData = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && isValidDocument(doc)

  const prepare = useMutation({
    mutationFn: async () => {
      let filePath: string | null = null
      if (mode === 'pdf') {
        if (!file) throw new Error('Escolha o PDF.')
        filePath = `envios/${staffId}/${Date.now()}.pdf`
        const { error } = await supabase.storage.from('staff-docs').upload(filePath, file, { contentType: 'application/pdf' })
        if (error) throw new Error('Não consegui guardar o PDF.')
      }
      const { data, error } = await rpc('staff_contract_create', { _staff: staffId, _data: { mode, email, document: doc, address, file_path: filePath } })
      if (error) throw new Error(error.message.replace(/ \(.*\)$/, ''))
      const id = String(data)
      const { data: row } = await (supabase.from('staff_contract_docs' as never) as unknown as { select: (c: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: unknown }> } } }).select('id, title, body').eq('id', id).single()
      return row as { id: string; title: string; body: string | null }
    },
    onSuccess: (d) => { setDraft(d); setStep(2); void queryClient.invalidateQueries({ queryKey: ['staff-contract', staffId] }) },
    onError: (e) => setProblem((e as Error).message),
  })
  const send = useMutation({
    mutationFn: async () => {
      const { data: s } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contract-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${s.session?.access_token ?? ''}` },
        body: JSON.stringify({ staff_contract_id: draft!.id }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error ?? 'Não foi possível enviar.')
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['staff-contract', staffId] }); onClose() },
    onError: (e) => setProblem((e as Error).message),
  })
  const confirmSend = () => {
    setProblem(null)
    void ask(`Enviar para assinatura de ${name} (${email.trim().toLowerCase()})? A Assinafy manda o link por e-mail e usa 1 dos ${FREE_PER_MONTH} do mês.`).then((ok) => { if (ok) send.mutate() })
  }
  const previewPdf = () => { if (file) window.open(URL.createObjectURL(file), '_blank') }

  return (
    <Dialog open onClose={onClose} title={`Contrato de ${name}`} size="md"
      description={step === 2 ? 'Confira a prévia. Nada foi enviado ainda.' : undefined}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {step > 0 && step < 2 ? <Button variant="secondary" onClick={() => setStep(step - 1)}>Voltar</Button> : <span />}
          {step === 0 && <Button disabled={(mode === 'pdf' && !file) || companyBlocked} onClick={() => setStep(1)}>Continuar</Button>}
          {step === 1 && <Button disabled={!okData || prepare.isPending} onClick={() => { setProblem(null); prepare.mutate() }}>{prepare.isPending ? 'Preparando' : 'Ver como fica'}</Button>}
          {step === 2 && (
            <span className="flex flex-wrap justify-end gap-2">
              {draft?.body ? <ContractPreview title={draft.title} body={draft.body} note={`Assim vai para a Assinafy (${email.trim().toLowerCase()}). Nada foi enviado.`} /> : <Button variant="secondary" onClick={previewPdf}>Ver prévia</Button>}
              <Button disabled={send.isPending || !info.enabled} onClick={confirmSend}>{send.isPending ? 'Enviando' : 'Enviar para assinar'}</Button>
            </span>
          )}
        </div>
      }>
      <div className="flex flex-col gap-3">
        <ol aria-label="Etapas" className="grid grid-cols-3 gap-1.5">
          {['Contrato', 'Quem assina', 'Prévia'].map((label, i) => (
            <li key={label} className="flex flex-col gap-1">
              <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-accent' : 'bg-raised')} />
              <span className={cn('flex items-center gap-1 text-[12px]', i === step ? 'font-semibold' : 'text-muted')}>{i < step && <Check size={11} aria-hidden="true" />}{label}</span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <>
            <div role="group" aria-label="De onde vem o contrato" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" aria-pressed={mode === 'modelo'} disabled={!info.contract} onClick={() => setMode('modelo')}
                className={cn('flex cursor-pointer flex-col gap-1 rounded-2xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50', mode === 'modelo' ? 'border-ink bg-raised' : 'border-line hover:border-line-strong')}>
                <span className="font-semibold">Gerar pelo modelo{info.contract ? ` ${CONTRACT_LABEL[info.contract]}` : ''}</span>
                <span className="text-[12px] text-muted">{info.contract ? 'Com os valores do Pagamento e os dados da empresa.' : 'Defina o tipo de contrato em Pagamento antes.'}</span>
              </button>
              <button type="button" aria-pressed={mode === 'pdf'} onClick={() => setMode('pdf')}
                className={cn('flex cursor-pointer flex-col gap-1 rounded-2xl border p-3 text-left', mode === 'pdf' ? 'border-ink bg-raised' : 'border-line hover:border-line-strong')}>
                <span className="font-semibold">Subir um PDF pronto</span>
                <span className="text-[12px] text-muted">Feito pelo contador ou advogado.</span>
              </button>
            </div>
            {mode === 'pdf' && (
              <div className="flex flex-wrap items-center gap-2">
                <input type="file" accept="application/pdf" id="staff-contract-pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0] ?? null; setProblem(f && f.type !== 'application/pdf' ? 'Envie um PDF.' : null); setFile(f && f.type === 'application/pdf' ? f : null) }} />
                <label htmlFor="staff-contract-pdf" className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] font-medium hover:border-ink"><FileUp size={14} aria-hidden="true" /> {file ? 'Trocar PDF' : 'Escolher PDF'}</label>
                {file && <span className="truncate text-[13px] text-muted">{file.name}</span>}
              </div>
            )}
            {mode === 'modelo' && info.contract && needsLawyer(info.contract) && (
              <p className="rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink">Modelo simples de {CONTRACT_LABEL[info.contract]}: revise com contador ou advogado antes de enviar.</p>
            )}
            {companyBlocked && (
              <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] text-warn-ink">
                <span>Complete os dados da {UNIT_LABEL[info.unit]} (falta: {info.missing.join(', ')}).</span>
                <Link to={companyLink(info.unit)} className="font-semibold text-warn-ink underline">Completar agora</Link>
              </p>
            )}
            {!info.enabled && <p className="text-[12.5px] text-warn-ink">A assinatura eletrônica está desligada em Configurações → Integrações.</p>}
          </>
        )}

        {step === 1 && (
          <>
            <label className="flex flex-col text-[13px] font-semibold">E-mail de {name.split(' ')[0] || 'quem assina'}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
            <label className="flex flex-col text-[13px] font-semibold">CPF (ou CNPJ, se for PJ)<input inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} onBlur={(e) => setDoc(formatDocument(e.target.value))} className={field} /></label>
            <label className="flex flex-col text-[13px] font-semibold">Endereço <span className="font-normal text-muted">(opcional)</span><input value={address} onChange={(e) => setAddress(e.target.value)} className={field} /></label>
            <p className="text-[12px] text-muted">Fica guardado só para administradores.</p>
          </>
        )}

        {step === 2 && draft && (
          <dl className="grid grid-cols-1 gap-2 text-[13.5px]">
            {[['Documento', draft.title], ['Quem assina', `${name} · ${email.trim().toLowerCase()}`], ['Pela empresa', 'Quem assina pela Peformake (Integrações)'], ['Cota do mês', `${info.usage} de ${FREE_PER_MONTH} usados`]].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-xl bg-raised px-3 py-2"><dt className="text-[12px] text-muted">{k}</dt><dd className="truncate font-medium">{v}</dd></div>
            ))}
          </dl>
        )}
        {problem && <p role="alert" className="text-[13px] font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}
