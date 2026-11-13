# Gerador dos documentos do Estudo do mês (PDF + HTML)

Código que monta os PDFs e HTML no design aprovado (Peformake; audiovisual Ellcazo). Usado pela skill `.claude/skills/peformake-estudo-mes`.
Sem miniaturas, fotos nem PDFs de clientes (ficam fora do repositório; o agente baixa de novo a cada estudo).

- `_base.js`, `style.css`, `logo.b64`: base visual (capa, cartões, páginas `<section class="pg">`).
- `build3.js` (Fornario/VOVINA/Brio), `sn.js`, `raph.js`, `pf.js` + `pf_posts.js` + `pf_traf.js` + `pfav2.js` (Peformake): um arquivo por cliente/documento, com o conteúdo do estudo.
- `brio.js` (estratégia + social), `brio_av.js` + `brio_av.css` (audiovisual com estilos E# e modelos M#), `brio_data.js`, `brio_posts.js`, `brio-shot.js` (Brio, 13/11; miniaturas em `scratchpad/brio2/th`).
- `av.js`/`roteiros.js` (audiovisual), `sm.js` (social media), `trafego.js`, `analise.js`, `com.js` (comunicação/fotos).
- `*-shot.js`: screenshots de conferência (Playwright em /opt/node-tools).
- `subir2.py`: sobe para a pasta do cliente pela função agent-upload (`python3 -I subir2.py <token> <client_id> <pasta> "<nome>" <arquivo> <mime>`; token curto de `agent_upload_tokens`).
- `paulo/`: o deck aprovado (estratégia Nov–Dez do Paulo), modelo do design.

Atenção: os caminhos de imagens e saídas apontam para o scratchpad da sessão que gerou (`.../scratchpad/entregas/`). Ao rodar em outra sessão, ajuste a pasta de saída e baixe as miniaturas de novo.

## Peformake v2 (13/11/2026, refeito pela skill com o padrão de tráfego)
- `pfk.js`: kit comum (lê `pf_kit3.js`, cópia congelada do `build3.js`), CSS extra e o banco de anúncios de referência.
- `pf2.js` (Estratégia, 19 pág.), `pf_venda.js` (Plano de vendas), `pf_traf2.js` (Tráfego por oferta + banco de ofertas), `pf_social2.js` + `pf_posts2.js` + `pf_sm.js` (social com referências de arte), `pfav3.js` (audiovisual com estilo E# e modelo M#).
- `pf2-shot.js pdf '' estrategia,trafego` gera PDF e screenshots; `pf-sheet.py` monta folha de conferência.
