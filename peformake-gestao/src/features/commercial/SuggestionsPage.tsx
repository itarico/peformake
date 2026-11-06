import { Link } from 'react-router-dom'
import { LoadState } from '@/features/traffic/LoadState'
import { contactName, type SuggestionKind } from './commercialRules'
import { SuggestionCard } from './SuggestionCard'
import { useCommercialData, useSales, useSuggestions } from './useCommercial'

const GROUPS: readonly { kind: SuggestionKind; title: string; hint: string }[] = [
  { kind: 'pedido', title: 'Pedidos dos clientes', hint: 'O que os clientes pediram nos grupos e conversas. Aceitar cria a tarefa no kanban de Tarefas.' },
  { kind: 'etapa', title: 'Mudanças de etapa', hint: 'A conversa indica que a oportunidade avançou ou parou.' },
  { kind: 'tipo', title: 'Classificar contatos', hint: 'Quem é lead, cliente, fornecedor ou pessoal.' },
]

export function SuggestionsPage() {
  const data = useCommercialData()
  const suggestions = useSuggestions()
  const sales = useSales()

  if (!suggestions.data || !data.contacts) {
    return <LoadState isPending={suggestions.isPending || data.isPending} isError={suggestions.isError || data.isError} refetch={() => { void suggestions.refetch(); data.refetch() }} />
  }

  const pendingSales = (sales.data ?? []).filter((s) => s.status === 'pendente' && s.source === 'agente').length
  const label = (contactId: string) => {
    const contact = data.contactById.get(contactId)
    return contact ? contactName(contact) : undefined
  }

  return (
    <>
      <p className="text-[13px] text-muted">
        A IA lê as conversas com mensagem nova a cada 15 minutos e sugere. Nada muda sem o seu clique.
        {pendingSales > 0 && <> Há <Link to="../vendas" className="font-semibold text-ink underline">{pendingSales} {pendingSales === 1 ? 'venda detectada' : 'vendas detectadas'}</Link> esperando confirmação.</>}
      </p>
      {suggestions.data.length === 0 && <p className="rounded-3xl border border-line p-6 text-center text-muted">Nenhuma sugestão pendente agora.</p>}
      {GROUPS.map((group) => {
        const items = suggestions.data.filter((s) => s.kind === group.kind)
        if (items.length === 0) return null
        return (
          <section key={group.kind} aria-label={group.title} className="flex flex-col gap-2">
            <div>
              <h2 className="font-semibold">{group.title} ({items.length})</h2>
              <p className="text-[12px] text-muted">{group.hint}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => <SuggestionCard key={s.id} suggestion={s} contactLabel={label(s.contactId)} />)}
            </div>
          </section>
        )
      })}
    </>
  )
}
