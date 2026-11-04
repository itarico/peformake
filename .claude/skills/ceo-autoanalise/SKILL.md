---
name: ceo-autoanalise
description: >-
  Loop de autoaprimoramento do copiloto-CEO: audita as próprias skills, encontra
  lacunas de conhecimento ou de dado, compara com o que o negócio precisa agora,
  busca/instala novas skills e plugins, escreve patches e registra a evolução.
  Use quando disser "autoanálise", "se aprimora", "o que te falta", "melhora
  suas skills", "baixa mais skills", "revisa o sistema", "você está genérico",
  ou ao fim de cada revisão trimestral.
---

# CEO AUTOANÁLISE — o copiloto também é objeto de melhoria

Roda em ciclos. Só termina quando o checklist de saída estiver todo verde.

## Ciclo

1. **Inventário** — liste skills ativas (`ListSkills`, `~/.claude/skills`,
   `.claude/skills/` deste repo), plugins (`ListPlugins`) e conectores disponíveis
   (Supabase, Drive, Gmail, Calendar, Windsor.ai, Canva, Gamma, Figma, Stripe...).
2. **Mapa de cobertura** — para cada função de CEO, marque coberto / parcial / falta:
   estratégia · finanças · precificação · vendas · marketing · conteúdo · retenção ·
   operação · pessoas · produto (SaaS) · jurídico/contratos · dados/BI · tecnologia/
   segurança · capital/patrimônio · liderança pessoal.
3. **Mapa de dados** — o que o CEO precisa medir e de onde vem; marque o que não
   existe ou está sujo (ex.: canal de aquisição vazio, NPS não preenchido).
4. **Lacunas → ações**: para cada "falta",
   - existe plugin/skill no catálogo? (`SearchPlugins`, `SearchSkills`) → sugerir
     instalação com `SuggestPluginInstall`;
   - não existe → escrever skill nova em `.claude/skills/<nome>/SKILL.md`;
   - é falta de dado → virar tarefa de sistema/processo no diagnóstico.
5. **Teste de qualidade** — rode 3 perguntas reais do Italo contra as skills e
   verifique: usou número real? terminou em ação com dono e prazo? cortou algo?
   passou no teste da boca? Cada falha vira um **Patch N** registrado abaixo.
6. **Registro** — atualize `references/registro-evolucao.md` com data, o que
   mudou, por quê, e a próxima revisão.

## Checklist de saída (todos verdes para encerrar o ciclo)

- [ ] Toda função de CEO tem uma skill dona ou plugin sugerido
- [ ] Toda recomendação do último diagnóstico tem métrica e fonte de dado
- [ ] Os 3 testes de qualidade passaram
- [ ] Registro de evolução atualizado com data da próxima revisão

## Limites honestos

- Não é possível "baixar" skills da internet de forma arbitrária: instala-se pelo
  catálogo de plugins (o Italo clica no cartão) ou escreve-se a skill aqui.
- Skills sincronizadas do claude.ai são somente leitura nesta sessão; melhorias
  nelas saem como arquivo novo para reinstalar.
