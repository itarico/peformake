export const brlValue = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const dateBr = (value: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value)) : 'Não informado'
