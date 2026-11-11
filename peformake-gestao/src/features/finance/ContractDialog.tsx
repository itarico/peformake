import { Dialog } from '@/components/ui/Dialog'
import { ClientContractTab } from '@/features/contracts/ClientContractTab'
import { describeClient } from '@/features/clients/clientRules'
import { KIND_LABEL } from '@/features/clients/portfolioRules'
import { useClients } from '@/features/clients/useClients'
import { todayInBrazil } from '@/features/traffic/metricsRules'

/** Contrato de um cliente, aberto no Financeiro: gerar, revisar, enviar para assinatura, PDF e cancelar. */
export function ContractDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { query } = useClients()
  const client = query.data?.find((c) => c.id === clientId)
  const view = client ? describeClient(client, todayInBrazil()) : null
  return (
    <Dialog open onClose={onClose} title={client ? `Contrato · ${client.name}` : 'Contrato'} size="md">
      {query.isPending && <p role="status" className="text-muted">Carregando</p>}
      {query.isError && <p role="alert" className="text-warn-ink">Não foi possível carregar o cliente.</p>}
      {client && view && <ClientContractTab client={client} kindLabel={KIND_LABEL[view.kind]} tabs />}
    </Dialog>
  )
}
