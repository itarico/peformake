# Em andamento (passagem de bastão entre PC e nuvem)

Este arquivo aparece sozinho ao abrir qualquer sessão. Quem parar no meio de uma tarefa escreve aqui
o próximo passo exato, faz commit e push. Quem terminar a tarefa apaga o item.

## Pendências técnicas (dossiê, campos do roteiro, telas, domínio)
- Onde parou: só levantamento, nada alterado no código nem no banco (nuvem, 19/11).
- Próximo passo: seguir `peformake-gestao/docs/PROMPT-PENDENCIAS-TECNICAS.md` do item 1 ao 4.
- Domínio: em 19/11 o peformake.com ainda apontava para a Lovable. Não trocar links antes de conferir.

## Social/Design: prioridade e prazo por tipo de arte (19/11)
- Onde parou: migração pronta em `peformake-gestao/supabase/migrations/20261120020000_design_prazo_prioridade_desempenho.sql`, NÃO aplicada (a sessão do PC recusa a ferramenta do Supabase quando o Italo está no Controle Remoto).
- Próximo passo: com o Italo no PC (ou ele cola no editor de SQL do Supabase), aplicar a migração; depois ligar nas telas: botão Prioridade na peça e no cartão (content_item_priority), coluna priority em ITEM_COLUMNS e designQueue ordenando prioridade primeiro, pop-up "Prazos por tipo" na aba Design (design_sla_save, design_settings.sla_hours) e trocar o cálculo do painel do designer por design_stats.

