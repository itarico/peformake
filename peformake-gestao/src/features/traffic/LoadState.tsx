import { Button } from '@/components/ui/Button'

export function LoadState({ isPending, isError, refetch }: { isPending: boolean; isError: boolean; refetch: () => void }) {
  if (isError) {
    return (
      <div role="alert" data-conteudo className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warn-soft p-4 text-warn-ink">
        <span className="font-medium">Não foi possível carregar os dados.</span>
        <Button variant="secondary" onClick={refetch}>Tentar de novo</Button>
      </div>
    )
  }
  if (isPending) return <p role="status" data-conteudo className="text-muted">Carregando</p>
  return null
}
