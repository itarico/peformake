// O plano do mês em 12 seções (decisão do Italo, 13/11). As estratégicas (mercado, estratégia, plano de ação, ideias) vão para todo
// cliente; as de área só para quem contrata. Cada tela de área mostra só as suas seções. Tudo vem de monthly_strategies.doc.plano.
import { AREA, type ActionArea, type MonthlyAction } from './monthlyRules'

type Any = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export type SectionId = 'mercado' | 'estrategia' | 'acao' | 'trafego' | 'design' | 'social' | 'audiovisual' | 'vendas' | 'consultoria' | 'm360' | 'offline' | 'ideias'
export type PlanScope = 'tudo' | 'trafego' | 'social' | 'audiovisual'

export const SECTIONS: { id: SectionId; label: string; n: number }[] = [
  { id: 'mercado', label: 'Mercado', n: 1 },
  { id: 'estrategia', label: 'Estratégia', n: 2 },
  { id: 'acao', label: 'Plano de ação', n: 3 },
  { id: 'trafego', label: 'Tráfego', n: 4 },
  { id: 'design', label: 'Design', n: 5 },
  { id: 'social', label: 'Social media', n: 6 },
  { id: 'audiovisual', label: 'Audiovisual', n: 7 },
  { id: 'vendas', label: 'Vendas e ofertas', n: 8 },
  { id: 'consultoria', label: 'Consultoria', n: 9 },
  { id: 'm360', label: 'Marketing 360', n: 10 },
  { id: 'offline', label: 'Off-line', n: 11 },
  { id: 'ideias', label: 'Ideias', n: 12 },
]

/** Seções de cada tela (a primeira abre). */
export const SCOPE_SECTIONS: Record<PlanScope, SectionId[]> = {
  tudo: SECTIONS.map((s) => s.id),
  trafego: ['trafego', 'acao', 'vendas', 'mercado'],
  social: ['social', 'design', 'acao', 'ideias', 'mercado'],
  audiovisual: ['audiovisual', 'acao', 'ideias'],
}

/** Áreas das ações (as que se aprovam) de cada seção e de cada tela. */
export const SECTION_AREAS: Partial<Record<SectionId, ActionArea[]>> = {
  trafego: ['trafego'], design: ['design'], social: ['social'], audiovisual: ['audiovisual'], vendas: ['vendas', 'atendimento'],
}
export const SCOPE_AREAS: Record<PlanScope, ActionArea[]> = {
  tudo: ['trafego', 'social', 'design', 'audiovisual', 'vendas', 'atendimento'], trafego: ['trafego'], social: ['social', 'design'], audiovisual: ['audiovisual'],
}
/** Seção do Plano de execução (PDF) de cada tela. */
export const SCOPE_PDF_SECTION: Record<PlanScope, SectionId | null> = { tudo: null, trafego: 'trafego', social: 'social', audiovisual: 'audiovisual' }

export interface PlanCard { key: string; title: string; tag?: string; lines: string[]; detail: string }

const arr = (v: unknown): Any[] => (Array.isArray(v) ? (v as Any[]) : [])
const str = (v: unknown) => String(v ?? '').trim()
const join = (xs: unknown[], sep = '\n') => xs.map(str).filter(Boolean).join(sep)
const card = (key: string, title: string, lines: unknown[], detail?: unknown[], tag?: string): PlanCard | null => {
  const l = lines.map(str).filter(Boolean)
  if (!str(title) && !l.length) return null
  return { key, title: str(title), tag, lines: l.slice(0, 3), detail: join(detail ?? lines, '\n\n') }
}
const keep = (xs: (PlanCard | null)[]) => xs.filter((x): x is PlanCard => !!x)
const dmy = (iso: unknown) => { const s = str(iso); return /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : s }
const FORMATO: Record<string, string> = { carrossel: 'Carrossel', post: 'Post', reels: 'Reels', story: 'Story', anuncio: 'Anúncio' }

/** Cartões de uma seção (resumo curto + texto completo em "Ver detalhes"). Seção vazia devolve []. */
export function sectionCards(doc: Any | null | undefined, id: SectionId, scope: PlanScope = 'tudo'): PlanCard[] {
  const p = (doc?.plano ?? {}) as Any
  const cal = (p.calendario ?? {}) as Any
  const pecas = arr(cal.pecas)
  switch (id) {
    case 'mercado': {
      const dm = (p.diagnostico_mercado ?? {}) as Any
      const pq = (p.pesquisa ?? {}) as Any
      return keep([
        dm.resumo ? card('resumo', 'O que mudou', [dm.resumo]) : null,
        ...arr(dm.pontos).map((x, i) => card(`p${i}`, str(x.fato).slice(0, 90), [x.implicacao], [x.fato, x.implicacao && `O que muda: ${x.implicacao}`, x.link])),
        arr(pq.concorrentes).length ? card('conc', 'Concorrentes agora', arr(pq.concorrentes).slice(0, 3).map((c) => `${str(c.nome)}: ${str(c.o_que_faz_agora)}`),
          arr(pq.concorrentes).map((c) => join([`${str(c.nome)}: ${str(c.o_que_faz_agora)}`, c.numeros, c.como_usamos && `Como usamos: ${str(c.como_usamos)}`, c.link]))) : null,
        arr(pq.tendencias).length ? card('tend', 'Tendências do mês', arr(pq.tendencias).slice(0, 3).map((t) => str(t.tendencia)),
          arr(pq.tendencias).map((t) => join([`${str(t.tendencia)} (${str(t.plataforma)})`, t.numeros, t.por_que_serve && `Por que serve: ${str(t.por_que_serve)}`, t.ideia && `Ideia: ${str(t.ideia)}`, t.link]))) : null,
      ])
    }
    case 'estrategia': {
      const t = (p.tese ?? {}) as Any
      return keep([
        doc?.titulo ? card('titulo', str(doc.titulo), [doc.foco, doc.situacao], [doc.titulo, doc.situacao, doc.foco && `Aposta: ${str(doc.foco)}`]) : null,
        doc?.meta?.numero || doc?.meta?.texto ? card('meta', 'Meta do mês', [doc.meta.numero, doc.meta.texto], [doc.meta.texto, doc.meta.numero, doc.meta.como_medir && `Como medir: ${str(doc.meta.como_medir)}`]) : null,
        t.posicionamento ? card('tese', 'Tese e posicionamento', [t.posicionamento], [t.posicionamento, t.percepcao && `Percepção: ${str(t.percepcao)}`, t.porque && `Por quê: ${str(t.porque)}`, t.venda && `Venda: ${str(t.venda)}`, t.autoridade && `Autoridade: ${str(t.autoridade)}`]) : null,
        arr(p.mix).length ? card('mix', 'Mix de conteúdo', [arr(p.mix).map((m) => `${str(m.objetivo)} ${m.percentual}%`).join(' · ')], arr(p.mix).map((m) => `${str(m.objetivo)} ${m.percentual}%: ${str(m.papel)}`)) : null,
        ...arr(p.ofertas).map((o, i) => card(`of${i}`, `Oferta: ${str(o.nome)}`, [o.condicao, o.preco_e_ancora], [o.para_quem && `Para quem: ${str(o.para_quem)}`, o.o_que_inclui && `Inclui: ${str(o.o_que_inclui)}`, o.condicao && `Condição: ${str(o.condicao)}`, o.preco_e_ancora && `Preço: ${str(o.preco_e_ancora)}`, o.validade && `Validade: ${str(o.validade)}`, o.canal && `Canal: ${str(o.canal)}`, o.porque && `Por quê: ${str(o.porque)}`])),
      ])
    }
    case 'acao': {
      const areas = scope === 'tudo' ? null : [...SCOPE_AREAS[scope], 'cliente', 'consultoria']
      const rows = arr(p.plano_acao).filter((r) => !areas || areas.includes(str(r.area)) || scope === 'tudo')
      const temas = arr(doc?.semanas)
      const weeks = [1, 2, 3, 4].map((w) => {
        const rs = rows.filter((r) => Number(r.semana) === w)
        const tema = temas.find((x) => Number(x.semana) === w)?.tema
        const kpi = arr(p.semanas_plano).find((x) => Number(x.semana) === w)
        if (!rs.length && !kpi) return null
        return card(`s${w}`, `Semana ${w}${tema ? ` · ${str(tema)}` : ''}`,
          rs.length ? rs.slice(0, 3).map((r) => `${str(r.acao)} · ${str(r.kpi)}: ${str(r.ponto_de_partida)} → ${str(r.meta)}`) : [kpi?.kpi && `${str(kpi.kpi)}: ${str(kpi.meta)}`],
          [kpi ? `Intenção: ${str(kpi.intencao)}\nKPI da semana: ${str(kpi.kpi)} → ${str(kpi.meta)}` : '', ...rs.map((r) => `${str(r.acao)}\nResponsável: ${str(r.responsavel)} · prazo ${str(r.prazo)}\n${str(r.kpi)}: ${str(r.ponto_de_partida)} → ${str(r.meta)}`)])
      })
      const ask = arr(p.pedir_cliente)
      return keep([...weeks, ask.length ? card('cliente', 'O que pedir ao cliente', ask.slice(0, 3).map((x) => `${str(x.item)} (até ${str(x.ate)})`), ask.map((x) => `${str(x.item)} (até ${str(x.ate)}): ${str(x.porque)}`)) : null])
    }
    case 'trafego': {
      const t = p.trafego as Any | null
      if (!t) return []
      return keep([
        card('resumo', 'A lógica do mês', [t.resumo, t.verba_mes && `Verba: ${str(t.verba_mes)}`]),
        arr(t.divisao).length ? card('verba', 'Divisão da verba', arr(t.divisao).slice(0, 3).map((d) => `${str(d.campanha)}: ${d.percentual}% (${str(d.verba_dia)}/dia)`), arr(t.divisao).map((d) => `${str(d.campanha)}: ${d.percentual}% · ${str(d.verba_dia)}/dia\n${str(d.objetivo)} · ${str(d.porque)}`)) : null,
        ...arr(t.campanhas).map((c, i) => card(`c${i}`, `Campanha: ${str(c.nome)}`, [`${str(c.objetivo)} → ${str(c.destino)}`, `${arr(c.conjuntos).length} conjuntos`],
          [`Objetivo: ${str(c.objetivo)} · destino: ${str(c.destino)}`, ...arr(c.conjuntos).map((s) => `Conjunto "${str(s.nome)}"\nPúblico: ${str(s.publico)}\nVerba: ${str(s.verba_dia)}/dia\nCriativos: ${arr(s.criativos).map(str).join(', ')}`), `Corte: ${str(c.corte)}`, `Escala: ${str(c.escala)}`])),
        arr(t.kpis_semana).length ? card('kpis', 'KPIs por semana', arr(t.kpis_semana).slice(0, 4).map((k) => `S${k.semana}: ${str(k.kpi)} ${str(k.meta)}`), arr(t.kpis_semana).map((k) => `Semana ${k.semana}: ${str(k.kpi)} → ${str(k.meta)}`)) : null,
        arr(t.testes).length ? card('testes', 'Testes A/B', arr(t.testes).slice(0, 3).map((x) => str(x.hipotese)), arr(t.testes).map((x) => `${str(x.hipotese)}\nComo: ${str(x.como)}\nMétrica: ${str(x.metrica)} · prazo ${str(x.prazo)}`)) : null,
      ])
    }
    case 'design': {
      const d = p.design as Any | null
      const vis = (p.marca?.visual ?? null) as Any | null
      if (!d && !vis) return []
      return keep([
        d?.ideia_visual ? card('ideia', 'Ideia visual do mês', [d.ideia_visual], [d.ideia_visual, ...arr(d.nao_fazer).map((x) => `Não fazer: ${str(x)}`)]) : null,
        d?.identidade_aplicada ? card('id', 'Identidade aplicada', [d.identidade_aplicada.cores, d.identidade_aplicada.tipografia], [`Cores: ${str(d.identidade_aplicada.cores)}`, `Tipografia: ${str(d.identidade_aplicada.tipografia)}`, `Imagem: ${str(d.identidade_aplicada.imagem)}`, `Elementos fixos: ${str(d.identidade_aplicada.elementos_fixos)}`])
          : vis ? card('id', 'Marca aplicada', [vis.ideia_central, vis.cores], [vis.ideia_central, `Cores: ${str(vis.cores)}`, `Tipografia: ${str(vis.tipografia)}`, `Fotografia: ${str(vis.fotografia)}`, `Elementos: ${str(vis.elementos)}`, ...arr(vis.nao_fazer).map((x) => `Não fazer: ${str(x)}`)]) : null,
        ...arr(d?.layouts).map((l, i) => card(`l${i}`, `Layout: ${str(l.nome)}`, [l.uso], [l.estrutura, l.uso && `Usar em: ${str(l.uso)}`])),
        arr(d?.pecas_chave).length ? card('chave', 'Peças-chave', arr(d!.pecas_chave).slice(0, 3).map((x) => `${str(x.peca_id)}: ${str(x.por_que)}`), arr(d!.pecas_chave).map((x) => `${str(x.peca_id)}: ${str(x.por_que)}\nLayout: ${str(x.layout)}\nCuidado: ${str(x.cuidado)}`)) : null,
      ])
    }
    case 'social': {
      if (!pecas.length && !arr(p.series).length) return []
      const weeks = [1, 2, 3, 4].map((w) => {
        const list = pecas.filter((x) => Math.min(4, Math.floor((Number(str(x.data).slice(8, 10)) - 1) / 7) + 1) === w)
        if (!list.length) return null
        return card(`w${w}`, `Semana ${w} · ${list.length} peças`, list.slice(0, 3).map((x) => `${dmy(x.data)} ${FORMATO[x.formato] ?? x.formato}: ${str(x.titulo)}`),
          list.map((x) => `${dmy(x.data)} · ${FORMATO[x.formato] ?? str(x.formato)}${x.serie ? ` · ${str(x.serie)}` : ''}: ${str(x.titulo)}\n${str(x.ideia)}${x.copy?.legenda ? `\n\nLegenda:\n${str(x.copy.legenda)}` : ''}`))
      })
      return keep([
        cal.ritmo ? card('ritmo', 'Ritmo do mês', [cal.ritmo]) : null,
        arr(p.series).length ? card('series', 'Séries de conteúdo', arr(p.series).slice(0, 3).map((x) => `${str(x.codigo)} ${str(x.nome)} · ${str(x.frequencia)}`), arr(p.series).map((x) => `${str(x.codigo)} ${str(x.nome)} (${str(x.formato)}, ${str(x.frequencia)})\n${str(x.o_que_e)}\nEpisódios: ${arr(x.episodios).map(str).join(' · ')}`)) : null,
        ...weeks,
        arr(cal.stories_rotina).length ? card('stories', 'Stories', arr(cal.stories_rotina).slice(0, 3).map((x) => `${str(x.dia)}: ${str(x.quadro)}`), arr(cal.stories_rotina).map((x) => `${str(x.dia)} · ${str(x.quadro)}: ${str(x.sequencia)}`)) : null,
        p.marca?.copy ? card('copy', 'Regras de texto', [p.marca.copy.tom], [`Tom: ${str(p.marca.copy.tom)}`, `Usar: ${arr(p.marca.copy.usar).map(str).join(', ')}`, `Evitar: ${[...arr(p.marca.copy.evitar), ...arr(p.marca.copy.palavras_proibidas)].map(str).join(', ')}`]) : null,
      ])
    }
    case 'audiovisual': {
      const caps = arr(cal.capturas)
      const reels = pecas.filter((x) => x.formato === 'reels')
      if (!caps.length && !reels.length) return []
      return keep([
        ...caps.map((c, i) => card(`cap${i}`, `Captação ${dmy(c.data)} · ${str(c.onde)}`, [c.quem_apresenta ? `Apresenta: ${str(c.quem_apresenta)}` : c.quem && `Quem: ${str(c.quem)}`, `${arr(c.o_que_gravar).length} cenas · peças ${arr(c.pecas).map(str).join(', ')}`],
          [`Data: ${dmy(c.data)} · local: ${str(c.onde)}`, `Quem aparece: ${str(c.quem)}`, c.quem_apresenta && `Quem apresenta: ${str(c.quem_apresenta)}`, `Lista de cenas:\n${arr(c.o_que_gravar).map((x, k) => `${k + 1}. ${str(x)}`).join('\n')}`, `Peças: ${arr(c.pecas).map(str).join(', ')}`])),
        reels.length ? card('reels', `${reels.length} vídeos no mês`, reels.slice(0, 3).map((x) => `${dmy(x.data)}: ${str(x.titulo)}`), reels.map((x) => `${dmy(x.data)} · ${str(x.titulo)}\n${str(x.ideia)}`)) : null,
      ])
    }
    case 'vendas': {
      const v = p.vendas as Any | null
      if (!v) return []
      const f = (v.funil ?? null) as Any | null
      return keep([
        ...arr(v.ofertas).map((o, i) => card(`of${i}`, `Oferta: ${str(o.nome)}`, [`${str(o.preco)} · ${str(o.escassez_prazo)}`, o.ancora_concorrente && `Âncora: ${str(o.ancora_concorrente)}`],
          [`Para quem: ${str(o.para_quem)}`, `Inclui: ${str(o.o_que_inclui)}`, `Preço: ${str(o.preco)}`, `Âncora: ${str(o.ancora_concorrente)}`, `Prazo/escassez: ${str(o.escassez_prazo)}`, `Garantia: ${str(o.garantia)}`, `Canal: ${str(o.canal)}`])),
        f ? card('funil', 'Funil e metas', [`${str(f.leads)} leads → ${str(f.conversas)} conversas → ${str(f.vendas)} vendas`, `Receita: ${str(f.receita_meta)}`],
          [`Leads: ${str(f.leads)}`, `Conversas: ${str(f.conversas)}`, `Vendas: ${str(f.vendas)}`, `Ticket médio: ${str(f.ticket_medio)}`, `Receita: ${str(f.receita_meta)}`, `Premissas: ${str(f.premissas_conversao)}`]) : null,
        v.sla ? card('sla', 'Atendimento (SLA)', [`Primeira resposta: ${str(v.sla.primeira_resposta)}`, str(v.sla.quem_responde)], [`Primeira resposta: ${str(v.sla.primeira_resposta)}`, `Quem responde: ${str(v.sla.quem_responde)}`, `Horário: ${str(v.sla.horario)}`, str(v.sla.regra)]) : null,
        card('caminho', 'Caminho até a venda', [v.caminho]),
        arr(v.script).length ? card('script', 'Roteiro de WhatsApp', arr(v.script).slice(0, 3).map((x) => str(x.etapa)), arr(v.script).map((x) => `${str(x.etapa)}:\n"${str(x.mensagem)}"`)) : null,
        arr(v.follow_up).length ? card('fu', 'Follow-up', arr(v.follow_up).slice(0, 3).map((x) => str(x.quando)), arr(v.follow_up).map((x) => `${str(x.quando)}:\n"${str(x.mensagem)}"`)) : null,
        arr(v.objecoes).length ? card('obj', 'Objeções', arr(v.objecoes).slice(0, 3).map((x) => `"${str(x.objecao)}"`), arr(v.objecoes).map((x) => `"${str(x.objecao)}" (${str(x.de_onde)})\nResposta: ${str(x.resposta)}`)) : null,
        arr(v.upsell).length ? card('up', 'Upsell e cross-sell', arr(v.upsell).slice(0, 3).map((x) => str(x.oferta)), arr(v.upsell).map((x) => `${str(x.quando)}: ${str(x.oferta)}\n"${str(x.mensagem)}"`)) : null,
        arr(v.reativacao).length ? card('reat', 'Reativação', arr(v.reativacao).slice(0, 3).map((x) => `${str(x.publico)}: ${str(x.oferta)}`), arr(v.reativacao).map((x) => `${str(x.publico)}: ${str(x.oferta)}\n"${str(x.mensagem)}"`)) : null,
        arr(v.indicacao_parcerias).length ? card('ind2', 'Indicação e parcerias', arr(v.indicacao_parcerias).slice(0, 3).map((x) => str(x.acao)), arr(v.indicacao_parcerias).map((x) => `${str(x.acao)}: ${str(x.como)}\nRecompensa: ${str(x.recompensa)}`)) : null,
        arr(v.indicadores).length ? card('ind', 'KPIs', arr(v.indicadores).slice(0, 3).map((x) => `${str(x.indicador)}: ${x.ponto_de_partida ? `${str(x.ponto_de_partida)} → ` : ''}${str(x.meta)}`)) : null,
      ])
    }
    case 'consultoria':
      return keep(arr(p.consultoria).map((x, i) => card(`r${i}`, str(x.recomendacao).slice(0, 90), [x.impacto && `Impacto: ${str(x.impacto)}`], [x.recomendacao, x.porque && `Por quê: ${str(x.porque)}`, x.impacto && `Impacto: ${str(x.impacto)}`], str(x.tema))))
    case 'm360': {
      const m = p.marketing_360 as Any | null
      if (!m) return []
      return keep([m.resumo ? card('resumo', 'Como os canais se conectam', [m.resumo]) : null,
        ...arr(m.canais).map((c, i) => card(`c${i}`, str(c.canal), [c.acao_do_mes], [`Papel: ${str(c.papel)}`, `Ação do mês: ${str(c.acao_do_mes)}`, `Conecta com: ${str(c.conecta_com)}`]))])
    }
    case 'offline':
      return keep(arr(p.offline).map((x, i) => card(`o${i}`, str(x.acao).slice(0, 90), [`${str(x.onde)} · ${str(x.quando)}`], [x.acao, `Onde: ${str(x.onde)}`, `Quando: ${str(x.quando)}`, `Custo: ${str(x.custo)}`], str(x.onde))))
    case 'ideias':
      return keep([...arr(p.ideias).map((x, i) => card(`i${i}`, str(x.ideia).slice(0, 90), [x.quando && `Quando: ${str(x.quando)}`], [x.ideia, x.quando && `Quando: ${str(x.quando)}`], str(x.tipo))),
        ...arr(cal.banco_ideias).map((x, i) => card(`b${i}`, str(x.ideia).slice(0, 90), [], [x.ideia], x.tipo === 'video' ? 'vídeo' : 'arte'))])
  }
}

/** Ações (aprováveis) de uma seção. */
export function sectionActions(actions: MonthlyAction[], id: SectionId, scope: PlanScope): MonthlyAction[] {
  const areas = id === 'acao' ? SCOPE_AREAS[scope] : SECTION_AREAS[id]
  if (!areas) return []
  return actions.filter((a) => areas.includes(a.area))
}

/** As seções que aparecem nesta tela: só as que têm conteúdo (ou ações). */
export function visibleSections(doc: Any | null | undefined, actions: MonthlyAction[], scope: PlanScope): SectionId[] {
  return SCOPE_SECTIONS[scope].filter((id) => sectionCards(doc, id, scope).length > 0 || (id !== 'acao' && sectionActions(actions, id, scope).length > 0))
}

export const sectionLabel = (id: SectionId) => SECTIONS.find((s) => s.id === id)?.label ?? id
export const areaLabel = (a: ActionArea) => AREA[a].label
