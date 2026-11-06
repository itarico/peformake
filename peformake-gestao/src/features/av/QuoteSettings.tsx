import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { LoadState } from '@/features/traffic/LoadState'
import { AUTO_LABEL, presetSummary, type QuotePreset, menuOf, modeOn, newId, PRICING_LABELS, UNIT_LABEL, val, type AutoWhen, type AvPricing, type MenuCategory, type MenuItem, type MenuUnit, type PriceRule, type QuoteMenu } from './avPricing'
import { getPricing, savePricing } from './avQuotesApi'
import { searchPlaces, type Place } from './geo'
import { supabase } from '@/lib/supabase'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 font-normal'
const toNum = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} title={on ? 'Ligado: aparece no orçamento' : 'Desligado: não aparece no orçamento'} onClick={() => onChange(!on)}
      className={cn('relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors', on ? 'bg-ok' : 'bg-line-strong')}>
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">{children}</button>
}

function Card({ title, text, action, children }: { title: string; text: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div><h2 className="text-[15px] font-semibold">{title}</h2><p className="text-[12px] text-muted">{text}</p></div>
        {action}
      </div>
      {children}
    </section>
  )
}

type Editing =
  | { kind: 'vars'; group: string }
  | { kind: 'category'; value: MenuCategory }
  | { kind: 'item'; value: MenuItem }
  | { kind: 'rule'; value: PriceRule }
  | { kind: 'preset'; value: QuotePreset }
  | { kind: 'delete'; what: 'category' | 'item' | 'rule' | 'preset'; id: string; name: string }

/** Configurações → Orçamento: variáveis da conta, serviços por categoria e regras de preço. Tudo editável. */
export function QuoteSettings() {
  const q = useQuery({ queryKey: ['av-pricing'], queryFn: getPricing })
  if (!q.data) return <LoadState isPending={q.isPending} isError={q.isError} refetch={() => void q.refetch()} />
  return <Panel pricing={q.data} />
}

function Panel({ pricing }: { pricing: AvPricing }) {
  const queryClient = useQueryClient()
  const menu = menuOf(pricing)
  const [editing, setEditing] = useState<Editing | null>(null)
  const save = useMutation({
    mutationFn: (next: AvPricing) => savePricing(next),
    onSuccess: () => { setEditing(null); void queryClient.invalidateQueries({ queryKey: ['av-pricing'] }) },
  })
  const saveMenu = (m: QuoteMenu) => save.mutate({ ...pricing, menu: m })
  const groups = [...new Set(PRICING_LABELS.map((f) => f.group))]
  const close = () => { save.reset(); setEditing(null) }

  const upsert = <T extends { id: string }>(list: T[], v: T) => list.some((x) => x.id === v.id) ? list.map((x) => (x.id === v.id ? v : x)) : [...list, v]

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-muted">Tudo o que a calculadora de orçamento usa. Mudou aqui, os próximos orçamentos já saem com o valor novo; os orçamentos salvos não mudam.</p>

      <BaseCard pricing={pricing} busy={save.isPending} onSave={(b) => save.mutate({ ...pricing, ...b })} />

      <Card title="Variáveis da conta" text="A conta central: pessoas × horas × valor da hora, mais edição e roteiro por vídeo.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <div key={g} className="flex flex-col gap-1 rounded-2xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{g}</h3>
                <IconBtn label={`Editar ${g}`} onClick={() => setEditing({ kind: 'vars', group: g })}><Pencil size={14} aria-hidden="true" /></IconBtn>
              </div>
              {PRICING_LABELS.filter((f) => f.group === g).map((f) => (
                <div key={f.key} className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="text-muted">{f.label}</span>
                  <b className="shrink-0 tabular-nums">{f.suffix ? `${val(pricing, f.key)} ${f.suffix}` : brl(val(pricing, f.key))}</b>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Pacotes prontos" text="Cada pacote liga e configura a montagem: forma, equipe, horas ou diárias, vídeos, serviços e regras. Para criar, monte um orçamento e toque em “Salvar esta montagem como pacote”.">
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {(menu.presets ?? []).map((x) => (
            <li key={x.id} className={cn('flex items-center gap-2 rounded-2xl border border-line px-3 py-2', !x.active && 'opacity-60')}>
              <Switch on={x.active} label={x.name} onChange={(v) => saveMenu({ ...menu, presets: upsert(menu.presets ?? [], { ...x, active: v }) })} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{x.name}</span>
                <span className="block text-[12px] text-muted">{presetSummary(x)}{x.kind === 'plano' ? ' · plano mensal' : ''}</span>
              </span>
              <IconBtn label={`Editar ${x.name}`} onClick={() => setEditing({ kind: 'preset', value: x })}><Pencil size={14} aria-hidden="true" /></IconBtn>
              <IconBtn label={`Apagar ${x.name}`} onClick={() => setEditing({ kind: 'delete', what: 'preset', id: x.id, name: x.name })}><Trash2 size={14} aria-hidden="true" /></IconBtn>
            </li>
          ))}
          {(menu.presets ?? []).length === 0 && <li className="text-[13px] text-muted">Nenhum pacote ainda.</li>}
        </ul>
      </Card>

      <Card title="Formas de montar" text="O que aparece em “Montar sob medida”. Desligue o que a Ellcazo não vende mais.">
        <div className="flex flex-wrap gap-3">
          {([['camera', 'Câmera'], ['mobile', 'Mobile'], ['evento', 'Evento'], ['sem_captacao', 'Só serviços (sem captação)']] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 rounded-2xl border border-line px-3 py-2 text-[14px]">
              <Switch on={modeOn(menu, k)} label={l} onChange={(v) => saveMenu({ ...menu, modes: { ...menu.modes, [k]: v } })} /> {l}
            </label>
          ))}
        </div>
      </Card>

      <Card title="Serviços" text="Organizados por categoria. Desligado não aparece no orçamento, mas fica guardado."
        action={<div className="flex shrink-0 gap-2">
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setEditing({ kind: 'category', value: { id: newId(), name: '', active: true } })}><Plus size={14} aria-hidden="true" /> Categoria</Button>
          <Button className="min-h-9 px-3 text-[13px]" disabled={menu.categories.length === 0} onClick={() => setEditing({ kind: 'item', value: { id: newId(), categoryId: menu.categories[0]?.id ?? '', name: '', price: 0, unit: 'unidade', active: true } })}><Plus size={14} aria-hidden="true" /> Serviço</Button>
        </div>}>
        {menu.categories.length === 0 && <p className="text-[13px] text-muted">Crie a primeira categoria para começar.</p>}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {menu.categories.map((c) => {
            const items = menu.items.filter((i) => i.categoryId === c.id)
            const catOn = c.active !== false
            return (
              <div key={c.id} className={cn('flex flex-col rounded-2xl border border-line', !catOn && 'opacity-60')}>
                <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                  <Switch on={catOn} label={`Categoria ${c.name}`} onChange={(v) => saveMenu({ ...menu, categories: upsert(menu.categories, { ...c, active: v }) })} />
                  <h3 className="min-w-0 flex-1 truncate font-semibold">{c.name} <span className="text-[12px] font-normal text-muted">{items.length} {items.length === 1 ? 'serviço' : 'serviços'}</span></h3>
                  <IconBtn label={`Novo serviço em ${c.name}`} onClick={() => setEditing({ kind: 'item', value: { id: newId(), categoryId: c.id, name: '', price: 0, unit: 'unidade', active: true } })}><Plus size={15} aria-hidden="true" /></IconBtn>
                  <IconBtn label={`Renomear ${c.name}`} onClick={() => setEditing({ kind: 'category', value: c })}><Pencil size={14} aria-hidden="true" /></IconBtn>
                  <IconBtn label={`Apagar ${c.name}`} onClick={() => setEditing({ kind: 'delete', what: 'category', id: c.id, name: c.name })}><Trash2 size={14} aria-hidden="true" /></IconBtn>
                </div>
                <ul className="divide-y divide-line">
                  {items.map((it) => (
                    <li key={it.id} className={cn('flex items-center gap-2 px-3 py-1.5', !it.active && 'opacity-60')}>
                      <Switch on={it.active} label={it.name} onChange={(v) => saveMenu({ ...menu, items: upsert(menu.items, { ...it, active: v }) })} />
                      {it.photo && <img src={it.photo} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px]">{it.name}</span>
                        <span className="block text-[12px] text-muted">{brl(it.price)} por {UNIT_LABEL[it.unit][0]}{it.auto ? ' · automático' : ''}</span>
                      </span>
                      <IconBtn label={`Editar ${it.name}`} onClick={() => setEditing({ kind: 'item', value: it })}><Pencil size={14} aria-hidden="true" /></IconBtn>
                      <IconBtn label={`Apagar ${it.name}`} onClick={() => setEditing({ kind: 'delete', what: 'item', id: it.id, name: it.name })}><Trash2 size={14} aria-hidden="true" /></IconBtn>
                    </li>
                  ))}
                  {items.length === 0 && <li className="px-3 py-3 text-[13px] text-muted">Nenhum serviço nesta categoria.</li>}
                </ul>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Regras de preço" text="Acréscimos e descontos. Opcional: quem monta o orçamento marca. Sempre: entra sozinha."
        action={<Button className="min-h-9 shrink-0 px-3 text-[13px]" onClick={() => setEditing({ kind: 'rule', value: { id: newId(), name: '', mode: 'pct', value: 10, direction: 'acrescimo', base: 'total', when: 'opcional', active: true } })}><Plus size={14} aria-hidden="true" /> Regra</Button>}>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {menu.rules.map((r) => (
            <li key={r.id} className={cn('flex items-center gap-2 rounded-2xl border border-line px-3 py-2', !r.active && 'opacity-60')}>
              <Switch on={r.active} label={r.name} onChange={(v) => saveMenu({ ...menu, rules: upsert(menu.rules, { ...r, active: v }) })} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{r.name}</span>
                <span className="block text-[12px] text-muted">
                  {r.direction === 'desconto' ? 'Desconto' : 'Acréscimo'} de {r.mode === 'pct' ? `${r.value}%` : brl(r.value)} sobre {r.base === 'total' ? 'o total' : 'as horas de captação'} · {r.when === 'sempre' ? 'sempre' : 'opcional'}{r.minTotal ? ` · a partir de ${brl(r.minTotal)}` : ''}
                </span>
              </span>
              <IconBtn label={`Editar ${r.name}`} onClick={() => setEditing({ kind: 'rule', value: r })}><Pencil size={14} aria-hidden="true" /></IconBtn>
              <IconBtn label={`Apagar ${r.name}`} onClick={() => setEditing({ kind: 'delete', what: 'rule', id: r.id, name: r.name })}><Trash2 size={14} aria-hidden="true" /></IconBtn>
            </li>
          ))}
          {menu.rules.length === 0 && <li className="text-[13px] text-muted">Nenhuma regra.</li>}
        </ul>
      </Card>

      {save.isError && !editing && <p role="alert" className="text-[13px] font-medium text-warn-ink">Não foi possível salvar. Só admin, head ou social media editam o orçamento.</p>}

      <Dialog open={!!editing} onClose={close} size="sm"
        title={!editing ? '' : editing.kind === 'vars' ? editing.group : editing.kind === 'category' ? (editing.value.name ? 'Categoria' : 'Nova categoria') : editing.kind === 'item' ? (editing.value.name ? 'Serviço' : 'Novo serviço') : editing.kind === 'rule' ? (editing.value.name ? 'Regra' : 'Nova regra') : editing.kind === 'preset' ? 'Pacote' : `Apagar ${editing.name}?`}>
        {editing?.kind === 'vars' && <VarsForm group={editing.group} pricing={pricing} busy={save.isPending} onCancel={close} onSave={(v) => save.mutate({ ...pricing, ...v })} />}
        {editing?.kind === 'category' && <CategoryForm initial={editing.value} busy={save.isPending} onCancel={close} onSave={(c) => saveMenu({ ...menu, categories: upsert(menu.categories, c) })} />}
        {editing?.kind === 'item' && <ItemForm initial={editing.value} categories={menu.categories} busy={save.isPending} onCancel={close} onSave={(it) => saveMenu({ ...menu, items: upsert(menu.items, it) })} />}
        {editing?.kind === 'preset' && <PresetForm initial={editing.value} busy={save.isPending} onCancel={close} onSave={(x) => saveMenu({ ...menu, presets: upsert(menu.presets ?? [], x) })} />}
        {editing?.kind === 'rule' && <RuleForm initial={editing.value} busy={save.isPending} onCancel={close} onSave={(r) => saveMenu({ ...menu, rules: upsert(menu.rules, r) })} />}
        {editing?.kind === 'delete' && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px]">{editing.what === 'category' ? `A categoria e os ${menu.items.filter((i) => i.categoryId === editing.id).length} serviços dela serão apagados. Se quiser só esconder, use o botão de ligar e desligar.` : 'Os orçamentos já salvos não mudam. Se quiser só esconder, use o botão de ligar e desligar.'}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="bg-warn text-white" disabled={save.isPending} onClick={() => {
                if (editing.what === 'category') saveMenu({ ...menu, categories: menu.categories.filter((c) => c.id !== editing.id), items: menu.items.filter((i) => i.categoryId !== editing.id) })
                if (editing.what === 'item') saveMenu({ ...menu, items: menu.items.filter((i) => i.id !== editing.id) })
                if (editing.what === 'preset') saveMenu({ ...menu, presets: (menu.presets ?? []).filter((x) => x.id !== editing.id) })
                if (editing.what === 'rule') saveMenu({ ...menu, rules: menu.rules.filter((r) => r.id !== editing.id) })
              }}>Apagar</Button>
              <Button variant="secondary" onClick={close}>Cancelar</Button>
            </div>
          </div>
        )}
        {save.isError && <p role="alert" className="mt-2 text-[13px] font-medium text-warn-ink">Não foi possível salvar. Só admin, head ou social media editam o orçamento.</p>}
      </Dialog>
    </div>
  )
}

function Actions({ busy, onCancel, disabled }: { busy: boolean; onCancel: () => void; disabled?: boolean }) {
  return <div className="flex gap-2"><Button type="submit" disabled={busy || disabled}>{busy ? 'Salvando' : 'Salvar'}</Button><Button variant="secondary" onClick={onCancel}>Cancelar</Button></div>
}

function VarsForm({ group, pricing, busy, onCancel, onSave }: { group: string; pricing: AvPricing; busy: boolean; onCancel: () => void; onSave: (v: Partial<AvPricing>) => void }) {
  const fields = PRICING_LABELS.filter((f) => f.group === group)
  const [d, setD] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, String(val(pricing, f.key)).replace('.', ',')])))
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(Object.fromEntries(fields.map((f) => [f.key, toNum(d[f.key] ?? '0')]))) }} className="flex flex-col gap-3">
      {fields.map((f) => (
        <label key={f.key} className="flex items-center justify-between gap-3 text-[14px]">
          <span>{f.label}</span>
          <span className="flex items-center gap-1.5">
            {!f.suffix && <span className="text-muted">R$</span>}
            <input inputMode="decimal" value={d[f.key]} onChange={(e) => setD({ ...d, [f.key]: e.target.value })} className="h-10 w-24 rounded-lg border border-line-strong bg-surface px-2 text-right tabular-nums" />
            {f.suffix && <span className="w-8 text-muted">{f.suffix}</span>}
          </span>
        </label>
      ))}
      <Actions busy={busy} onCancel={onCancel} />
    </form>
  )
}

function CategoryForm({ initial, busy, onCancel, onSave }: { initial: MenuCategory; busy: boolean; onCancel: () => void; onSave: (c: MenuCategory) => void }) {
  const [name, setName] = useState(initial.name)
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...initial, name: name.trim() }) }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Nome da categoria
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Fotografia, Eventos, Adicionais" className={field} />
      </label>
      <Actions busy={busy} onCancel={onCancel} disabled={name.trim().length < 2} />
    </form>
  )
}

function ItemForm({ initial, categories, busy, onCancel, onSave }: { initial: MenuItem; categories: MenuCategory[]; busy: boolean; onCancel: () => void; onSave: (it: MenuItem) => void }) {
  const [v, setV] = useState({ ...initial, priceText: String(initial.price).replace('.', ','), description: initial.description ?? '' })
  return (
    <form onSubmit={(e) => { e.preventDefault(); const { priceText, ...rest } = v; onSave({ ...rest, name: rest.name.trim(), description: rest.description.trim() || undefined, price: toNum(priceText) }) }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Nome do serviço
        <input autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Ex.: Ensaio fotográfico" className={field} />
      </label>
      <label className="flex flex-col text-[13px] font-semibold">Descrição <span className="font-normal text-muted">(opcional, aparece ao montar)</span>
        <input value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Preço (R$)
          <input inputMode="decimal" value={v.priceText} onChange={(e) => setV({ ...v, priceText: e.target.value })} className={cn(field, 'tabular-nums')} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Cobrado por
          <select value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value as MenuUnit })} className={field}>
            {(Object.keys(UNIT_LABEL) as MenuUnit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u][0]}</option>)}
          </select>
        </label>
      </div>
      <label className="flex flex-col text-[13px] font-semibold">Categoria
        <select value={v.categoryId} onChange={(e) => setV({ ...v, categoryId: e.target.value })} className={field}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col text-[13px] font-semibold">Entra sozinho?
        <select value={v.auto ?? ''} onChange={(e) => setV({ ...v, auto: (e.target.value || undefined) as AutoWhen | undefined })} className={field}>
          <option value="">Não, só quando escolher</option>
          {(Object.keys(AUTO_LABEL) as AutoWhen[]).map((k) => <option key={k} value={k}>{AUTO_LABEL[k]}</option>)}
        </select>
      </label>
      <PhotoField id={v.id} photo={v.photo} onChange={(photo) => setV({ ...v, photo })} />
      <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="size-4" /> Ligado (aparece no orçamento)</label>
      <Actions busy={busy} onCancel={onCancel} disabled={v.name.trim().length < 2 || toNum(v.priceText) <= 0 || !v.categoryId} />
    </form>
  )
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1 text-[13px] font-semibold">{label}
      <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line p-0.5">
        {options.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
            className={cn('min-h-9 cursor-pointer rounded-lg px-2 text-[13px]', value === k ? 'bg-fill font-semibold text-on-fill' : 'font-normal text-muted hover:text-ink')}>{l}</button>
        ))}
      </div>
    </div>
  )
}

function RuleForm({ initial, busy, onCancel, onSave }: { initial: PriceRule; busy: boolean; onCancel: () => void; onSave: (r: PriceRule) => void }) {
  const [r, setR] = useState({ ...initial, valueText: String(initial.value).replace('.', ','), minText: initial.minTotal ? String(initial.minTotal) : '' })
  const value = toNum(r.valueText)
  return (
    <form onSubmit={(e) => { e.preventDefault(); const { valueText, minText, ...rest } = r; onSave({ ...rest, name: rest.name.trim(), value: toNum(valueText), minTotal: toNum(minText) || undefined }) }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Nome da regra
        <input autoFocus value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="Ex.: Feriado, Pagamento à vista" className={field} />
      </label>
      <Seg label="Tipo" value={r.direction} options={[['acrescimo', 'Acréscimo'], ['desconto', 'Desconto']]} onChange={(direction) => setR({ ...r, direction })} />
      <div className="grid grid-cols-2 gap-3">
        <Seg label="Em" value={r.mode} options={[['pct', '%'], ['fixo', 'R$']]} onChange={(mode) => setR({ ...r, mode })} />
        <label className="flex flex-col text-[13px] font-semibold">Valor
          <input inputMode="decimal" value={r.valueText} onChange={(e) => setR({ ...r, valueText: e.target.value })} className={cn(field, 'tabular-nums')} />
        </label>
      </div>
      <Seg label="Sobre" value={r.base} options={[['total', 'O total'], ['captacao', 'Horas de captação']]} onChange={(base) => setR({ ...r, base })} />
      <Seg label="Quando" value={r.when} options={[['opcional', 'Opcional (marcar)'], ['sempre', 'Sempre']]} onChange={(when) => setR({ ...r, when })} />
      {r.base === 'total' && (
        <label className="flex flex-col text-[13px] font-semibold">Só a partir de (R$) <span className="font-normal text-muted">opcional, ex.: desconto só acima de R$ 2.000</span>
          <input inputMode="decimal" value={r.minText} onChange={(e) => setR({ ...r, minText: e.target.value })} className={cn(field, 'tabular-nums')} />
        </label>
      )}
      <p className="rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">Exemplo: num orçamento de R$ 1.000, {r.direction === 'desconto' ? 'desconta' : 'acrescenta'} {brl(r.mode === 'pct' ? 1000 * value / 100 : value)}{r.base === 'captacao' ? ' (calculado só sobre as horas)' : ''}.</p>
      <Actions busy={busy} onCancel={onCancel} disabled={r.name.trim().length < 2 || value <= 0 || (r.mode === 'pct' && value > 100 && r.direction === 'desconto')} />
    </form>
  )
}

function PhotoField({ id, photo, onChange }: { id: string; photo?: string; onChange: (url: string | undefined) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const upload = async (f: File) => {
    if (f.size > 3_000_000) { setErr('Foto até 3 MB.'); return }
    setBusy(true); setErr(null)
    const path = `servicos/${id}-${Date.now()}.${(f.name.split('.').pop() ?? 'jpg').toLowerCase()}`
    const { error } = await supabase.storage.from('quote-assets').upload(path, f, { upsert: true, contentType: f.type })
    setBusy(false)
    if (error) { setErr('Não foi possível enviar a foto.'); return }
    onChange(supabase.storage.from('quote-assets').getPublicUrl(path).data.publicUrl)
  }
  return (
    <div className="flex items-center gap-3 text-[13px] font-semibold">
      {photo ? <img src={photo} alt="" className="size-16 rounded-xl object-cover" /> : <span className="grid size-16 place-items-center rounded-xl bg-raised text-[11px] font-normal text-muted">Sem foto</span>}
      <span className="flex flex-col gap-1">
        <label className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line-strong px-3 hover:border-ink">{busy ? 'Enviando' : photo ? 'Trocar foto' : 'Pôr foto'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f) }} />
        </label>
        {photo && <button type="button" onClick={() => onChange(undefined)} className="cursor-pointer text-left text-[12px] font-normal text-muted hover:text-ink">Tirar foto</button>}
        {err && <span role="alert" className="text-[12px] font-medium text-warn-ink">{err}</span>}
      </span>
    </div>
  )
}

function BaseCard({ pricing, busy, onSave }: { pricing: AvPricing; busy: boolean; onSave: (b: Pick<AvPricing, 'base_endereco' | 'base_lat' | 'base_lng'>) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(pricing.base_endereco ?? '')
  const [found, setFound] = useState<Place[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const search = async () => { setErr(null); try { const r = await searchPlaces(q); setFound(r); if (!r.length) setErr('Não achei. Tente com rua, bairro e cidade.') } catch (e) { setErr((e as Error).message) } }
  return (
    <Card title="Base da Ellcazo" text="Ponto de saída da equipe. A distância até o local da captação é calculada daqui, pela rota de carro."
      action={<Button variant="secondary" className="min-h-9 shrink-0 px-3 text-[13px]" onClick={() => setOpen(true)}><Pencil size={13} aria-hidden="true" /> {pricing.base_endereco ? 'Trocar' : 'Cadastrar'}</Button>}>
      <p className="text-[14px]">{pricing.base_endereco ?? <span className="text-muted">Ainda não cadastrada. Sem ela, os km são digitados à mão.</span>}</p>
      <Dialog open={open} onClose={() => setOpen(false)} title="Base da Ellcazo" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); void search() }} className="flex flex-col gap-3">
          <div className="flex gap-2"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rua, número, bairro, cidade" className={cn(field, 'mt-0 flex-1')} /><Button type="submit" variant="secondary" disabled={q.trim().length < 3}>Buscar</Button></div>
          {found && found.length > 0 && (
            <ul className="overflow-hidden rounded-2xl border border-line">
              {found.map((p) => <li key={`${p.lat},${p.lng}`}><button type="button" disabled={busy} onClick={() => { onSave({ base_endereco: p.label, base_lat: p.lat, base_lng: p.lng }); setOpen(false); setFound(null) }} className="w-full cursor-pointer px-3 py-2 text-left text-[14px] hover:bg-raised">{p.label}</button></li>)}
            </ul>
          )}
          {err && <p role="alert" className="text-[13px] font-medium text-warn-ink">{err}</p>}
        </form>
      </Dialog>
    </Card>
  )
}

function PresetForm({ initial, busy, onCancel, onSave }: { initial: QuotePreset; busy: boolean; onCancel: () => void; onSave: (x: QuotePreset) => void }) {
  const [v, setV] = useState({ ...initial, description: initial.description ?? '', monthsText: initial.months ? String(initial.months) : '' })
  return (
    <form onSubmit={(e) => { e.preventDefault(); const { monthsText, ...rest } = v; onSave({ ...rest, name: rest.name.trim(), description: rest.description.trim() || undefined, months: Number(monthsText) || undefined }) }} className="flex flex-col gap-3">
      <label className="flex flex-col text-[13px] font-semibold">Nome<input autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={field} /></label>
      <label className="flex flex-col text-[13px] font-semibold">Descrição<input value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className={field} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-[13px] font-semibold">Tipo
          <select value={v.kind ?? 'avulso'} onChange={(e) => setV({ ...v, kind: e.target.value as QuotePreset['kind'] })} className={field}>
            <option value="avulso">Avulso</option><option value="plano">Plano mensal</option><option value="evento">Evento</option><option value="projeto">Projeto</option>
          </select>
        </label>
        {v.kind === 'plano' && <label className="flex flex-col text-[13px] font-semibold">Meses<input inputMode="numeric" value={v.monthsText} onChange={(e) => setV({ ...v, monthsText: e.target.value.replace(/\D/g, '') })} className={field} /></label>}
      </div>
      <p className="rounded-xl bg-raised px-3 py-2 text-[13px] text-muted">Configura: {presetSummary(v)}. Para mudar a montagem, aplique o pacote num orçamento, ajuste e salve como pacote de novo.</p>
      <Actions busy={busy} onCancel={onCancel} disabled={v.name.trim().length < 2} />
    </form>
  )
}
