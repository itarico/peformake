// "Baixar PDF" do diagnóstico: abre uma página limpa para imprimir ou salvar em PDF (sem servidor).
type Doc = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const ul = (items?: unknown[]) => (items?.length ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '')
const WHO: Record<string, string> = { cliente: 'Cliente', peformake: 'Peformake', juntos: 'Juntos' }

/** HTML do documento (puro: testável). */
export function consultHtml(name: string, doc: Doc): string {
  const r = doc.resumo ?? {}, d = doc.diagnostico ?? {}, c = doc.comunicacao ?? {}, p = doc.plano ?? {}
  const sw = d.swot ?? {}
  const parts = [
    `<header><p class="k">Diagnóstico e plano de ação · Peformake</p><h1>${esc(name)}</h1><p class="m">${esc(new Date(doc.gerado_em ?? Date.now()).toLocaleDateString('pt-BR'))}</p></header>`,
    `<section><h2>Resumo</h2><h3>${esc(r.titulo)}</h3><p>${esc(r.situacao)}</p><p><b>Maturidade digital:</b> ${esc(r.nota_maturidade)}/10</p><h4>Decisões</h4><ol>${(r.decisoes ?? []).map((t: string) => `<li>${esc(t)}</li>`).join('')}</ol><p class="hl"><b>Primeiro passo:</b> ${esc(r.primeiro_passo)}</p></section>`,
    `<section><h2>Diagnóstico</h2><h4>O negócio hoje</h4><p>${esc(d.negocio?.texto)}</p>${ul(d.negocio?.pontos)}
      <div class="swot"><div><h4>Forças</h4>${ul(sw.forcas)}</div><div><h4>Fraquezas</h4>${ul(sw.fraquezas)}</div><div><h4>Oportunidades</h4>${ul(sw.oportunidades)}</div><div><h4>Ameaças</h4>${ul(sw.ameacas)}</div></div>
      <h4>Mercado e concorrentes</h4><p>${esc(d.mercado?.texto)}</p>${ul((d.mercado?.concorrentes ?? []).map((x: Doc) => `${x.nome}: ${x.o_que_fazem}`))}
      <h4>Público</h4><p><b>${esc(d.publico?.persona?.nome)}</b> ${esc(d.publico?.persona?.quem_e)}</p><p><b>Cliente ideal:</b> ${esc(d.publico?.icp)}</p>
      <h4>Proposta de valor</h4><p>${esc(d.proposta_valor?.texto)}</p>${ul(d.proposta_valor?.diferenciais)}
      <h4>Presença digital (${esc(d.presenca_digital?.nota)}/10)</h4>${ul((d.presenca_digital?.itens ?? []).map((x: Doc) => `${x.canal}: ${x.observacao}`))}
      <h4>Funil</h4><p>${esc(d.funil?.texto)}</p></section>`,
    `<section><h2>Tom e comunicação</h2><p class="hl">${esc(c.essencia)}</p><p>${esc(c.proposito)}</p>
      ${ul((c.tom ?? []).map((t: Doc) => `${t.adjetivo}: “${t.exemplo}”`))}<h4>O que evitar</h4>${ul(c.evitar)}
      <h4>Expressão da marca</h4><p><b>Paleta:</b> ${esc(c.expressao?.paleta)}<br><b>Ambiente:</b> ${esc(c.expressao?.ambiente)}<br><b>Presença:</b> ${esc(c.expressao?.presenca)}</p>
      <p class="hl">${esc(c.regra_teste)}</p>
      <h4>Experiência do cliente</h4>${ul((doc.experiencia ?? []).map((m: Doc) => `${m.momento}: ${m.como_deve_ser}`))}</section>`,
    `<section><h2>Plano de ação</h2><p class="hl"><b>Prioridade:</b> ${esc(p.prioridade)}</p>${(p.fases ?? []).map((f: Doc) => `<h4>${esc(f.periodo)}: ${esc(f.objetivo)}</h4><ol>${(f.passos ?? []).map((s: Doc) => `<li><b>${esc(s.acao)}</b> (${esc(WHO[s.quem] ?? s.quem)}) ${esc(s.como)}</li>`).join('')}</ol>`).join('')}
      <h4>Números para acompanhar</h4>${ul((p.indicadores ?? []).map((n: Doc) => `${n.nome}: ${n.meta}`))}</section>`,
    `<section><h2>Riscos</h2>${ul((doc.riscos ?? []).map((x: Doc) => `${x.risco} (impacto ${x.impacto}). Como evitar: ${x.como_evitar}`))}</section>`,
    `<section><h2>O que precisamos de você</h2><ol>${(doc.do_cliente ?? []).map((x: Doc) => `<li>${esc(x.pergunta)}</li>`).join('')}</ol></section>`,
  ]
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Diagnóstico · ${esc(name)}</title><style>
    body{font:14px/1.5 system-ui,sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px}
    h1{font-size:28px;margin:0}h2{font-size:20px;border-bottom:2px solid #0b7285;padding-bottom:4px;margin-top:28px}h3{font-size:17px}h4{margin:14px 0 4px}
    .k{color:#0b7285;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.06em;margin:0}.m{color:#666;margin:2px 0 0}
    .hl{background:#e6f6f8;padding:8px 12px;border-radius:10px}.swot{display:grid;grid-template-columns:1fr 1fr;gap:8px}.swot>div{background:#f4f6f7;border-radius:10px;padding:4px 12px}
    section{break-inside:auto}h2{break-after:avoid}@media print{body{margin:0}}
  </style></head><body>${parts.join('')}</body></html>`
}

export function printConsultDoc(name: string, doc: Doc) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(consultHtml(name, doc))
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}
