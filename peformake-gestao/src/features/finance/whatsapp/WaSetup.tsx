import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, MessageCircle, Phone, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ask } from '@/components/ui/confirm'
import { cn } from '@/lib/cn'
import { brl } from '../money'
import { parseMoney } from '../statement'
import { inviteCode, phoneKey, phoneLabel } from './waRules'
import { call, teamPhoto, type WaChannel, type WaOverview, type WaStaff, type WaUnknown } from './waApi'

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const seg = (on: boolean) => cn('min-h-9 cursor-pointer rounded-full px-3 text-[13px] font-semibold', on ? 'bg-fill text-on-fill' : 'text-muted')
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

export function Person({ name, photo, size = 40, on }: { name: string; photo: string | null; size?: number; on?: boolean }) {
  return (
    <span className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-raised text-[12px] font-bold text-muted', on && 'ring-2 ring-ok')} style={{ width: size, height: size }}>
      {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  )
}

function useSave() {
  const qc = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const m = useMutation({
    mutationFn: async (v: { fn: string; args: Record<string, unknown> }) => call(v.fn, v.args),
    onSuccess: () => { setProblem(null); void qc.invalidateQueries({ queryKey: ['fin-wa-overview'] }); void qc.invalidateQueries({ queryKey: ['fin-wa-review'] }) },
    onError: (e) => setProblem((e as Error).message),
  })
  return { ...m, problem, setProblem }
}

function Toggle({ on, label, hint, onChange, disabled }: { on: boolean; label: string; hint?: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-2.5">
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4" />
      <span><span className="block font-medium">{label}</span>{hint && <span className="block text-[12px] text-muted">{hint}</span>}</span>
    </label>
  )
}

/** Canais: de onde vêm os lançamentos. Tudo nasce desligado. */
export function ChannelsPart({ data }: { data: WaOverview }) {
  const save = useSave()
  const [editing, setEditing] = useState<WaChannel | 'grupo' | 'privado' | null>(null)
  const s = data.settings
  const h = data.health
  return (
    <>
      <section aria-label="Chaves" className="grid gap-x-6 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-2">
        <Toggle on={s.enabled} label="Ler os canais ligados" hint="Leitor por regras, sem IA: custo zero." onChange={(v) => save.mutate({ fn: 'fin_wa_settings_save', args: { _data: { enabled: v } } })} />
        <Toggle on={s.reply_enabled} label="Responder no grupo" hint={h.wasender_missing ? 'Falta a chave do Wasender no servidor: a resposta fica na fila.' : 'Uma linha curta: "Anotado ✓ ...". Só mensagem interna.'} onChange={(v) => save.mutate({ fn: 'fin_wa_settings_save', args: { _data: { reply_enabled: v } } })} />
        <Toggle on={s.reimburse_enabled} label={'"Do meu bolso" vira reembolso'} hint="Só vira conta a pagar (próximo dia de pagamento da pessoa) depois do OK na revisão." onChange={(v) => save.mutate({ fn: 'fin_wa_settings_save', args: { _data: { reimburse_enabled: v } } })} />
        <Toggle on={s.pix_enabled} label="Botão Pagar reembolso por Pix" hint="Pelo Asaas, sempre com a sua confirmação." onChange={(v) => save.mutate({ fn: 'fin_wa_settings_save', args: { _data: { pix_enabled: v } } })} />
      </section>
      {save.problem && <p role="alert" className="rounded-xl bg-warn-soft px-4 py-2.5 font-medium text-warn-ink">{save.problem}</p>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing('grupo')}><Plus size={15} aria-hidden="true" /> Grupo</Button>
        <Button variant="secondary" onClick={() => setEditing('privado')}><Plus size={15} aria-hidden="true" /> Número</Button>
      </div>
      {data.channels.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-8 text-center text-muted">Nenhum canal ainda. Adicione o grupo do financeiro pelo link de convite.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {data.channels.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-raised text-muted">{c.kind === 'grupo' ? <Users size={18} aria-hidden="true" /> : <Phone size={18} aria-hidden="true" />}</span>
              <button type="button" onClick={() => setEditing(c)} className="min-w-0 flex-1 cursor-pointer text-left">
                <span className="block truncate font-semibold">{c.group_name ?? c.name}</span>
                <span className={cn('block text-[12.5px]', c.kind === 'grupo' && !c.chat_jid ? 'font-medium text-warn-ink' : 'text-muted')}>
                  {c.kind === 'grupo' ? (c.chat_jid ? 'Grupo encontrado ✓' : 'Esperando o número da Peformake entrar no grupo') : phoneLabel(c.phone_key)}
                  {' · '}{c.default_unit ? (c.default_unit === 'ellcazo' ? 'Ellcazo' : 'Peformake') : 'empresa pelo conteúdo'}
                  {!c.accept_entrada ? ' · só despesas' : !c.accept_saida ? ' · só entradas' : ''}
                </span>
              </button>
              <label className="flex min-h-10 cursor-pointer items-center gap-1.5 text-[13px] font-semibold">
                <input type="checkbox" checked={c.enabled} onChange={(e) => save.mutate({ fn: 'fin_wa_channel_save', args: { _id: c.id, _data: { enabled: e.target.checked } } })} className="size-4" />
                {c.enabled ? 'Ligado' : 'Desligado'}
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12.5px] text-muted">
        Exemplos que o sistema entende: <b className="text-ink">paguei 89,90 no canva</b> · <b className="text-ink">gastei 250 de gasolina na captação da transpetro</b> · <b className="text-ink">recebi 1.200 da Will Motos</b> · <b className="text-ink">uber 32,50 ellcazo</b> · <b className="text-ink">paguei do meu bolso 60 estacionamento</b>. Para corrigir, responda a mensagem com <b className="text-ink">corrige 230</b> ou <b className="text-ink">cancela</b>.
      </p>
      {editing && <ChannelDialog channel={typeof editing === 'string' ? null : editing} kind={typeof editing === 'string' ? editing : editing.kind} data={data} onClose={() => setEditing(null)} />}
    </>
  )
}

function ChannelDialog({ channel, kind, data, onClose }: { channel: WaChannel | null; kind: 'grupo' | 'privado'; data: WaOverview; onClose: () => void }) {
  const save = useSave()
  const [name, setName] = useState(channel?.name ?? '')
  const [invite, setInvite] = useState(channel?.invite_code ? `https://chat.whatsapp.com/${channel.invite_code}` : '')
  const [jid, setJid] = useState(channel?.chat_jid ?? '')
  const [search, setSearch] = useState('')
  const [phone, setPhone] = useState(channel?.phone_key ? phoneLabel(channel.phone_key) : '')
  const [unit, setUnit] = useState<string>(channel?.default_unit ?? '')
  const [saida, setSaida] = useState(channel?.accept_saida ?? true)
  const [entrada, setEntrada] = useState(channel?.accept_entrada ?? true)
  const [reply, setReply] = useState(channel?.reply ?? true)
  const [payer, setPayer] = useState(channel?.default_payer ?? 'empresa')
  const used = new Set(data.channels.map((c) => c.chat_jid).filter((j) => j && j !== channel?.chat_jid))
  const q = search.trim().toLowerCase()
  const groups = data.groups.filter((g) => !used.has(g.chat_jid) && (!q || g.name.toLowerCase().includes(q))).slice(0, 6)
  const picked = data.groups.find((g) => g.chat_jid === jid)
  const submit = () => {
    if (kind === 'grupo' && invite.trim() && !inviteCode(invite)) { save.setProblem('O link de convite não parece certo. Copie de novo no WhatsApp (Convidar via link).'); return }
    if (kind === 'privado' && (phoneKey(phone)?.length ?? 0) < 10) { save.setProblem('Informe o número com DDD.'); return }
    if (kind === 'grupo' && !jid && !name.trim()) { save.setProblem('Escreva o nome do grupo (como aparece no WhatsApp) ou escolha da lista.'); return }
    save.mutate({ fn: 'fin_wa_channel_save', args: { _id: channel?.id ?? null, _data: {
      kind, name: name.trim() || null, invite, chat_jid: jid || null, phone, default_unit: unit, accept_saida: saida, accept_entrada: entrada, reply, default_payer: payer,
    } } }, { onSuccess: onClose })
  }
  return (
    <Dialog open onClose={onClose} title={channel ? 'Editar canal' : kind === 'grupo' ? 'Adicionar grupo' : 'Adicionar número'} size="md"
      footer={<div className="flex w-full flex-wrap justify-between gap-2">
        {channel ? <Button variant="link" onClick={() => void ask('Tirar este canal? As mensagens novas dele deixam de ser lidas. O que já foi lançado continua no Caixa.').then((ok) => ok && save.mutate({ fn: 'fin_wa_channel_remove', args: { _id: channel.id } }, { onSuccess: onClose }))}>Tirar canal</Button> : <span />}
        <Button disabled={save.isPending} onClick={submit}><Check size={15} aria-hidden="true" /> Salvar</Button>
      </div>}>
      <div className="flex flex-col gap-3">
        {kind === 'grupo' ? (<>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-[13px] font-semibold">Nome do grupo<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="como aparece no WhatsApp" className={field} /></label>
            <label className="flex flex-col text-[13px] font-semibold">Link de convite<input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="https://chat.whatsapp.com/..." className={field} /></label>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-semibold">Ou escolha da lista {picked && <span className="font-normal text-ok-ink">· {picked.name} ✓</span>}</p>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar grupo" aria-label="Buscar grupo" className="min-h-10 rounded-xl border border-line px-3 text-[13px]" />
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => <button key={g.chat_jid} type="button" aria-pressed={jid === g.chat_jid} onClick={() => setJid(jid === g.chat_jid ? '' : g.chat_jid)} className={cn('min-h-8 max-w-full cursor-pointer truncate rounded-full px-3 text-[12.5px] font-medium', jid === g.chat_jid ? 'bg-fill text-on-fill' : 'bg-raised hover:bg-line')}>{g.name}</button>)}
              {groups.length === 0 && <span className="text-[12.5px] text-muted">Nenhum grupo com esse nome. O grupo aparece aqui quando o número da Peformake entrar nele (a lista atualiza às 06:00); com o nome escrito acima, ele liga sozinho.</span>}
            </div>
          </div>
        </>) : (
          <label className="flex flex-col text-[13px] font-semibold">Número com DDD<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(81) 98567-2212" className={field} /></label>
        )}
        <div className="flex flex-wrap items-center gap-2 text-[13px]"><span className="font-semibold">Empresa</span>
          <div role="group" aria-label="Empresa padrão" className="inline-flex rounded-full border border-line p-0.5">
            {([['', 'Pelo conteúdo'], ['peformake', 'Peformake'], ['ellcazo', 'Ellcazo']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={unit === v} onClick={() => setUnit(v)} className={seg(unit === v)}>{l}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]"><span className="font-semibold">Despesa paga por</span>
          <div role="group" aria-label="Quem paga por padrão" className="inline-flex rounded-full border border-line p-0.5">
            {([['empresa', 'Empresa'], ['quem_lancou', 'Quem lançou']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={payer === v} onClick={() => setPayer(v)} className={seg(payer === v)}>{l}</button>)}
          </div>
        </div>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Toggle on={saida} label="Aceita despesas" onChange={setSaida} />
          <Toggle on={entrada} label="Aceita entradas" onChange={setEntrada} />
          <Toggle on={reply} label="Responder" hint={data.health.wasender_missing ? 'Falta a chave do Wasender' : undefined} onChange={setReply} />
        </div>
        {kind === 'grupo' && <p className="flex items-start gap-1.5 text-[12px] text-muted"><MessageCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />Grupo de cliente não pode ser canal. O canal nasce desligado: ligue na lista quando quiser.</p>}
        {save.problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{save.problem}</p>}
      </div>
    </Dialog>
  )
}

/** Pessoas: quem pode lançar (por foto), limite de valor alto, chave Pix e números desconhecidos. */
export function PeoplePart({ data }: { data: WaOverview }) {
  const save = useSave()
  const [editing, setEditing] = useState<WaStaff | null>(null)
  const [releasing, setReleasing] = useState<WaUnknown | null>(null)
  const [limit, setLimit] = useState(String(data.settings.high_value).replace('.', ','))
  return (
    <>
      <section aria-labelledby="quem" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h2 id="quem" className="text-[16px] font-semibold">Quem pode lançar</h2><p className="text-[12.5px] text-muted">Toque na foto. A pessoa é reconhecida pelo telefone.</p></div>
          <label className="flex items-end gap-2 text-[13px] font-semibold">Valor alto a partir de
            <input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} onBlur={() => { const v = parseMoney(limit); if (v && v !== data.settings.high_value) save.mutate({ fn: 'fin_wa_settings_save', args: { _data: { high_value: v } } }) }}
              aria-label="Valor alto a partir de" className="min-h-10 w-28 rounded-xl border border-line-strong px-3 font-normal" />
          </label>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {data.staff.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setEditing(p)} className={cn('flex w-full cursor-pointer flex-col items-center gap-1 rounded-2xl p-2 text-center hover:bg-raised', !p.allowed && 'opacity-60')}>
                <Person name={p.name} photo={teamPhoto(p.avatar_path)} size={52} on={p.allowed} />
                <span className="w-full truncate text-[12.5px] font-semibold">{p.name.split(' ')[0]}</span>
                <span className={cn('text-[11px]', p.allowed && !p.phone ? 'font-semibold text-warn-ink' : 'text-muted')}>{p.allowed ? (p.phone ? 'pode lançar' : 'falta telefone') : 'não lança'}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {save.problem && <p role="alert" className="rounded-xl bg-warn-soft px-4 py-2.5 font-medium text-warn-ink">{save.problem}</p>}

      {data.unknown.length > 0 && (
        <section aria-labelledby="desconhecidos" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4">
          <h2 id="desconhecidos" className="text-[16px] font-semibold">Número desconhecido tentou lançar</h2>
          <ul className="flex flex-col divide-y divide-line">
            {data.unknown.map((u) => (
              <li key={u.phone_key} className="flex flex-wrap items-center gap-2 py-2">
                <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{u.name ?? 'Sem nome'} · {phoneLabel(u.phone)}</p>
                  <p className="truncate text-[12px] text-muted">{u.attempts}× · "{u.last_text ?? ''}"</p></div>
                <Button onClick={() => setReleasing(u)}>Liberar</Button>
                <Button variant="secondary" onClick={() => save.mutate({ fn: 'fin_wa_unknown_dismiss', args: { _key: u.phone_key } })}>Ignorar</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && <PersonDialog person={editing} defaultLimit={data.settings.high_value} onClose={() => setEditing(null)} />}
      {releasing && <ReleaseDialog unknown={releasing} staff={data.staff} onClose={() => setReleasing(null)} />}
    </>
  )
}

function PersonDialog({ person, defaultLimit, onClose }: { person: WaStaff; defaultLimit: number; onClose: () => void }) {
  const save = useSave()
  const [allowed, setAllowed] = useState(true)
  const [phone, setPhone] = useState(person.phone ? phoneLabel(person.phone) : '')
  const [limit, setLimit] = useState(person.high_value ? String(person.high_value).replace('.', ',') : '')
  const [pix, setPix] = useState('')
  const [pixType, setPixType] = useState(person.pix_key_type ?? 'CPF')
  const submit = () => {
    if (allowed && (phoneKey(phone)?.length ?? 0) < 10) { save.setProblem('Coloque o telefone com DDD: é por ele que o sistema sabe quem mandou.'); return }
    const data: Record<string, unknown> = { allowed, phone, high_value: limit ? parseMoney(limit) : null }
    if (pix.trim()) { data.pix_key = pix.trim(); data.pix_key_type = pixType }
    save.mutate({ fn: 'fin_wa_person_save', args: { _staff: person.id, _data: data } }, { onSuccess: onClose })
  }
  return (
    <Dialog open onClose={onClose} title={person.name} size="sm"
      footer={<div className="flex w-full flex-wrap justify-between gap-2">
        {person.allowed ? <Button variant="link" onClick={() => save.mutate({ fn: 'fin_wa_person_save', args: { _staff: person.id, _data: { allowed: false } } }, { onSuccess: onClose })}>Não pode mais lançar</Button> : <span />}
        <Button disabled={save.isPending} onClick={submit}><Check size={15} aria-hidden="true" /> {person.allowed ? 'Salvar' : 'Pode lançar'}</Button>
      </div>}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3"><Person name={person.name} photo={teamPhoto(person.avatar_path)} size={56} on={allowed} />
          <Toggle on={allowed} label="Pode lançar pelo WhatsApp" onChange={setAllowed} /></div>
        <label className="flex flex-col text-[13px] font-semibold">Telefone (WhatsApp)<input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(81) 98567-2212" className={field} /></label>
        <label className="flex flex-col text-[13px] font-semibold">Valor alto a partir de (R$)<input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={`padrão ${brl(defaultLimit)}`} className={field} /></label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="flex flex-col text-[13px] font-semibold">Chave Pix (reembolso){person.has_pix && <span className="font-normal text-muted">cadastrada {person.pix_hint}: deixe vazio para manter</span>}
            <input value={pix} onChange={(e) => setPix(e.target.value)} className={field} /></label>
          <label className="flex flex-col text-[13px] font-semibold">Tipo
            <select value={pixType} onChange={(e) => setPixType(e.target.value)} className={field}>
              {[['CPF', 'CPF'], ['CNPJ', 'CNPJ'], ['EMAIL', 'E-mail'], ['PHONE', 'Celular'], ['EVP', 'Aleatória']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        {save.problem && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{save.problem}</p>}
      </div>
    </Dialog>
  )
}

function ReleaseDialog({ unknown, staff, onClose }: { unknown: WaUnknown; staff: WaStaff[]; onClose: () => void }) {
  const save = useSave()
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <Dialog open onClose={onClose} title="Liberar número" description={`${unknown.name ?? 'Sem nome'} · ${phoneLabel(unknown.phone)}. De quem é este número?`} size="md"
      footer={<Button disabled={!picked || save.isPending} onClick={() => picked && save.mutate({ fn: 'fin_wa_person_save', args: { _staff: picked, _data: { allowed: true, phone: unknown.phone } } }, { onSuccess: onClose })}><Check size={15} aria-hidden="true" /> Liberar</Button>}>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {staff.map((p) => (
          <li key={p.id}><button type="button" aria-pressed={picked === p.id} onClick={() => setPicked(p.id)} className={cn('flex w-full cursor-pointer flex-col items-center gap-1 rounded-2xl p-2', picked === p.id ? 'bg-raised ring-2 ring-ink' : 'hover:bg-raised')}>
            <Person name={p.name} photo={teamPhoto(p.avatar_path)} size={48} /><span className="w-full truncate text-[12.5px] font-semibold">{p.name.split(' ')[0]}</span>
          </button></li>
        ))}
      </ul>
      {picked && staff.find((p) => p.id === picked)?.phone && <p className="mt-2 flex items-center gap-1 text-[12.5px] text-warn-ink"><AlertTriangle size={12} aria-hidden="true" /> Essa pessoa já tem telefone: será trocado por este.</p>}
      {save.problem && <p role="alert" className="mt-2 rounded-lg bg-warn-soft px-3 py-2 font-medium text-warn-ink">{save.problem}</p>}
    </Dialog>
  )
}
