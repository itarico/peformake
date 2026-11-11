import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { bestMatches, sameOption, tidyLabel } from './searchMatch'

/**
 * Campo de escolha com busca (troca o <datalist> do navegador).
 * A pessoa digita e aparecem só as opções mais próximas (sem acento, sem maiúscula, aceita erro de digitação);
 * seta ou toque escolhe; "+ Adicionar" quando não existe igual. A lista flutua sobre a tela, sem aumentar o pop-up.
 * autoComplete desligado: o navegador não sugere dados pessoais salvos (CPF, endereço) aqui.
 */
export function SearchSelect({ id, value, onChange, options, placeholder = 'Digite para buscar', allowNew = true, limit = 6, className, invalid, describedBy, name, disabled, tidy = true, filter = true, renderOption, onTextChange, format, addLabel, inputMode }: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  /** Mostra "+ Adicionar “texto”" quando não há opção igual. */
  allowNew?: boolean
  limit?: number
  className?: string
  invalid?: boolean
  describedBy?: string
  /** Nome do campo (não use nomes genéricos como "name" ou "address": o navegador sugeriria dados salvos). */
  name?: string
  disabled?: boolean
  /** Padroniza a primeira letra maiúscula do que for adicionado (desligue para valores em minúsculas). */
  tidy?: boolean
  /** false: as opções já vêm filtradas de fora (busca no banco); o campo só mostra até `limit`. */
  filter?: boolean
  /** Desenho de cada opção (foto, etiqueta). O valor escolhido continua sendo o texto da opção. */
  renderOption?: (label: string) => ReactNode
  /** Avisa o que está sendo digitado (para buscar no banco). */
  onTextChange?: (text: string) => void
  /** Ajusta o texto digitado ao usar/adicionar (ex.: máscara de telefone). */
  format?: (text: string) => string
  /** Texto do item de adicionar (padrão: Adicionar “texto”). */
  addLabel?: (text: string) => string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const auto = useId()
  const inputId = id ?? auto
  const listId = `${inputId}-opcoes`
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [typed, setTyped] = useState(false)
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null)

  useEffect(() => { if (!open) setText(value) }, [value, open])

  const query = typed ? text : ''
  // Lista curta (até 8) aparece inteira ao abrir; lista longa mostra só as mais próximas do que foi digitado.
  const matches = useMemo(() => (filter ? bestMatches(query, options, !query && options.length <= 8 ? 8 : limit) : options.slice(0, limit)), [filter, query, options, limit])
  const exact = sameOption(text, options)
  const canAdd = allowNew && typed && !!text.trim() && !exact
  const clean = (t: string) => (format ? format(t) : tidy ? tidyLabel(t) : t.replace(/\s+/g, ' ').trim())
  const items: { label: string; add?: boolean }[] = [...matches.map((label) => ({ label })), ...(canAdd ? [{ label: clean(text), add: true }] : [])]

  // Lista flutuante presa à tela: abre para baixo ou, sem espaço, para cima.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = inputRef.current?.getBoundingClientRect()
      if (!r) return
      const vh = window.visualViewport?.height ?? window.innerHeight
      const below = vh - r.bottom - 8
      const above = r.top - 8
      const want = Math.min(items.length * 46 + 8, 6 * 46 + 8)
      if (below >= Math.min(want, 200) || below >= above) setBox({ left: r.left, width: r.width, top: r.bottom + 4, maxHeight: Math.max(120, below) })
      else setBox({ left: r.left, width: r.width, bottom: vh - r.top + 4, maxHeight: Math.max(120, above) })
    }
    place()
    window.addEventListener('resize', place)
    window.visualViewport?.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.visualViewport?.removeEventListener('resize', place); document.removeEventListener('scroll', place, true) }
  }, [open, items.length])

  const choose = (label: string) => {
    onChange(label)
    setOpen(false)
    setTyped(false)
  }
  const commitTyped = () => {
    const t = text.trim()
    if (!t) { if (value) onChange(''); return }
    const same = sameOption(t, options)
    if (same) { if (same !== value) onChange(same); setText(same); return }
    if (allowNew) { const label = clean(t); if (label !== value) onChange(label); setText(label) } else setText(value)
  }

  return (
    <div className="relative min-w-0">
      <input
        ref={inputRef}
        id={inputId}
        name={name ?? `pf-busca-${inputId}`}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-1p-ignore=""
        data-lpignore="true"
        disabled={disabled}
        inputMode={inputMode}
        value={text}
        placeholder={placeholder}
        onChange={(e) => { setText(e.target.value); setTyped(true); setOpen(true); setActive(0); onTextChange?.(e.target.value) }}
        onFocus={() => { setOpen(true); setTyped(false); setActive(0) }}
        onClick={() => setOpen(true)}
        onBlur={() => { setOpen(false); if (typed) commitTyped(); setTyped(false) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter' && open && items[active]) { e.preventDefault(); choose(items[active]!.label) }
          else if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); setText(value); setTyped(false) }
          else if (e.key === 'Tab' && open && typed && items[active] && !items[active]!.add) { choose(items[active]!.label) }
        }}
        className={cn('min-h-11 w-full rounded-xl border border-line-strong bg-surface py-2 pl-3 pr-10 text-ink', invalid && 'border-2 border-warn', className)}
      />
      <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      {open && items.length > 0 && box && (
        <ul
          id={listId}
          role="listbox"
          style={{ position: 'fixed', left: box.left, width: box.width, top: box.top, bottom: box.bottom, maxHeight: box.maxHeight }}
          className="z-[60] overflow-y-auto rounded-2xl border border-line bg-surface p-1 shadow-xl [scrollbar-width:thin]"
          onMouseDown={(e) => e.preventDefault()}
        >
          {items.map((item, i) => (
            <li
              key={(item.add ? '+' : '') + item.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={(e) => { e.preventDefault(); choose(item.label) }}
              className={cn('flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-[15px]', i === active ? 'bg-raised' : '', item.add && 'font-semibold text-accent-ink')}
            >
              {item.add ? <><Plus size={15} aria-hidden="true" /> {addLabel ? addLabel(item.label) : <>Adicionar “{item.label}”</>}</> : renderOption ? renderOption(item.label) : item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
