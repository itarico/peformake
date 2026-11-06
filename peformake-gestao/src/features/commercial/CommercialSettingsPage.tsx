import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useClientPermissions } from '@/features/clients/useClients'
import { LoadState } from '@/features/traffic/LoadState'
import { cn } from '@/lib/cn'
import { commercialErrorMessage, deleteTag, saveSettings, saveTag } from './commercialApi'
import {
  parseKeywords,
  TAG_COLOR_LABEL,
  TAG_COLORS,
  TAG_SCOPE_LABEL,
  type CommercialSettings,
  type Tag,
  type TagColor,
  type TagScope,
} from './commercialRules'
import { TagChip } from './TagChip'
import { commercialKeys, useCommercialData } from './useCommercial'

const field = 'min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-ink'

function SettingsForm({ settings, canManage }: { settings: CommercialSettings; canManage: boolean }) {
  const queryClient = useQueryClient()
  const [sla, setSla] = useState(String(settings.replySlaMinutes))
  const [stale, setStale] = useState(String(settings.staleDays))
  const save = useMutation({
    mutationFn: () => saveSettings({ replySlaMinutes: Number(sla), staleDays: Number(stale) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: commercialKeys.settings }),
  })
  const invalid = !(Number(sla) >= 10 && Number(sla) <= 2880) || !(Number(stale) >= 1 && Number(stale) <= 30)

  return (
    <section aria-label="Prazos" className="flex flex-col gap-3 rounded-3xl border border-line-strong bg-surface p-5">
      <h2 className="text-[17px] font-semibold tracking-tight">Prazos</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col text-[13px] font-semibold">Sem resposta depois de (minutos)
          <input type="number" min={10} max={2880} disabled={!canManage} value={sla} onChange={(e) => setSla(e.target.value)} className={cn(field, 'mt-1 font-normal')} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Conversa parada depois de (dias)
          <input type="number" min={1} max={30} disabled={!canManage} value={stale} onChange={(e) => setStale(e.target.value)} className={cn(field, 'mt-1 font-normal')} />
        </label>
      </div>
      {save.isError && <p role="alert" className="font-medium text-warn-ink">{commercialErrorMessage(save.error)}</p>}
      {save.isSuccess && <p role="status" className="text-ok-ink">Prazos salvos.</p>}
      {canManage && <div><Button disabled={invalid || save.isPending} onClick={() => save.mutate()}>Salvar prazos</Button></div>}
    </section>
  )
}

function TagEditor({ tag, onClose }: { tag: Tag | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState<TagColor>(tag?.color ?? 'neutral')
  const [scope, setScope] = useState<TagScope>(tag?.appliesTo ?? 'all')
  const [keywords, setKeywords] = useState((tag?.keywords ?? []).join(', '))
  const [active, setActive] = useState(tag?.isActive ?? true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: commercialKeys.tags })
    void queryClient.invalidateQueries({ queryKey: commercialKeys.contacts })
  }
  const save = useMutation({
    mutationFn: () => saveTag(tag?.id ?? null, { name, color, appliesTo: scope, keywords: parseKeywords(keywords), isActive: active }),
    onSuccess: () => { refresh(); onClose() },
  })
  const remove = useMutation({ mutationFn: () => deleteTag(tag!.id), onSuccess: () => { refresh(); onClose() } })
  const nameError = name.trim().length < 2 ? 'Dê um nome com pelo menos 2 letras.' : null

  return (
    <section aria-label={tag ? 'Editar etiqueta' : 'Nova etiqueta'} className="flex flex-col gap-3 rounded-2xl border border-line-strong p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col text-[13px] font-semibold">Nome *
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={cn(field, 'mt-1 font-normal')} />
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Cor
          <select value={color} onChange={(e) => setColor(e.target.value as TagColor)} className={cn(field, 'mt-1 font-normal')}>
            {TAG_COLORS.map((c) => <option key={c} value={c}>{TAG_COLOR_LABEL[c]}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold">Onde aplicar
          <select value={scope} onChange={(e) => setScope(e.target.value as TagScope)} className={cn(field, 'mt-1 font-normal')}>
            {Object.entries(TAG_SCOPE_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-[13px] font-semibold md:col-span-3">Palavras-chave (separe por vírgula)
          <textarea rows={2} value={keywords} onChange={(e) => setKeywords(e.target.value)} className={cn(field, 'mt-1 resize-y font-normal')} placeholder="orcamento*, quanto custa, preco*" />
          <span className="mt-1 block font-normal text-muted">Vale a palavra inteira, sem acento. Termine com * para pegar o começo da palavra: orcamento* pega "orçamentos". Sem palavras, a etiqueta é só manual.</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px]">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4" /> Ativa
        </label>
      </div>
      {(save.isError || remove.isError) && <p role="alert" className="font-medium text-warn-ink">{commercialErrorMessage(save.error ?? remove.error)}</p>}
      {confirmDelete && (
        <div role="alertdialog" aria-label="Confirmar exclusão" className="flex flex-wrap items-center gap-2 rounded-2xl border border-line-strong p-3">
          <span className="flex-1 text-[13px]">Apagar a etiqueta? Ela sai de todos os contatos.</span>
          <Button className="min-h-9 px-3 text-[13px]" disabled={remove.isPending} onClick={() => remove.mutate()}>Apagar</Button>
          <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!!nameError || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Salvando' : 'Salvar etiqueta'}</Button>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {tag && !confirmDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 font-medium text-muted hover:text-ink">
            <Trash2 size={15} aria-hidden="true" /> Apagar
          </button>
        )}
      </div>
    </section>
  )
}

export function CommercialSettingsPage() {
  const { canManage } = useClientPermissions()
  const data = useCommercialData()
  const [editing, setEditing] = useState<Tag | 'new' | null>(null)

  if (!data.settings || !data.tags) return <LoadState isPending={data.isPending} isError={data.isError} refetch={data.refetch} />

  return (
    <>
      <SettingsForm key={`${data.settings.replySlaMinutes}-${data.settings.staleDays}`} settings={data.settings} canManage={canManage} />
      <section aria-label="Etiquetas" className="flex flex-col gap-3 rounded-3xl border border-line-strong bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">Etiquetas</h2>
            <p className="text-[13px] text-muted">Quando o contato escreve uma das palavras, a etiqueta entra sozinha. Vale para as mensagens novas.</p>
          </div>
          {canManage && <Button onClick={() => setEditing('new')}><Plus size={18} aria-hidden="true" /> Nova etiqueta</Button>}
        </div>
        {editing === 'new' && <TagEditor tag={null} onClose={() => setEditing(null)} />}
        {data.tags.map((tag) =>
          editing !== 'new' && editing?.id === tag.id ? (
            <TagEditor key={tag.id} tag={tag} onClose={() => setEditing(null)} />
          ) : (
            <div key={tag.id} className={cn('flex flex-wrap items-center gap-2 rounded-2xl border border-line p-3', !tag.isActive && 'opacity-60')}>
              <TagChip tag={tag} />
              <span className="text-[12px] text-muted">{TAG_SCOPE_LABEL[tag.appliesTo]}{!tag.isActive && ' | Desativada'}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{tag.keywords.length > 0 ? tag.keywords.join(', ') : 'Só manual'}</span>
              {canManage && <Button variant="secondary" className="min-h-9 px-3 text-[13px]" onClick={() => setEditing(tag)}>Editar</Button>}
            </div>
          ),
        )}
        {!canManage && <p className="text-[12px] text-muted">Editar etiquetas e prazos é só para administrador ou head.</p>}
      </section>
    </>
  )
}
