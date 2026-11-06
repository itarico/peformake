// Transforma o erro técnico da leitura da Meta em uma frase curta para a equipe.

export interface ReadProblems {
  noPermission: string[]
  /** A Meta bloqueou o acesso de API do app/token da Peformake: afeta todas as contas lidas por token. */
  blocked: string[]
  other: string[]
}

/** Erro vem como "Conta A: Meta 403: ... | Conta B: ...". */
export function summarizeReadError(error: string | null | undefined): ReadProblems {
  const result: ReadProblems = { noPermission: [], blocked: [], other: [] }
  if (!error) return result
  for (const part of error.split(' | ')) {
    const cut = part.indexOf(': ')
    const name = cut > 0 ? part.slice(0, cut).trim() : part.trim()
    const detail = cut > 0 ? part.slice(cut + 2) : ''
    if (/api access blocked|application request limit|\(#4\)|\(#17\)/i.test(detail)) result.blocked.push(name)
    else if (/ads_management|ads_read|\(#200\)|permission/i.test(detail)) result.noPermission.push(name)
    else if (name) result.other.push(name)
  }
  return result
}

export function readProblemText(p: ReadProblems): string | null {
  const parts: string[] = []
  if (p.blocked.length) {
    parts.push(`A Meta bloqueou a leitura pelo app da Peformake (${p.blocked.length === 1 ? p.blocked[0] : `${p.blocked.length} contas`}). Abra o app em developers.facebook.com e o Gerenciador de Negócios para ver o aviso da Meta; enquanto isso, os números não atualizam.`)
  }
  if (p.noPermission.length) {
    parts.push(`${p.noPermission.length === 1 ? 'Sem permissão de leitura' : `${p.noPermission.length} contas sem permissão de leitura`}: ${p.noPermission.join(', ')}.`)
  }
  if (p.other.length) parts.push(`Não lidas por outro motivo: ${p.other.join(', ')}.`)
  return parts.length ? parts.join(' ') : null
}
