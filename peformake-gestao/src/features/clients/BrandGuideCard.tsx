// Guia da marca: cartão curto que quem executa lê antes de produzir (ficha do cliente, peça, Design, audiovisual, tráfego).
// "Ver tudo" abre o guia por partes (abas, sem rolagem); cada parte se edita num pop-up próprio; "PDF" imprime na identidade
// verde-limão/branco/preto. "Montar guia com IA" preenche o que ninguém editou (o editado pela equipe vale mais).
import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, FileDown, Pencil, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { DialogTabs } from '@/components/ui/DialogTabs'
import { cn } from '@/lib/cn'
import { logoPublicUrl } from './clientsApi'
import { brandGuideKey, buildGuideWithAi, saveGuideSection, useBrandGuide } from './brandGuideApi'
import { printGuide } from './brandGuidePrint'
import {
  focusLines, GUIDE_SECTIONS, guideFill, inkOn, linesToList, listToLines, normalizeHex, resolveGuide, sectionFilled,
  type BrandGuide, type GuideColor, type GuideFocus, type GuideSection,
} from './brandGuideRules'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'
const lbl = 'mb-1 block text-[13px] font-semibold'

function Swatches({ colors, size = 'sm' }: { colors: GuideColor[]; size?: 'sm' | 'md' }) {
  if (!colors.length) return null
  return (
    <ul aria-label="Cores da marca" className="flex flex-wrap gap-1.5">
      {colors.slice(0, 6).map((c) => (
        <li key={c.hex + c.nome} title={`${c.nome} ${c.hex}${c.uso ? ' · ' + c.uso : ''}`}
          className={cn('flex items-center rounded-full border border-line font-mono font-semibold', size === 'md' ? 'h-8 px-2.5 text-[11.5px]' : 'h-6 px-2 text-[10.5px]')}
          style={{ background: c.hex, color: inkOn(c.hex) }}>{c.hex}</li>
      ))}
    </ul>
  )
}

/** Cartão compacto. `focus` escolhe as 3 linhas que importam para quem está na tela. */
export function BrandGuideCard({ clientId, focus = 'geral', className }: { clientId: string | null | undefined; focus?: GuideFocus; className?: string }) {
  const q = useBrandGuide(clientId)
  const [open, setOpen] = useState(false)
  const ai = useBuildGuide(clientId ?? '')
  if (!clientId || !q.data) return null
  const g = resolveGuide(q.data)
  const fill = guideFill(g)
  const lines = focusLines(g, focus)
  const name = q.data.client.name
  return (
    <section aria-label="Guia da marca" className={cn('flex min-w-0 flex-col gap-2.5 rounded-3xl border border-line bg-surface p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-semibold"><BookOpen size={16} aria-hidden="true" className="text-accent-ink" /> Guia da marca</h2>
        <span className="text-[12px] text-muted tabular-nums">{fill}% pronto</span>
      </div>
      <Swatches colors={g.visual.cores} />
      {lines.length > 0 ? (
        <dl className="flex flex-col gap-1 text-[13.5px]">
          {lines.map((l) => (
            <div key={l.label} className="flex min-w-0 gap-1.5"><dt className="shrink-0 font-semibold">{l.label}:</dt><dd className="line-clamp-2 min-w-0 text-muted">{l.text}</dd></div>
          ))}
        </dl>
      ) : (
        <p className="text-[13px] text-muted">Ainda sem guia. A IA monta em segundos com o que o sistema já sabe.</p>
      )}
      {ai.isError && <p role="alert" className="text-[12.5px] font-medium text-warn-ink">{(ai.error as Error).message}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {fill > 0 && <Button variant="secondary" onClick={() => setOpen(true)}>Ver tudo</Button>}
        {fill < 80 && (
          <Button variant={fill > 0 ? 'secondary' : 'primary'} disabled={ai.isPending} onClick={() => ai.mutate()}>
            <Sparkles size={15} aria-hidden="true" /> {ai.isPending ? 'Montando' : fill > 0 ? 'Completar com IA' : 'Montar guia com IA'}
          </Button>
        )}
        {fill > 0 && (
          <button type="button" aria-label="Baixar o guia em PDF" onClick={() => printGuide(name, g, logoPublicUrl(q.data!.client.logo_path))}
            className="grid size-11 cursor-pointer place-items-center rounded-full text-muted hover:bg-raised hover:text-ink md:size-10"><FileDown size={17} aria-hidden="true" /></button>
        )}
      </div>
      {open && <GuideDialog clientId={clientId} onClose={() => setOpen(false)} start={focus === 'audiovisual' ? 'audiovisual' : focus === 'design' || focus === 'trafego' ? 'design' : focus === 'social' ? 'voz' : 'posicionamento'} />}
    </section>
  )
}

function useBuildGuide(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => buildGuideWithAi(clientId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: brandGuideKey(clientId) }); void qc.invalidateQueries({ queryKey: ['ai-spend'] }) },
  })
}

function Txt({ children, lines = 2 }: { children: ReactNode; lines?: 1 | 2 | 3 }) {
  return <p className={cn('text-[14px] text-muted', lines === 1 ? 'line-clamp-1' : lines === 2 ? 'line-clamp-2' : 'line-clamp-3')}>{children}</p>
}
function Item({ k, v, lines = 2 }: { k: string; v: string; lines?: 1 | 2 | 3 }) {
  if (!v) return null
  return <div className="min-w-0"><p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{k}</p><Txt lines={lines}>{v}</Txt></div>
}
function Bullets({ items, max = 4, two = false }: { items: string[]; max?: number; two?: boolean }) {
  if (!items.length) return null
  return <ul className="flex flex-col gap-1 text-[14px]">{items.slice(0, max).map((x) => <li key={x} className={cn(two ? 'line-clamp-2 leading-snug' : 'line-clamp-1', "before:mr-1.5 before:text-accent-ink before:content-['•']")}>{x}</li>)}</ul>
}

function SectionView({ g, id }: { g: BrandGuide; id: GuideSection }) {
  if (!sectionFilled(g, id)) return <p className="text-[14px] text-muted">Esta parte ainda está vazia. Edite ou monte com IA.</p>
  if (id === 'posicionamento') return (
    <div className="flex flex-col gap-3">
      {g.posicionamento.frase && <p className="line-clamp-3 border-l-4 border-accent pl-3 text-[16px] font-semibold leading-snug">{g.posicionamento.frase}</p>}
      {g.posicionamento.passar.length > 0 && <div><p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Toda peça precisa passar</p><Bullets items={g.posicionamento.passar} max={5} /></div>}
    </div>
  )
  if (id === 'visual') return (
    <div className="flex flex-col gap-3">
      <Swatches colors={g.visual.cores} size="md" />
      {(g.visual.fontes.titulo || g.visual.fontes.apoio) && <Item k="Fontes" v={[g.visual.fontes.titulo && `Título: ${g.visual.fontes.titulo}`, g.visual.fontes.apoio && `Apoio: ${g.visual.fontes.apoio}`].filter(Boolean).join(' · ')} lines={1} />}
      <Item k="Logo" v={g.visual.logo} />
      <Item k="Foto" v={g.visual.foto} />
      <Item k="Vídeo" v={g.visual.video} />
    </div>
  )
  if (id === 'voz') return (
    <div className="flex flex-col gap-3">
      {g.voz.essencia && <Txt>{g.voz.essencia}</Txt>}
      {g.voz.tom.length > 0 && (
        <ul className="flex flex-col gap-1">
          {g.voz.tom.slice(0, 3).map((t) => <li key={t.adjetivo} className="line-clamp-1 text-[14px]"><b>{t.adjetivo}</b> <span className="text-muted">“{t.exemplo}”</span></li>)}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0"><p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ok-ink">Usar</p><Bullets items={g.voz.usar} max={3} two /></div>
        <div className="min-w-0"><p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-warn-ink">Evitar</p><Bullets items={g.voz.evitar} max={3} two /></div>
      </div>
      {g.voz.regra_teste && <p className="line-clamp-2 rounded-2xl bg-fill px-3 py-2 text-[13px] font-medium text-on-fill">{g.voz.regra_teste}</p>}
    </div>
  )
  if (id === 'design') return (
    <div className="flex flex-col gap-3">
      <Item k="Layout" v={g.design.layout} />
      <Item k="Hierarquia" v={g.design.hierarquia} />
      <Item k="Oferta e preço" v={g.design.ofertas} />
      <Item k="Chamada para ação" v={g.design.cta} />
    </div>
  )
  return (
    <div className="flex flex-col gap-3">
      {g.audiovisual.mostrar.length > 0 && <div><p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">A captação precisa mostrar</p><Bullets items={g.audiovisual.mostrar} max={3} /></div>}
      <Item k="Apresentador" v={g.audiovisual.apresentador} />
      {g.audiovisual.roteiro.length > 0 && (
        <div><p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Roteiro-base</p>
          <ol className="flex flex-col gap-1 text-[14px]">{g.audiovisual.roteiro.slice(0, 5).map((x, i) => <li key={x} className="line-clamp-1"><b className="mr-1 tabular-nums text-accent-ink">{i + 1}.</b>{x}</li>)}</ol>
        </div>
      )}
    </div>
  )
}

/** O guia inteiro, por partes (abas). Nenhuma aba rola: o texto longo fica no PDF. */
export function GuideDialog({ clientId, onClose, start = 'posicionamento' }: { clientId: string; onClose: () => void; start?: GuideSection }) {
  const q = useBrandGuide(clientId)
  const [tab, setTab] = useState<GuideSection>(start)
  const [editing, setEditing] = useState<GuideSection | null>(null)
  const ai = useBuildGuide(clientId)
  if (!q.data) return null
  const g = resolveGuide(q.data)
  const edited = q.data.edited.includes(tab)
  return (
    <>
      <Dialog open onClose={onClose} title={`Guia da marca · ${q.data.client.name}`} description={edited ? 'Esta parte foi revisada pela equipe.' : q.data.ai_at ? 'Montado pela IA. Revise e ajuste.' : 'A partir do cadastro e do diagnóstico.'}
        footer={<>
          {ai.isError && <p role="alert" className="mr-auto self-center text-[12.5px] font-medium text-warn-ink">{(ai.error as Error).message}</p>}
          <Button variant="secondary" onClick={() => printGuide(q.data!.client.name, g, logoPublicUrl(q.data!.client.logo_path))}><FileDown size={15} aria-hidden="true" /> PDF</Button>
          {!q.data.edited.includes(tab) && <Button variant="secondary" disabled={ai.isPending} onClick={() => ai.mutate()}><Sparkles size={15} aria-hidden="true" /> {ai.isPending ? 'Montando' : 'Refazer com IA'}</Button>}
          <Button onClick={() => setEditing(tab)}><Pencil size={15} aria-hidden="true" /> Editar</Button>
        </>}>
        <div className="flex flex-col gap-4">
          <DialogTabs value={tab} onChange={setTab} options={GUIDE_SECTIONS.map((s) => ({ id: s.id, label: s.short }))} label="Partes do guia" />
          <SectionView g={g} id={tab} />
        </div>
      </Dialog>
      {editing && <SectionEditor clientId={clientId} section={editing} guide={g} onClose={() => setEditing(null)} />}
    </>
  )
}

type Draft = Record<string, string>
function draftOf(g: BrandGuide, s: GuideSection): Draft {
  if (s === 'posicionamento') return { frase: g.posicionamento.frase, passar: listToLines(g.posicionamento.passar) }
  if (s === 'visual') return {
    cores: g.visual.cores.map((c) => [c.hex, c.nome, c.uso].join(' | ')).join('\n'),
    titulo: g.visual.fontes.titulo, apoio: g.visual.fontes.apoio, nota: g.visual.fontes.nota, logo: g.visual.logo, foto: g.visual.foto, video: g.visual.video,
  }
  if (s === 'voz') return { essencia: g.voz.essencia, tom: g.voz.tom.map((t) => `${t.adjetivo}: ${t.exemplo}`).join('\n'), usar: listToLines(g.voz.usar), evitar: listToLines(g.voz.evitar), regra_teste: g.voz.regra_teste }
  if (s === 'design') return { ...g.design }
  return { mostrar: listToLines(g.audiovisual.mostrar), apresentador: g.audiovisual.apresentador, roteiro: listToLines(g.audiovisual.roteiro) }
}
function dataOf(d: Draft, s: GuideSection): Record<string, unknown> {
  const t = (k: string) => (d[k] ?? '').trim()
  if (s === 'posicionamento') return { frase: t('frase'), passar: linesToList(d.passar ?? '') }
  if (s === 'visual') return {
    cores: linesToList(d.cores ?? '').map((line) => { const [hex, nome, uso] = line.split('|').map((x) => x.trim()); return { hex: normalizeHex(hex) ?? '', nome: nome ?? '', uso: uso ?? '' } }).filter((c) => c.hex),
    fontes: { titulo: t('titulo'), apoio: t('apoio'), nota: t('nota') }, logo: t('logo'), foto: t('foto'), video: t('video'),
  }
  if (s === 'voz') return {
    essencia: t('essencia'), regra_teste: t('regra_teste'), usar: linesToList(d.usar ?? ''), evitar: linesToList(d.evitar ?? ''),
    tom: linesToList(d.tom ?? '').map((line) => { const i = line.indexOf(':'); return i > 0 ? { adjetivo: line.slice(0, i).trim(), exemplo: line.slice(i + 1).trim() } : { adjetivo: line, exemplo: '' } }),
  }
  if (s === 'design') return { layout: t('layout'), hierarquia: t('hierarquia'), ofertas: t('ofertas'), cta: t('cta') }
  return { mostrar: linesToList(d.mostrar ?? ''), apresentador: t('apresentador'), roteiro: linesToList(d.roteiro ?? '') }
}

type F = { k: string; label: string; rows: number; hint?: string }
// Etapas de cada parte (no máximo 2, para nenhum passo rolar).
const FORM: Record<GuideSection, { id: string; label: string; fields: F[] }[]> = {
  posicionamento: [{ id: 'a', label: 'Posicionamento', fields: [
    { k: 'frase', label: 'O que a marca quer que pensem dela', rows: 3 },
    { k: 'passar', label: 'O que toda peça precisa passar', rows: 5, hint: 'Um por linha' }] }],
  visual: [
    { id: 'a', label: 'Cores e fontes', fields: [
      { k: 'cores', label: 'Cores', rows: 5, hint: 'Uma por linha: #HEX | nome | uso' },
      { k: 'titulo', label: 'Fonte de título', rows: 1 }, { k: 'apoio', label: 'Fonte de apoio', rows: 1 }] },
    { id: 'b', label: 'Logo, foto e vídeo', fields: [
      { k: 'logo', label: 'Uso do logo', rows: 2 }, { k: 'foto', label: 'Estilo de foto (luz, ambiente, enquadramento)', rows: 3 }, { k: 'video', label: 'Estilo de vídeo', rows: 3 }] },
  ],
  voz: [
    { id: 'a', label: 'Voz', fields: [
      { k: 'essencia', label: 'Essência', rows: 2 }, { k: 'tom', label: 'Tom', rows: 4, hint: 'Um por linha: Adjetivo: frase de exemplo' }, { k: 'regra_teste', label: 'Regra-teste', rows: 2 }] },
    { id: 'b', label: 'Copy', fields: [
      { k: 'usar', label: 'Palavras e expressões para usar', rows: 5, hint: 'Uma por linha' }, { k: 'evitar', label: 'O que evitar', rows: 5, hint: 'Uma por linha' }] },
  ],
  design: [{ id: 'a', label: 'Design e copy', fields: [
    { k: 'layout', label: 'Layout', rows: 2 }, { k: 'hierarquia', label: 'Hierarquia (o que se lê primeiro)', rows: 2 },
    { k: 'ofertas', label: 'Oferta e preço', rows: 2 }, { k: 'cta', label: 'Chamada para ação', rows: 2 }] }],
  audiovisual: [
    { id: 'a', label: 'Captação', fields: [
      { k: 'mostrar', label: 'A captação precisa mostrar', rows: 5, hint: 'Um por linha' }, { k: 'apresentador', label: 'Como o apresentador fala e se porta', rows: 3 }] },
    { id: 'b', label: 'Roteiro-base', fields: [{ k: 'roteiro', label: 'Roteiro-base', rows: 7, hint: 'Um passo por linha' }] },
  ],
}

function SectionEditor({ clientId, section, guide, onClose }: { clientId: string; section: GuideSection; guide: BrandGuide; onClose: () => void }) {
  const qc = useQueryClient()
  const steps = FORM[section]
  const [step, setStep] = useState(steps[0]!.id)
  const [draft, setDraft] = useState<Draft>(() => draftOf(guide, section))
  const save = useMutation({
    mutationFn: () => saveGuideSection(clientId, section, dataOf(draft, section)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: brandGuideKey(clientId) }); onClose() },
  })
  const at = steps.findIndex((s) => s.id === step)
  const cur = steps[at]!
  const title = GUIDE_SECTIONS.find((s) => s.id === section)!.label
  return (
    <Dialog open onClose={onClose} title={`Editar · ${title}`} description="O que você salvar aqui vale mais que a IA."
      footer={<>
        {save.isError && <p role="alert" className="mr-auto self-center text-[12.5px] font-medium text-warn-ink">Não salvou. Tente de novo.</p>}
        {at > 0 && <Button variant="secondary" onClick={() => setStep(steps[at - 1]!.id)}>Voltar</Button>}
        {at < steps.length - 1 && <Button variant="secondary" onClick={() => setStep(steps[at + 1]!.id)}>Próximo</Button>}
        <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar'}</Button>
      </>}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        {steps.length > 1 && <DialogTabs steps value={step} onChange={setStep} options={steps} label="Etapas do guia" />}
        {cur.fields.map((f) => (
          <div key={f.k}>
            <label htmlFor={`bg-${f.k}`} className={lbl}>{f.label}{f.hint && <span className="ml-1 font-normal text-muted">({f.hint})</span>}</label>
            {f.rows === 1
              ? <input id={`bg-${f.k}`} autoComplete="off" maxLength={200} value={draft[f.k] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [f.k]: e.target.value }))} className={field} />
              : <textarea id={`bg-${f.k}`} rows={f.rows} maxLength={3000} value={draft[f.k] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [f.k]: e.target.value }))} className={cn(field, 'resize-none')} />}
          </div>
        ))}
      </form>
    </Dialog>
  )
}

/** Atalho de um toque para o guia (fila do Design, tarefa de criativo, briefing da peça). */
export function GuideButton({ clientId, start = 'design', className }: { clientId: string; start?: GuideSection; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={cn('inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-[12.5px] font-medium text-accent-ink hover:bg-raised', className)}>
        <BookOpen size={14} aria-hidden="true" /> Guia da marca
      </button>
      {open && <GuideDialog clientId={clientId} start={start} onClose={() => setOpen(false)} />}
    </>
  )
}
