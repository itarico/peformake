/** Nome e cor de cada situação do documento de contrato. */
export const CONTRACT_STATUS: Record<string, [string, string]> = {
  aguardando_dados: ['Esperando dados do cliente', 'bg-warn-soft text-warn-ink'],
  rascunho: ['Pronto para enviar', 'bg-accent-soft text-accent-ink'],
  aguardando_aceite: ['Esperando o aceite no portal', 'bg-accent-soft text-accent-ink'],
  enviado: ['Enviado para assinar', 'bg-accent-soft text-accent-ink'],
  assinado_cliente: ['Cliente assinou · falta a Peformake', 'bg-accent-soft text-accent-ink'],
  assinado: ['Assinado', 'bg-ok-soft text-ok-ink'],
  erro: ['Erro ao enviar', 'bg-warn-soft text-warn-ink'],
  cancelado: ['Cancelado', 'bg-raised text-muted'],
}
