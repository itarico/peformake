// Motor da conversa de metas: junta as metas, o ritmo e os dados do sistema em mensagens que mudam todo dia.
// Nada de IA externa: frases-modelo com variáveis, escolhidas por um sorteio fixo do dia (o mesmo dia repete, o dia seguinte muda).

import type { GoalRow, Pace } from './goals'

export interface Coach {
  cut: number; avg_ticket: number; avulsos: number; stuck: number; leads_new: number; arts_due_week: number; videos_due: number; open_quotes: number
  low_ticket: { id: string; name: string; ticket: number }[]; idle_avulsos: { id: string; name: string; months: number }[]
  happy: { id: string; name: string }[]; unhappy: { id: string; name: string }[]
  hot_leads: { name: string; source: string; to_: string }[]; frequent_avulsos: { id: string; name: string; months: number; avg: number | null }[]
  overdue: { id: string; name: string; amount: number }[]; no_meeting: { id: string; name: string }[]; lost_month: { id: string; name: string; reason: string | null }[]
}

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const n0 = (n: number) => Math.round(n).toLocaleString('pt-BR')

/** Sorteio fixo por semente: mesma semente, mesma escolha. */
export function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export const pickWith = (rnd: () => number) => <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]!

export const names = (list: string[], max = 3) => {
  const l = list.map((s) => s.trim()).filter(Boolean).slice(0, max)
  return l.length <= 1 ? (l[0] ?? '') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`
}

const WEEKDAY = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function greeting(pick: <T>(a: readonly T[]) => T, firstName: string, day: number, days: number, monthName: string) {
  const left = days - day
  const hour = new Date().getHours()
  const hi = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const wd = WEEKDAY[new Date().getDay()]!
  const who = firstName ? `, ${firstName}` : ''
  const phase = left > 20
    ? pick(['O mês está começando: é a melhor hora para sair na frente.', 'Começo de mês: quem sai na frente fecha com mais calma.'])
    : left > 10
      ? pick(['Estamos no meio do mês: boa hora para ajustar a rota.', 'Metade do mês já foi. Vamos ver como estamos?'])
      : pick(['Reta final do mês: cada dia conta.', `Faltam só ${left} dias para fechar ${monthName}.`])
  const week = wd === 'segunda' ? pick(['Semana nova começando! 💥', 'Segunda é dia de planejar a semana.'])
    : wd === 'sexta' ? pick(['Sexta-feira! Vamos fechar bem a semana? 🎯', 'É sexta: ainda dá para fazer a semana valer.'])
      : wd === 'sábado' || wd === 'domingo' ? 'Mesmo no fim de semana, seus números estão aqui. 😄' : ''
  return pick([
    `${hi}${who}! Hoje é ${wd}, dia ${day}. Faltam ${left} dias para ${monthName} acabar.`,
    `${hi}${who}! ☕ Estamos no dia ${day} de ${monthName}, com ${left} dias pela frente.`,
    `${hi}${who}! ${phase}`,
    `${hi}${who}! Acabei de atualizar seus números. ${phase}`,
    `${hi}${who}! ${week || phase}`,
    `${hi}${who}! ${Math.round((day / days) * 100)}% do mês já passou. Vamos ver como estão as metas?`,
    `Oi${who}! Estou aqui para te ajudar no dia.`,
  ])
}

export function goalIntro(pick: <T>(a: readonly T[]) => T) {
  return pick(['Sua meta em foco hoje:', 'Hoje vamos olhar esta meta:', 'Separei esta meta para hoje:', 'A meta do dia:', 'Veja como está esta meta:', 'Esta meta merece atenção hoje:', 'Bora olhar esta aqui?'])
}

/** Projeção: no ritmo de hoje, onde a meta termina o mês. */
export function projection(r: GoalRow, day: number, days: number, stock = false): number {
  const base = stock ? (r.info.base ?? 0) : 0
  const actual = r.actual ?? 0
  return base + ((actual - base) / Math.max(1, day)) * days
}

export function cheer(pick: <T>(a: readonly T[]) => T, p: Pace) {
  const by: Record<Pace['state'], string[]> = {
    batida: ['Meta batida! 🏆 Daqui pra frente é bônus.', 'Fechou! 🎉 Que tal mirar mais alto?', 'Batida com folga. Esse é o padrão.', 'Missão cumprida. ✅ Agora é jogar pelo recorde.'],
    ritmo: ['No ritmo. Manter a constância é o que garante. 💪', 'Caminhando bem: o segredo agora é não tirar o pé.', 'Do jeito certo. Segue o plano.', 'Tudo certo por aqui. Só não deixe esfriar.'],
    atras: ['Dá pra virar: um bom dia resolve muito. 🚀', 'Atrás, mas longe de perdido. Bora acelerar?', 'Hora de colocar foco aqui hoje.', 'Um empurrão hoje e o gráfico já muda de cara.', 'Ainda dá tempo, mas o relógio está correndo. ⏱️'],
    estourou: ['Esse passou do limite. Vamos entender o que houve e segurar o resto do mês.', 'Aqui o sinal é vermelho: vale agir hoje para não repetir.'],
    ok: ['Dentro do limite. Continue de olho. 👀', 'Tudo sob controle por aqui.', 'Zerado como tem que ser. 👌'],
  }
  return pick(by[p.state])
}

/** Frase simples do que falta, em linguagem do dia a dia. */
export function plain(r: GoalRow, p: Pace, day: number, days: number, money?: boolean, kind?: string): string {
  const actual = r.actual ?? 0
  const left = Math.max(1, days - day)
  if (kind === 'atMost') return actual <= r.target ? 'Dentro do limite do mês.' : `Passou ${n0(actual - r.target)} do limite.`
  if (p.state === 'batida') return 'Meta batida!'
  const rem = r.target - actual
  if (money) return `Faltam ${brl(rem)} em ${left} dias (${brl((rem / left) * 7)} por semana).`
  const perWeek = (rem / left) * 7
  const wk = Math.ceil(perWeek)
  return `Falta${rem > 1 ? 'm' : ''} ${n0(rem)} em ${left} dias${wk <= 1 ? ' (basta 1 por semana)' : ` (uns ${n0(wk)} por semana)`}.`
}

/** Passo a passo para bater a meta, montado com os dados reais do sistema. */
export function steps(r: GoalRow, c: Coach | undefined, day: number, days: number): string[] {
  const actual = r.actual ?? 0
  const rem = Math.max(0, r.target - actual)
  const left = Math.max(1, days - day)
  const cut = c?.cut ?? r.info.cut ?? 1500
  const low = c?.low_ticket ?? []
  const happy = (c?.happy ?? []).map((x) => x.name)
  const idle = c?.idle_avulsos ?? []
  const out: string[] = []
  switch (r.key) {
    case 'mrr_total': {
      out.push(`Faltam ${brl(rem)} de mensalidade até o fim do mês. Vamos quebrar isso em partes.`)
      out.push(`1 cliente novo de ticket alto (acima de ${brl(cut)}) já cobre ${Math.min(100, Math.round((cut / Math.max(1, rem)) * 100))}% do que falta.`)
      if (low.length) out.push(`Upsell na base: ${names(low.map((x) => `${x.name.trim()} (${brl(x.ticket)})`))} pagam pouco. Um serviço a mais de R$ 400 em cada soma ${brl(400 * Math.min(3, low.length))}.`)
      if (c?.unhappy.length) out.push(`Proteja o que já entra: ${names(c.unhappy.map((x) => x.name))} estão insatisfeitos. Uma ligação hoje evita uma saída.`)
      out.push(`Ritmo para chegar: ${brl((rem / left) * 7)} por semana. Anote isso na sua rotina.`)
      break
    }
    case 'novos': case 'novos_premium': {
      const premium = r.key === 'novos_premium'
      const leads = c?.hot_leads ?? []
      const freq = c?.frequent_avulsos ?? []
      out.push(`Faltam ${rem} ${rem === 1 ? 'cliente' : 'clientes'}${premium ? ` com mensalidade acima de ${brl(cut)}` : ''} em ${left} dias: ${Math.max(1, Math.ceil(rem / Math.max(1, left / 7)))} por semana.`)
      if (leads.length) out.push(`Chame hoje: ${names(leads.map((x) => `${x.name} (${x.source.trim()})`))}.`)
      else out.push('Não há lead quente no funil agora. Rode uma busca em Prospecção: o sistema encontra empresas do nicho com WhatsApp.')
      if (!premium && freq.length) out.push(`Avulsos que compram todo mês: ${names(freq.map((x) => `${x.name} (${x.months} meses seguidos${x.avg ? `, média ${brl(x.avg)}` : ''})`))}. Proponha o plano mensal: para eles já é rotina.`)
      if (happy.length) out.push(`Peça indicação a quem está satisfeito: ${names(happy)}.`)
      if (premium) out.push(`Para passar de ${brl(cut)}, proponha o pacote completo (tráfego + social + audiovisual) com o resultado de um cliente do mesmo nicho.`)
      break
    }
    case 'avulsos': {
      out.push(`Faltam ${rem} ${rem === 1 ? 'venda' : 'vendas'} para a base avulsa (${c?.avulsos ?? r.info.base ?? 0} clientes).`)
      if (idle.length) out.push(`Comece por quem está parado: ${names(idle.map((x) => `${x.name.trim()} (${x.months} ${x.months === 1 ? 'mês' : 'meses'})`))}.`)
      out.push('Mande uma ideia pronta, não um catálogo: "que tal gravar 3 vídeos do produto novo esta semana?".')
      out.push('Pacote de 3 vídeos com preço fechado vende mais que hora avulsa. Use um pacote pronto no Orçamento.')
      break
    }
    case 'upsell': {
      out.push(`Meta: ${rem} ${rem === 1 ? 'upsell' : 'upsells'} até o fim do mês.`)
      if (low.length) out.push(`Os mais fáceis: ${names(low.map((x) => `${x.name.trim()} (${brl(x.ticket)})`))}. Mensalidade baixa tem espaço para crescer.`)
      out.push('Leve a proposta na reunião do mês, com os números dele na tela.')
      out.push('Ofereça o próximo serviço da trilha (o sistema sugere em Clientes → Atenção).')
      break
    }
    case 'reunioes': {
      const no = (c?.no_meeting ?? []).map((x) => x.name)
      out.push(`${no.length} ${no.length === 1 ? 'cliente ainda não tem' : 'clientes ainda não têm'} reunião este mês.`)
      if (no.length) out.push(`Comece por: ${names(no, 4)}.`)
      if (no.length && day < 14) { const pd = Math.max(1, Math.ceil(no.length / (14 - day))); out.push(`Para marcar todas até o dia 14: ${pd === 1 ? '1 por dia' : `umas ${pd} por dia`}.`) }
      out.push('Marque pela barra de entregas do cliente: o convite sai pronto para o WhatsApp.')
      break
    }
    case 'saidas': {
      const lost = c?.lost_month ?? []
      if (lost.length) out.push(`Saíram este mês: ${names(lost.map((x) => `${x.name.trim()}${x.reason ? ` (${x.reason.toLowerCase()})` : ''}`))}.`)
      else out.push('Ninguém saiu este mês. Vamos manter assim.')
      if (c?.unhappy.length) out.push(`Risco agora: ${names(c.unhappy.map((x) => x.name))}. Ligue para ouvir, sem defender o trabalho.`)
      out.push('Reunião do mês com todos: quem conversa com a gente não sai.')
      out.push('Para quem caiu de selo, entregue um extra rápido esta semana.')
      break
    }
    case 'devendo': case 'inadimplencia': {
      const od = c?.overdue ?? []
      if (od.length) { out.push(`Em aberto: ${names(od.map((x) => `${x.name.trim()} (${brl(x.amount)})`))}.`); out.push('Ligue no primeiro dia de atraso e mande o link de pagamento junto.') }
      else out.push('Ninguém devendo hoje. 👏 Confira as faturas que vencem esta semana para continuar assim.')
      out.push('Combinou nova data? Registre por escrito na ficha do cliente.')
      break
    }
    case 'aprovacao_parada': case 'artes': {
      if (c?.stuck) out.push(`${c.stuck} ${c.stuck === 1 ? 'peça está parada' : 'peças estão paradas'} na aprovação do cliente.`)
      if (c?.arts_due_week) out.push(`${c.arts_due_week} ${c.arts_due_week === 1 ? 'peça vence' : 'peças vencem'} nos próximos 7 dias: comece por elas.`)
      out.push('Mande para aprovação em lote, com a peça anexada: aprovar fica a um toque.')
      out.push('Cliente que demora: combine um aprovador fixo.')
      break
    }
    case 'relatorios': case 'estrategias': {
      out.push(r.key === 'relatorios' ? `Falta${rem === 1 ? '' : 'm'} ${rem} ${rem === 1 ? 'relatório' : 'relatórios'} no mês.` : `Falta${rem === 1 ? '' : 'm'} ${rem} ${rem === 1 ? 'estratégia' : 'estratégias'}, com prazo até o dia 15.`)
      out.push(r.key === 'relatorios' ? 'Ligue o envio automático em Tráfego → Configurações.' : 'Gere logo depois da reunião do mês: a conversa vira estratégia.')
      out.push('Comece pelos clientes de maior mensalidade.')
      break
    }
    case 'videos': out.push(`Falta${rem === 1 ? '' : 'm'} ${rem} ${rem === 1 ? 'vídeo' : 'vídeos'} para entregar no prazo este mês.`, 'Bruto no mesmo dia, edição no dia seguinte.', 'Aprovação interna antes de mandar ao cliente.'); break
    case 'orcamentos_aceitos': if (c?.open_quotes) out.push(`${c.open_quotes} ${c.open_quotes === 1 ? 'orçamento aguarda' : 'orçamentos aguardam'} resposta. Retome em 48 horas quem não respondeu.`); else out.push('Nenhum orçamento esperando resposta agora. Para ter aceites, primeiro é preciso enviar.'); out.push('Ofereça captação aos clientes avulsos parados: são os mais fáceis de aceitar.', 'Use os pacotes prontos: o orçamento sai em 2 minutos.'); break
    case 'fotos_extras': out.push('Toda captação com foto vira galeria para o cliente escolher.', 'Suba as fotos no mesmo dia: a emoção vende as extras.', 'Avise o parceiro que ele já tem desconto.'); break
    case 'recebido': out.push(`Faltam ${brl(rem)} para entrar no caixa.`, 'Confira as faturas que vencem esta semana.', 'Quem atrasou: ligar no primeiro dia.'); break
    case 'planos': out.push(`Falta${rem === 1 ? '' : 'm'} ${rem} ${rem === 1 ? 'planejamento' : 'planejamentos'}.`, 'Feche o planejamento na primeira semana do mês.', 'Use a estratégia do mês como base.'); break
    default: out.push('Foque nesta meta hoje e registre o que fez.')
  }
  return out.filter(Boolean)
}

export interface Action { label: string; to: string }
const first = (n: string) => n.trim().split(' ').slice(0, 2).join(' ')

/** Atalhos para agir agora: a área certa do sistema e, quando dá, um cliente específico para procurar. */
export function actions(r: GoalRow, c: Coach | undefined): Action[] {
  const a: Action[] = []
  const client = (x: { id: string; name: string } | undefined, verb: string, acao: string) => { if (x) a.push({ label: `${verb} ${first(x.name)}`, to: `/clientes/${x.id}?acao=${acao}` }) }
  switch (r.key) {
    case 'novos': case 'novos_premium': {
      const lead = c?.hot_leads[0]
      if (lead) a.push({ label: `Chamar ${first(lead.name)}`, to: lead.to_ })
      if (r.key === 'novos') client(c?.frequent_avulsos[0], 'Oferecer plano a', 'plano')
      a.push({ label: lead ? 'Ver todos os leads' : 'Buscar leads', to: '/comercial/prospeccao' })
      client(c?.happy[0], 'Pedir indicação a', 'indicacao')
      break
    }
    case 'mrr_total': case 'upsell': client(c?.low_ticket[0], 'Propor upsell a', 'upsell'); client(c?.low_ticket[1], 'Propor upsell a', 'upsell'); a.push({ label: 'Ver clientes', to: '/clientes?aba=recorrentes&atencao=upsell' }); break
    case 'avulsos': client(c?.idle_avulsos[0], 'Falar com', 'captacao'); client(c?.idle_avulsos[1], 'Falar com', 'captacao'); a.push({ label: 'Montar orçamento', to: '/audiovisual/orcamentos/novo' }); break
    case 'reunioes': client(c?.no_meeting[0], 'Marcar com', 'reuniao'); client(c?.no_meeting[1], 'Marcar com', 'reuniao'); break
    case 'saidas': client(c?.unhappy[0], 'Ligar para', 'ligar'); a.push({ label: 'Perdidos e pausados', to: '/clientes?aba=perdidos' }); break
    case 'devendo': case 'inadimplencia': client(c?.overdue[0], 'Cobrar', 'cobrar'); a.push({ label: 'Abrir cobrança', to: '/financeiro/cobranca' }); break
    case 'artes': case 'aprovacao_parada': case 'planos': a.push({ label: 'Abrir conteúdo', to: '/conteudo' }); break
    case 'relatorios': a.push({ label: 'Abrir relatórios', to: '/trafego/relatorios' }); break
    case 'estrategias': a.push({ label: 'Abrir estratégias', to: '/trafego/estrategia' }); break
    case 'videos': a.push({ label: 'Abrir produção', to: '/audiovisual/producao' }); break
    case 'orcamentos_aceitos': a.push({ label: 'Abrir orçamentos', to: '/audiovisual/orcamentos' }); break
    case 'fotos_extras': a.push({ label: 'Abrir fotos', to: '/audiovisual/fotos' }); break
    case 'recebido': a.push({ label: 'Abrir financeiro', to: '/financeiro' }); break
  }
  return a.slice(0, 3)
}

/** Uma sugestão concreta de quem procurar hoje, com o porquê. */
export function suggestion(pick: <T>(a: readonly T[]) => T, r: GoalRow, c: Coach | undefined): string | null {
  if (!c) return null
  switch (r.key) {
    case 'novos': case 'novos_premium': {
      if (c.hot_leads[0]) return `Lead para chamar hoje: ${c.hot_leads[0].name} (${c.hot_leads[0].source.trim().toLowerCase()}).`
      if (r.key === 'novos' && c.frequent_avulsos[0]) return `${first(c.frequent_avulsos[0].name)} compra avulso há ${c.frequent_avulsos[0].months} meses seguidos: é cliente recorrente sem contrato. Ofereça o plano.`
      if (c.happy[0]) return pick([`Sugestão para hoje: peça uma indicação a ${first(c.happy[0].name)}. Avaliou bem a gente há pouco tempo.`, `Que tal mandar uma mensagem para ${first(c.happy[0].name)} pedindo indicação? Está satisfeito com o trabalho.`])
      if (c.idle_avulsos[0]) return `Sugestão: ${first(c.idle_avulsos[0].name)} já compra avulso. Ofereça o plano mensal.`
      return c.leads_new ? `Tem ${c.leads_new} lead(s) novo(s) em Prospecção esperando resposta.` : null
    }
    case 'mrr_total': case 'upsell': return c.low_ticket[0] ? pick([`Sugestão: ${first(c.low_ticket[0].name)} paga ${brl(c.low_ticket[0].ticket)}. É o upsell mais fácil do mês.`, `Comece por ${first(c.low_ticket[0].name)}: mensalidade de ${brl(c.low_ticket[0].ticket)}, com espaço para mais um serviço.`]) : null
    case 'avulsos': return c.idle_avulsos[0] ? `Sugestão: ${first(c.idle_avulsos[0].name)} não compra há ${c.idle_avulsos[0].months} ${c.idle_avulsos[0].months === 1 ? 'mês' : 'meses'}. Mande uma ideia pronta de captação.` : null
    case 'reunioes': return c.no_meeting[0] ? `Comece marcando com ${first(c.no_meeting[0].name)}${c.no_meeting[1] ? ` e ${first(c.no_meeting[1].name)}` : ''}.` : null
    case 'saidas': return c.unhappy[0] ? `Atenção a ${first(c.unhappy[0].name)}: a última avaliação foi ruim. Uma ligação hoje faz diferença.` : null
    case 'devendo': case 'inadimplencia': return c.overdue[0] ? `${first(c.overdue[0].name)} está com ${brl(c.overdue[0].amount)} em aberto.` : null
    default: return null
  }
}

const OBJECTIVE: Record<string, string> = {
  novos: 'Chamar lead', novos_premium: 'Chamar lead', mrr_total: 'Propor upsell', upsell: 'Propor upsell', avulsos: 'Oferecer captação',
  reunioes: 'Marcar reunião', saidas: 'Ligar para o cliente', devendo: 'Cobrar', inadimplencia: 'Cobrar', artes: 'Ver peças', aprovacao_parada: 'Cobrar aprovação',
  planos: 'Abrir planejamento', relatorios: 'Enviar relatórios', estrategias: 'Fazer estratégia', videos: 'Ver produção', orcamentos_aceitos: 'Ver orçamentos',
  fotos_extras: 'Abrir fotos', recebido: 'Ver financeiro',
}
/** Uma ação só, objetiva: o verbo do que fazer agora, levando ao primeiro cliente ou à área certa. */
export function primaryAction(r: GoalRow, c: Coach | undefined): (Action & { hint?: string }) | null {
  const a = actions(r, c)[0]
  if (!a) return null
  const who = a.to.startsWith('/clientes/') ? a.label.replace(/^(Pedir indicação a|Oferecer plano a|Propor upsell a|Falar com|Marcar com|Ligar para|Cobrar|Chamar)\s*/, '') : undefined
  const verb = r.key === 'novos' || r.key === 'novos_premium' ? (a.to.startsWith('/clientes/') ? 'Oferecer plano' : c?.hot_leads.length ? 'Chamar lead' : 'Buscar leads') : OBJECTIVE[r.key] ?? a.label
  return { label: verb, to: a.to, hint: who }
}

/** Cartão de cliente para procurar hoje: quem, por quê e o botão. */
export function clientCard(r: GoalRow, c: Coach | undefined): { name: string; why: string; to: string; label: string } | null {
  if (!c) return null
  const ACAO: Record<string, string> = { 'Oferecer plano': 'plano', 'Pedir indicação': 'indicacao', 'Propor upsell': 'upsell', 'Oferecer captação': 'captacao', 'Marcar reunião': 'reuniao', 'Ligar para o cliente': 'ligar', Cobrar: 'cobrar' }
  const card = (x: { id: string; name: string } | undefined, why: string, label: string) => (x ? { name: x.name.trim(), why, to: `/clientes/${x.id}${ACAO[label] ? `?acao=${ACAO[label]}` : ''}`, label } : null)
  switch (r.key) {
    case 'novos': case 'novos_premium':
      if (c.frequent_avulsos[0] && r.key === 'novos') return card(c.frequent_avulsos[0], `Compra avulso há ${c.frequent_avulsos[0].months} meses seguidos. Já é cliente de rotina: falta o contrato.`, 'Oferecer plano')
      return card(c.happy[0], 'Avaliou muito bem a gente. Hora certa de pedir uma indicação.', 'Pedir indicação')
    case 'mrr_total': case 'upsell': return card(c.low_ticket[0], `Mensalidade${c.low_ticket[0]?.ticket ? ` de ${brl(c.low_ticket[0].ticket)}` : ' baixa'}: espaço para mais um serviço.`, 'Propor upsell')
    case 'avulsos': return card(c.idle_avulsos[0], `Não compra há ${c.idle_avulsos[0]?.months ?? 0} meses. Uma ideia pronta de captação costuma destravar.`, 'Oferecer captação')
    case 'reunioes': return card(c.no_meeting[0], 'Ainda sem reunião este mês. Marque antes do dia 14.', 'Marcar reunião')
    case 'saidas': return card(c.unhappy[0], 'A última avaliação foi ruim. Uma ligação hoje pode evitar uma saída.', 'Ligar para o cliente')
    case 'devendo': case 'inadimplencia': return card(c.overdue[0], `Fatura em aberto${c.overdue[0]?.amount ? ` de ${brl(c.overdue[0].amount)}` : ''}.`, 'Cobrar')
    default: return null
  }
}

export type GoalFormat = 'bar' | 'chart' | 'big' | 'time'
const ROTATION: GoalFormat[] = ['chart', 'bar', 'time', 'big']
const LIMIT_ROTATION: GoalFormat[] = ['bar', 'big']
/**
 * Formato da mensagem da meta, em rodízio: cada meta passa por todos os formatos a cada 4 dias
 * (o gráfico aparece pelo menos uma vez por semana) e duas mensagens seguidas nunca saem iguais.
 * Limites (no máximo) alternam só entre barra e número grande.
 */
export function formatFor(kind: string, dayOfYear: number, goalIndex: number, prev?: GoalFormat): GoalFormat {
  const list = kind === 'atMost' ? LIMIT_ROTATION : ROTATION
  let i = (dayOfYear + goalIndex) % list.length
  if (list[i] === prev) i = (i + 1) % list.length
  return list[i]!
}
