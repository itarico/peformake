// Novidades do sistema na Bete: avisos (vídeo pronto, cliente aprovou, venda para confirmar...) e entregas pendentes.
// Avisos do mesmo tipo viram uma mensagem só ("17 números novos no WhatsApp"), para não lotar o chat.

import type { AppNotification } from '@/features/notifications/notificationsApi'

export interface Notice { id: string; ids: string[]; icon: string; title: string; lines: string[]; when: string; action: { label: string; to: string } | null }

const KIND: Record<string, { icon: string; label: string; many: (n: number) => string }> = {
  content_client_approved: { icon: '✅', label: 'Ver peça', many: (n) => `${n} peças aprovadas pelo cliente` },
  content_client_changes_requested: { icon: '✏️', label: 'Ver ajuste', many: (n) => `${n} peças com pedido de ajuste` },
  content_client_review: { icon: '👀', label: 'Ver peça', many: (n) => `${n} peças com o cliente para aprovar` },
  content_review: { icon: '🎨', label: 'Revisar peça', many: (n) => `${n} peças para revisar` },
  content_approved: { icon: '✅', label: 'Ver peça', many: (n) => `${n} peças aprovadas` },
  content_comment: { icon: '💬', label: 'Ver comentário', many: (n) => `${n} comentários novos em peças` },
  av_review: { icon: '🎬', label: 'Ver vídeo', many: (n) => `${n} vídeos prontos para mandar ao cliente` },
  av_client_review: { icon: '🎬', label: 'Ver vídeo', many: (n) => `${n} vídeos com o cliente para aprovar` },
  av_client_approved: { icon: '🎉', label: 'Ver vídeo', many: (n) => `${n} vídeos aprovados pelo cliente` },
  av_client_changes_requested: { icon: '✏️', label: 'Ver ajuste', many: (n) => `${n} vídeos com pedido de ajuste` },
  av_comment: { icon: '💬', label: 'Ver comentário', many: (n) => `${n} comentários novos em vídeos` },
  av_scheduled: { icon: '📅', label: 'Ver agenda', many: (n) => `${n} captações agendadas` },
  av_team: { icon: '🎬', label: 'Abrir', many: (n) => `${n} avisos da produção` },
  crm_new_contact: { icon: '💬', label: 'Abrir conversas', many: (n) => `${n} números novos no WhatsApp` },
  crm_new_lead: { icon: '🔥', label: 'Ver lead', many: (n) => `${n} leads novos` },
  crm_sale_pending: { icon: '💰', label: 'Confirmar venda', many: (n) => `${n} vendas para confirmar` },
  crm_deal_won: { icon: '🏆', label: 'Ver venda', many: (n) => `${n} vendas fechadas` },
  crm_complaint: { icon: '⚠️', label: 'Ver reclamação', many: (n) => `${n} reclamações para olhar` },
  client_answer: { icon: '💬', label: 'Ver respostas', many: (n) => `${n} clientes responderam as perguntas` },
  crm_nps_detractor: { icon: '⚠️', label: 'Ver avaliação', many: (n) => `${n} avaliações baixas` },
  rating_low: { icon: '⚠️', label: 'Ver avaliação', many: (n) => `${n} avaliações baixas` },
  quote_accepted: { icon: '🎉', label: 'Ver orçamento', many: (n) => `${n} orçamentos aceitos` },
  contract_signed: { icon: '✍️', label: 'Ver contrato', many: (n) => `${n} contratos assinados` },
  contract_waiting: { icon: '✍️', label: 'Ver contrato', many: (n) => `${n} contratos esperando assinatura` },
  billing_paid: { icon: '💸', label: 'Ver financeiro', many: (n) => `${n} pagamentos recebidos` },
  fin_wa_review: { icon: '🧾', label: 'Revisar', many: (n) => `${n} avisos de lançamentos do WhatsApp para revisar` },
  billing_late: { icon: '⏰', label: 'Cobrar', many: (n) => `${n} faturas atrasadas` },
  site_lead: { icon: '🔥', label: 'Ver lead', many: (n) => `${n} contatos novos pelo site` },
  client_referral: { icon: '🎁', label: 'Ver indicação', many: (n) => `${n} indicações de clientes` },
  social_request: { icon: '📣', label: 'Ver pedido', many: (n) => `${n} pedidos de conteúdo` },
  task_waiting: { icon: '⏳', label: 'Ver tarefa', many: (n) => `${n} tarefas esperando você` },
  team_highlight: { icon: '⭐', label: 'Ver', many: (n) => `${n} destaques da equipe` },
}
const DEFAULT = { icon: '🔔', label: 'Abrir', many: (n: number) => `${n} avisos novos` }

export function ago(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

/** Avisos não lidos dos últimos 7 dias, agrupados por tipo, do mais novo para o mais antigo. */
export function noticesFrom(list: AppNotification[], now = Date.now(), opts: { includeRead?: boolean; maxAgeH?: number } = {}): Notice[] {
  const maxAge = (opts.maxAgeH ?? 7 * 24) * 3_600_000
  const fresh = list.filter((n) => (opts.includeRead || !n.readAt) && now - Date.parse(n.createdAt) < maxAge)
  const byKind = new Map<string, AppNotification[]>()
  for (const n of fresh) byKind.set(n.kind, [...(byKind.get(n.kind) ?? []), n])
  const out: Notice[] = []
  for (const [kind, ns] of byKind) {
    const k = KIND[kind] ?? DEFAULT
    const top = ns[0]!
    const link = (ns.length === 1 ? top.link : (ns.every((x) => x.link === top.link) ? top.link : top.link?.split('/').slice(0, 3).join('/'))) ?? null
    out.push({
      id: `ntf:${ns.map((x) => x.id).join(',')}`,
      ids: ns.map((x) => x.id),
      icon: k.icon,
      title: ns.length === 1 ? top.title : k.many(ns.length),
      lines: ns.length === 1 ? (top.body ? [top.body.split('\n')[0]!.slice(0, 160)] : []) : ns.slice(0, 3).map((x) => x.title.replace(/^[^:]+:\s*/, '')).concat(ns.length > 3 ? [`e mais ${ns.length - 3}`] : []),
      when: ago(top.createdAt, now),
      action: link ? { label: k.label, to: link } : null,
    })
  }
  return out.sort((a, b) => order(list, b) - order(list, a))
}
const order = (list: AppNotification[], n: Notice) => Math.max(...n.ids.map((id) => Date.parse(list.find((x) => x.id === id)?.createdAt ?? '0')))

/** Entregas atrasadas dos clientes, as mais atrasadas primeiro. */
export function pendingFrom(map: Map<string, { key: string; label: string; done: boolean; late_days?: number | null; due: string | null; action?: string }[]> | undefined, name: (id: string) => string, today: string): { id: string; client: string; label: string; late: number; to: string }[] {
  if (!map) return []
  const out: { id: string; client: string; label: string; late: number; to: string }[] = []
  for (const [id, items] of map) {
    for (const it of items) {
      if (it.done) continue
      const late = typeof it.late_days === 'number' ? it.late_days : it.due && it.due < today ? Math.round((Date.parse(today) - Date.parse(it.due)) / 86_400_000) : 0
      if (late > 0) out.push({ id, client: name(id), label: it.label, late, to: deliveryLink(id, it.action) })
    }
  }
  return out.sort((a, b) => b.late - a.late)
}

/** Onde se resolve cada entrega: reunião abre o "marcar reunião" do cliente; o resto vai para a tela do serviço, já no cliente. */
export function deliveryLink(clientId: string, action?: string): string {
  if (!action) return `/clientes/${clientId}?aba=operacao`
  if (action === 'meeting') return `/clientes/${clientId}?abrir=reuniao`
  return `${action}${action.includes('?') ? '&' : '?'}cliente=${clientId}`
}

/** Bete: uma linha só (não urgente) para os clientes novos com passo do cadastro em aberto. */
export function setupNotice(pending: { clientId: string; client: string; step: { id: string; label: string }; to: string }[]): { id: string; title: string; sub?: string; to: string } | null {
  if (!pending.length) return null
  const [first] = pending
  if (pending.length === 1) return { id: `setup:${first!.clientId}:${first!.step.id}`, title: `🧩 ${first!.client}: falta ${first!.step.label}`, sub: 'Cliente novo com o cadastro pela metade', to: first!.to }
  return {
    id: `setup:${pending.map((p) => `${p.clientId}:${p.step.id}`).join(',')}`,
    title: `🧩 ${pending.length} clientes novos com o cadastro pela metade`,
    sub: pending.slice(0, 2).map((p) => `${p.client}: falta ${p.step.label}`).join(' · '),
    to: first!.to,
  }
}
