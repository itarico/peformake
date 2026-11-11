import { todayInBrazil } from '@/features/traffic/metricsRules'
import type { ClientRecord } from './clientRules'
import { clientKind } from './portfolioRules'

// Passos do cliente novo (ficha, Início e Bete usam a mesma regra).

export type StepId = 'empresa' | 'servicos' | 'contrato' | 'cobranca' | 'acessos' | 'negocio'
export interface SetupStep { id: StepId; label: string; hint: string; done: boolean; optional?: boolean; adminOnly?: boolean; blockedBy?: string }

const SENT = ['enviado', 'aguardando_aceite', 'assinado_cliente', 'assinado']

/** Os 6 passos do cliente novo, calculados pelo que já está cadastrado. */
export function setupSteps(client: ClientRecord, contractStatus: string | null): SetupStep[] {
  const kind = clientKind(client.clientType, client.contract?.model ?? null)
  const empresa = !!client.document && !!(client.billingEmail ?? client.email) && !!client.address
  const servicos = client.services.some((s) => s.isActive)
  // Com Consultoria ativa, o CPF/CNPJ é o que libera o diagnóstico automático (Estratégia → Consultoria).
  const consult = client.services.some((s) => s.isActive && s.name.trim().toLowerCase() === 'consultoria')
  return [
    { id: 'empresa', label: 'Empresa', hint: !client.document && consult ? 'Com o CNPJ, a IA começa o diagnóstico da consultoria. A Receita preenche o resto.' : 'CPF/CNPJ, e-mail de cobrança e endereço. Com CNPJ, a Receita preenche o resto.', done: empresa },
    { id: 'servicos', label: 'Serviços e valores', hint: 'O que foi contratado e por quanto.', done: servicos },
    { id: 'contrato', label: 'Contrato', hint: kind === 'avulso' ? 'Aceite eletrônico no portal.' : 'Assinatura pela Assinafy. Você lê a prévia antes de enviar.', done: !!contractStatus && SENT.includes(contractStatus), adminOnly: true,
      blockedBy: !empresa ? 'Empresa' : !servicos ? 'Serviços e valores' : undefined },
    { id: 'cobranca', label: 'Cobrança', hint: kind === 'avulso' ? 'Data do projeto.' : 'Início, duração e dia da cobrança (de 1 a 31).', done: kind === 'avulso' ? !!client.contract?.startDate : !!client.contract?.startDate && !!client.contract?.billingDay },
    { id: 'acessos', label: 'Acessos', hint: 'Instagram e site. Contas de anúncio e portal ficam na ficha.', done: !!client.instagram || !!client.website },
    { id: 'negocio', label: 'Sobre o negócio', hint: 'Segmento, como chegou e o que a empresa faz.', done: !!client.description || !!client.segment, optional: true },
  ]
}

/** Cliente cadastrado há até 60 dias (ou acabado de criar) ainda com passo obrigatório aberto. */
export function isNewClient(client: ClientRecord): boolean {
  if (!client.since) return false
  const days = (Date.parse(`${todayInBrazil()}T12:00:00Z`) - Date.parse(client.since)) / 86_400_000
  return days <= 60
}


export interface PendingSetup { clientId: string; client: string; step: SetupStep; to: string }

/** Onde se resolve o passo: Serviços abre a aba do dia a dia; o resto abre o pop-up do passo na ficha. */
export function setupStepLink(clientId: string, step: StepId): string {
  return step === 'servicos' ? `/clientes/${clientId}?aba=operacao` : `/clientes/${clientId}?passo=${step}`
}

/**
 * Clientes novos (até 60 dias) ativos com passo obrigatório em aberto: o próximo passo de cada um.
 * Contrato só conta para quem pode enviar (admin). Some quando todos os passos obrigatórios estão feitos.
 */
export function pendingSetupFrom(clients: ClientRecord[], contractStatus: Map<string, string>, isAdmin: boolean): PendingSetup[] {
  const out: PendingSetup[] = []
  for (const c of clients) {
    if (!c.isActive || c.isLost || !isNewClient(c)) continue
    const steps = setupSteps(c, contractStatus.get(c.id) ?? null).filter((s) => !s.optional && (!s.adminOnly || isAdmin))
    const next = steps.find((s) => !s.done && !s.blockedBy) ?? steps.find((s) => !s.done)
    if (next) out.push({ clientId: c.id, client: c.name, step: next, to: setupStepLink(c.id, next.id) })
  }
  return out.sort((a, b) => a.client.localeCompare(b.client, 'pt-BR'))
}
