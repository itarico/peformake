Projeto Peformake (repositório itarico/peformake, branch claude/performig-app-data-hxl4zh; app em peformake-gestao/; Supabase wkkzcjnxyylrqoolmmhi). Leia primeiro o CLAUDE.md da raiz e as 3 entradas mais recentes de peformake-gestao/docs/rotina-diario.md. Faça `git pull` antes de tudo.

Tarefa: resolver as pendências TÉCNICAS abaixo (nenhuma depende do Italo). Não gere estudos/documentos de cliente, não mande nada a cliente, não gaste dinheiro, não mexa em segredos nem no DNS.

1. Dossiê do estudo não grava: o motor de roteiro manda gravar o dossiê em `client_scan` com `source = 'dossie'`, mas a checagem `client_scan_source_check` recusa. Ajuste a constraint (migração nova em peformake-gestao/supabase/migrations/, aplicada com mcp__Supabase__execute_sql; nunca apply_migration; evite DELETE/DROP de tabela) para aceitar 'dossie', e confira que o motor/instruções gravam certo.
2. Motor de roteiro: passar a gravar no card os campos `montagem`, `captar`, `edicao` e `extras` (a tela e o PDF já leem; veja docs/MOTOR-ROTEIRO.md, docs/PROMPT-ROTEIRO-MASTER.md, `agent_instructions` no banco e a função/edge que gera o roteiro). A rotina que gera roteiro deve ler o prompt 'roteiro-master' por módulo.
3. Telas: mostrar `estrutura`, `derivados`, `notas` e `intencao` do roteiro acima de "Ver detalhes" (veja scriptRules.ts e as telas do audiovisual/estratégia), seguindo as regras de interface do CLAUDE.md (pop-up sem rolagem; medir com `PORT=5199 node e2e/popups.cjs`).
4. Domínio novo (preparar, sem ligar): liste todos os lugares com o link fixo `peformake-gestao.vercel.app` (código: teamRules.ts, member-access etc.; banco: funções SQL de pagar/portal/peça, `av_settings.site_url`, `notify(...)`). Centralize num único valor configurável (ex.: chave em configurações/constante) para trocar para https://peformake.com num passo só quando o DNS propagar. Não troque ainda.

Antes de publicar: `npx tsc -b --noEmit` e vitest em peformake-gestao. Commit em português terminando com:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
push na branch e deploy (`npx vercel deploy --prod --yes` em peformake-gestao; publicar em lote, uma vez). Uma linha no topo do rotina-diario.md com o que foi feito e o que ficou pela metade. No fim, me responda em português simples, curto: o que mudou para quem usa, o link e o que ficou pendente.
