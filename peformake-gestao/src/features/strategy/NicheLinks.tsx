import { useQuery } from '@tanstack/react-query'
import { addLink, listLinks } from '@/features/clients/clientsApi'
import type { NicheLink } from './consultRules'

/** Links do nicho já salvos (client_links), pelo nome. */
export function useClientLinkMap(clientId: string) {
  return useQuery({
    queryKey: ['client-links', clientId],
    queryFn: async () => new Map([...(await listLinks(clientId))].reverse().map((l) => [l.name.trim().toLowerCase(), l.url])), // o mais novo vale
    retry: false,
  })
}

const norm = (u: string) => { const t = u.trim(); return !t ? '' : /^https?:\/\//i.test(t) ? t : `https://${t}` }

/** Grava os links novos ou trocados (o nome é o tipo: "Cardápio", "Estoque"…). A pesquisa da IA abre estes primeiro. */
export async function saveNicheLinks(clientId: string, values: Record<string, string>, current: Map<string, string> | undefined): Promise<void> {
  for (const [name, raw] of Object.entries(values)) {
    const url = norm(raw)
    if (!url || current?.get(name.toLowerCase()) === url) continue
    await addLink(clientId, name, url)
  }
}

export function NicheLinkFields({ links, values, onChange, saved }: { links: NicheLink[]; values: Record<string, string>; onChange: (name: string, v: string) => void; saved?: Map<string, string> }) {
  const field = 'mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3'
  return (
    <>
      {links.map((l) => (
        <label key={l.name} className="text-[13px] font-semibold">{l.name} <span className="font-normal text-muted">(opcional)</span>
          <input autoComplete="off" inputMode="url" value={values[l.name] ?? saved?.get(l.name.toLowerCase()) ?? ''} onChange={(e) => onChange(l.name, e.target.value)} className={field} placeholder={l.placeholder} />
        </label>
      ))}
    </>
  )
}
