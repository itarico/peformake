/**
 * O navegador não sugere dados pessoais salvos (CPF, endereço, telefone do próprio usuário) nos campos do sistema.
 * Todo <input>/<textarea> sem autocomplete definido recebe autocomplete="off". Campo que precisa do preenchimento
 * do navegador (login, senha, dados do próprio cliente no portal) declara o seu autoComplete e fica como está.
 */
const SKIP = new Set(['password', 'checkbox', 'radio', 'file', 'hidden', 'submit', 'button', 'range', 'color'])

function mark(root: ParentNode) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([autocomplete]), textarea:not([autocomplete])').forEach((el) => {
    if (el instanceof HTMLInputElement && SKIP.has(el.type)) return
    el.setAttribute('autocomplete', 'off')
  })
}

export function installNoAutofill(doc: Document = document) {
  if (typeof MutationObserver === 'undefined' || !doc.body) return () => {}
  mark(doc)
  const obs = new MutationObserver((list) => {
    for (const m of list) m.addedNodes.forEach((n) => { if (n instanceof Element) { if (n.matches('input, textarea')) mark(n.parentElement ?? doc); else mark(n) } })
  })
  obs.observe(doc.body, { childList: true, subtree: true })
  return () => obs.disconnect()
}
