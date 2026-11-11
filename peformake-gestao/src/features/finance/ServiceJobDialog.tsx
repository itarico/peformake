import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { ask } from '@/components/ui/confirm'
import { parseMoney } from './statement'
import { brl, todayBR } from './money'

// Serviço avulso com quem executa: um lançamento cria a fatura do cliente e a conta a pagar da pessoa.
const SKILLS = [
  { key: 'apresentadora', label: 'Apresentação', title: 'Apresentadora', unit: 'ellcazo' },
  { key: 'fotografo', label: 'Fotografia', title: 'Fotografia', unit: 'ellcazo' },
  { key: 'videomaker', label: 'Gravação', title: 'Gravação de vídeo', unit: 'ellcazo' },
  { key: 'editor', label: 'Edição', title: 'Edição de vídeo', unit: 'ellcazo' },
  { key: 'modelo', label: 'Modelo', title: 'Modelo', unit: 'ellcazo' },
  { key: 'outro', label: 'Outro', title: '', unit: 'peformake' },
] as const
type Skill = (typeof SKILLS)[number]

interface Person { id: string; name: string; photo: string | null; skills: string[] }
interface ClientOption { id: string; name: string }
type Rpc = (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase.from('staff_members').select('id, full_name, avatar_path, skills').eq('is_active', true).order('full_name')
  if (error) throw error
  return ((data ?? []) as unknown as { id: string; full_name: string; avatar_path: string | null; skills: string[] | null }[]).map((r) => ({
    id: r.id, name: r.full_name.trim(), skills: r.skills ?? [],
    photo: r.avatar_path ? supabase.storage.from('team-photos').getPublicUrl(r.avatar_path).data.publicUrl : null,
  }))
}

export function ServiceJobDialog({ clientId, clients, onClose, onSaved }: { clientId?: string; clients?: ClientOption[]; onClose: () => void; onSaved?: () => void }) {
  const queryClient = useQueryClient()
  const people = useQuery({ queryKey: ['job-people'], queryFn: listPeople })
  const [client, setClient] = useState(clientId ?? '')
  const [skill, setSkill] = useState<Skill>(SKILLS[0])
  const [title, setTitle] = useState<string>(SKILLS[0].title)
  const [unit, setUnit] = useState<'peformake' | 'ellcazo'>(SKILLS[0].unit)
  const [date, setDate] = useState(todayBR())
  const [staff, setStaff] = useState<string | null>(null)
  const [clientAmount, setClientAmount] = useState('')
  const [staffAmount, setStaffAmount] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  // Sem rolagem: 1 Serviço · 2 Quem e quanto.
  const [step, setStep] = useState<'servico' | 'quem'>('servico')
  // Parte da empresa nos avulsos (Equipe → Configurações). Sem valor para quem fez, vale o do cliente menos essa parte.
  const share = useQuery({ queryKey: ['job-company-pct'], staleTime: 300_000, queryFn: async () => {
    // RPC: as regras de comissão (team_settings) são só de admin/head; aqui só o número da parte da empresa.
    const { data } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown }>)('team_job_company_pct')
    return Number(data ?? 25)
  } })
  const pct = share.data ?? 25

  const pick = (s: Skill) => { setSkill(s); setTitle(s.title); setUnit(s.unit) }
  // Quem já fez esta função aparece primeiro.
  const list = [...(people.data ?? [])].sort((a, b) => Number(b.skills.includes(skill.key)) - Number(a.skills.includes(skill.key)) || a.name.localeCompare(b.name))
  const cv = parseMoney(clientAmount) ?? 0
  const typedSv = parseMoney(staffAmount) ?? 0
  // Freela com tabela de valores (Equipe → Membros → Pagamento): o valor da produção vem dela.
  const rate = useQuery({ queryKey: ['staff-job-rate', staff, skill.key], enabled: !!staff, staleTime: 60_000, queryFn: async () => {
    const { data } = await (supabase.rpc as unknown as Rpc)('staff_job_rate', { _staff: staff, _skill: skill.key })
    return data == null ? null : Number(data)
  } })
  const rated = rate.data ?? null
  const sv = typedSv > 0 ? typedSv : rated ? rated : staff && cv > 0 ? Math.round(cv * (100 - pct)) / 100 : 0

  const save = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('Escolha o cliente.')
      if (title.trim().length < 2) throw new Error('Escreva o serviço.')
      if (cv <= 0 && sv <= 0) throw new Error('Informe o valor.')
      if (sv > 0 && !staff) throw new Error('Escolha quem faz o serviço.')
      // Membro ganhando mais do que o cliente paga: só de propósito, com confirmação.
      const over = cv > 0 && sv > cv
      if (over && !(await ask(`O membro vai receber ${brl(sv)} e o cliente paga ${brl(cv)}. Confirmar mesmo assim?`))) throw new Error('Confira os valores: o membro receberia mais do que o cliente paga.')
      const { error } = await (supabase.rpc as unknown as Rpc)('service_job_save', {
        _data: { client_id: client, unit, skill: skill.key, title: title.trim(), job_date: date, client_amount: cv, staff_id: staff, staff_amount: sv, confirm_over: over },
      })
      if (error) throw new Error(/PF014|mais do que o cliente/.test(error.message) ? 'Só o administrador confirma o membro ganhando mais do que o cliente paga.' : error.message)
    },
    onSuccess: () => {
      for (const k of ['invoices', 'client-invoices', 'fin-entries', 'fin-summary', 'job-people', 'my-payables']) void queryClient.invalidateQueries({ queryKey: [k] })
      onSaved?.()
      onClose()
    },
    onError: (e) => setProblem((e as Error).message),
  })

  return (
    <Dialog open onClose={onClose} title="Serviço avulso" description="Cria a fatura do cliente. Quem fez recebe depois que o cliente pagar." size="md"
      footer={step === 'servico'
        ? <Button onClick={() => { setProblem(null); if (!client) return setProblem('Escolha o cliente.'); if (title.trim().length < 2) return setProblem('Escreva o serviço.'); setStep('quem') }}>Continuar</Button>
        : <><Button variant="secondary" onClick={() => setStep('servico')}>Voltar</Button><Button disabled={save.isPending} onClick={() => { setProblem(null); save.mutate() }}><Check size={15} aria-hidden="true" /> {save.isPending ? 'Lançando' : 'Lançar serviço'}</Button></>}>
      <div className="flex flex-col gap-4">
        <DialogTabs steps label="Etapas do serviço avulso" value={step} onChange={setStep} options={[{ id: 'servico', label: 'Serviço' }, { id: 'quem', label: 'Quem e quanto' }]} />
        <div hidden={step !== 'servico'} className="flex flex-col gap-4">
        {!clientId && (
          <div className="flex flex-col text-[13px] font-semibold">
            <label htmlFor="avulso-cliente">Cliente</label>
            <SearchSelect id="avulso-cliente" name="pf-avulso-cliente" allowNew={false} className="mt-1 font-normal" placeholder="Digite o nome do cliente"
              value={(clients ?? []).find((c) => c.id === client)?.name ?? ''} onChange={(n) => setClient((clients ?? []).find((c) => c.name === n)?.id ?? '')}
              options={(clients ?? []).map((c) => c.name)} />
          </div>
        )}
        <div role="group" aria-label="O que foi feito" className="flex flex-wrap gap-1.5">
          {SKILLS.map((s) => (
            <button key={s.key} type="button" aria-pressed={skill.key === s.key} onClick={() => pick(s)}
              className={cn('min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', skill.key === s.key ? 'border-transparent bg-fill text-on-fill' : 'border-line text-muted hover:border-line-strong hover:text-ink')}>{s.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Serviço<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Ex.: Apresentadora no vídeo do feirão" className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Data<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
        </div>
        <div role="group" aria-label="Empresa" className="inline-flex self-start rounded-full border border-line p-0.5">
          {(['ellcazo', 'peformake'] as const).map((u) => (
            <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}
              className={cn('min-h-9 cursor-pointer rounded-full px-4 text-[13px] font-semibold', u === 'ellcazo' && 'theme-ellcazo', unit === u ? 'bg-fill text-on-fill' : 'text-muted')}>{u === 'ellcazo' ? 'Ellcazo · Audiovisual' : 'Peformake'}</button>
          ))}
        </div>
        </div>

        <div hidden={step !== 'quem'} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[13px] font-semibold">Quem faz</legend>
          {people.isPending && <p role="status" className="text-[13px] text-muted">Carregando a equipe</p>}
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2">
            {list.map((p) => {
              const on = staff === p.id
              const has = p.skills.includes(skill.key)
              return (
                <button key={p.id} type="button" aria-pressed={on} onClick={() => setStaff(on ? null : p.id)}
                  className={cn('flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-2xl border p-2 text-center', on ? 'border-ink bg-raised' : 'border-line hover:border-line-strong')}>
                  {p.photo
                    ? <img src={p.photo} alt="" className={cn('size-9 rounded-full object-cover sm:size-11', on && 'ring-2 ring-ink ring-offset-2 ring-offset-surface')} />
                    : <span className={cn('grid size-9 place-items-center rounded-full bg-raised text-[13px] font-semibold sm:size-11', on && 'ring-2 ring-ink ring-offset-2 ring-offset-surface')}>{initials(p.name)}</span>}
                  <span className="w-full truncate text-[12px] font-medium">{p.name.split(' ')[0]}</span>
                  {has && <span className="rounded-full bg-accent-soft px-1.5 text-[10.5px] font-semibold text-accent-ink">{skill.label}</span>}
                </button>
              )
            })}
          </div>
          <p className="hidden text-[12px] text-muted sm:block">Quem você escolher fica marcado nesta função e aparece primeiro da próxima vez.</p>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-[13px] font-semibold">Cobrar do cliente (R$)<input inputMode="decimal" value={clientAmount} onChange={(e) => setClientAmount(e.target.value)} placeholder="0,00" className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Pagar para quem fez (R$)<input inputMode="decimal" value={staffAmount} onChange={(e) => setStaffAmount(e.target.value)} placeholder={rated ? `${rated.toFixed(2).replace('.', ',')} (tabela da pessoa)` : staff && cv > 0 ? `${(cv * (100 - pct) / 100).toFixed(2).replace('.', ',')} (${100 - pct}%)` : '0,00'} className={field} /></label>
        </div>
        {(cv > 0 || sv > 0) && (
          <p className="rounded-xl bg-raised px-3 py-2 text-[13px]">
            {cv > 0 && <>Fatura de <b>{brl(cv)}</b> no fechamento do mês do cliente{sv > 0 ? '; ' : '.'}</>}
            {sv > 0 && <>{cv > 0 ? <>quem fez recebe <b>{brl(sv)}</b> no próximo dia de pagamento dela depois que o cliente pagar</> : <>conta a pagar de <b>{brl(sv)}</b> no Caixa, no próximo dia de pagamento dela</>}{cv > 0 && sv < cv ? <>; fica <b>{brl(cv - sv)}</b> para a empresa</> : ''}.</>}
          </p>
        )}
        </div>
        {problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{problem}</p>}
      </div>
    </Dialog>
  )
}
