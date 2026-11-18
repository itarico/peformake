# Motor de roteiro (audiovisual): o que a IA segue

Versão operacional de `ESTUDO-ROTEIRO-AUDIOVISUAL.md` (o porquê está lá). O texto completo para a IA executar é
`PROMPT-ROTEIRO-MASTER.md` (também no banco: `select public.agent_instructions('roteiro-master');`). Radar e
calendário: `RADAR-TENDENCIAS.md`. Teste aplicado: `TESTE-ROTEIROS-SN.md`.

**Regra do Italo (18/11/2026): é proibido gerar roteiro simples ou genérico.** Todo roteiro passa por um pipeline de
especialistas, com a **espinha do MDD** (Método De Dentro: verdade → causa → história → cena → negócio, e os 5 filtros).
Nada vai ao cliente; a equipe aprova.

## O pipeline (em ordem; cada etapa entrega uma saída curta que a próxima lê)

| # | Papel | Camada MDD | Entra | Sai |
|---|---|---|---|---|
| 0 | **Dossiê** | Verdade | contexto do sistema (consultas do prompt mestre), site, perfil, Google, portfólio, cache do mês | dossiê (negócio, produtos e como funcionam, preços, equipe e quem aparece, local e área, reputação e palavras reais do público, dono × como o cliente enxerga, comunicação atual, mapa dor → conteúdo → formato) |
| 0b | **Portão de conhecimento** | Verdade | dossiê | nota 0–10 em 11 itens; **< 7: não gera roteiro final**; lista lacunas, tenta preencher, gera perguntas e marca suposições |
| 1 | **Estrategista** | Verdade + Causa + Negócio | dossiê, identidade, personas, metas, radar e calendário, desempenho (tráfego/social) | Repertório + Eixo (Motor Autoral), tese do mês, personas (uma por público), mix do mês por papel, objetivo, fase de consciência, linguagem e alvo; cada vaga diz se é **do momento** (com validade) ou **perene** |
| 2 | **Curador de referências** | História | mix, radar, acervo (`video-tools/`), Biblioteca de Anúncios, TikTok Creative Center, web | 2–3 candidatas por vídeo com nota (5 critérios); escolhida ≥ 7 e aderência ≥ 3; engenharia reversa (gancho, batidas, prova, oferta, CTA, linguagem, mecanismo); ≥ 1 referência de fora do nicho no mês; descartadas com motivo |
| 3 | **Ideação barata** | História | tudo acima | 10–15 loglines (SCAMPER); filtro com nota; a equipe ou o crítico escolhe 4–8; **só as escolhidas seguem** |
| 4 | **Copywriter** | Negócio | logline escolhida, persona, nível de consciência | promessa, 3–5 ganchos (chamam a persona, concretos, sem som), argumentos (FAB), objeção tratada, oferta (Hormozi; escassez só verdadeira), CTA (suave ou direto pela fase) |
| 5 | **Roteirista** | História + Cena | copy, persona, identidade, referência | logline, premissa, frase-alma, intenção (emoção + efeito), arco/beat sheet por duração, **fala contínua palavra por palavra** de quem aparece (cada frase com função; mas/portanto), perguntas + pontos pra resposta espontânea (entrevista), fecho que responde o gancho |
| 6 | **Diretor (videomaker)** | Cena | roteiro | linguagem visual, planos e lentes por bloco, câmera, luz, som, local e horário, quem precisa estar, **diária Ellcazo × celular**, shot list, plano da diária, cola de tópicos para quem fala |
| 7 | **Editor** | Cena | roteiro + direção | ritmo (quebra a cada 3–5 s no curto), cortes (J/L, match), B-roll = o que é dito, motion (skill `motion-pro`), legenda e texto na tela sem som, trilha e sound design, derivados (reel, story, anúncio 15 s, Shorts, carrossel), pacote de publicação (capa, 1ª linha, legenda, CTA nos comentários) |
| 8 | **Interrogatório interno** | os 5 filtros | tudo | por quê / como / onde / quando / com quem / para quem / e se tirar? para cada decisão (vídeo, persona, objetivo, estrutura, gancho, cada frase, plano, local, horário, quem aparece, trilha, CTA, formato); sem resposta sólida → refaz ou corta. Oculto (auditoria) |
| 9 | **Crítico** | todos | roteiro final | nota criativa (rubrica abaixo), comparação com os benchmarks da referência, checagem de humor (se houver), sinais de rede (salvar/enviar/comentar), "vende sem parecer venda?" |
| 9b | **Checagem de fidelidade** | Verdade | roteiro × dossiê, briefing, identidade, proibidos | cada afirmação, produto, preço, condição, nome, horário, promessa e tom conferidos; sem fonte → [a confirmar] ou corta; nota de fidelidade separada |
| 9c | **Avaliador às cegas** | — | só o roteiro + a persona (sem as notas do crítico) | nota independente; diferença > 1,5 ponto do crítico = revisão |
| 10 | **Loop** | — | notas | abaixo do mínimo: volta à etapa que derrubou (máx. 2 rodadas); depois disso grava com a lacuna explicada em `suposicao` |

## Notas e mínimos
- **Portão de conhecimento** (0–10): negócio/modelo, produtos e como funcionam, preços/ofertas, público e quem
  decide, dores do diagnóstico, voz da marca e do dono, o que o público diz, equipe/quem aparece, restrições/
  proibidos, dados de performance, calendário. **Mínimo 7.**
- **Rubrica criativa** (0–10 cada; geral = média; **mínimo 8,5 e nenhum critério < 7**): aderência ao cliente e à
  persona/modelo de negócio · originalidade · **autenticidade** (≥ 2 marcas do cliente, passa na troca de logo) · força
  do gancho · clareza da fala · construção narrativa · viabilidade de gravar · potencial de conversão/objetivo
  (vende sem parecer venda; provoca o sinal certo: salvar, enviar, comentar) · diversidade no mês. Humor: + nota de
  humor ≥ 8.
- **Fidelidade** (0–10): **mínimo 9**; qualquer dado inventado = 0 até corrigir.
- **Referência:** (2×aderência + estrutura + prova + viabilidade + originalidade) ÷ 3; mínimo 7 e aderência ≥ 3;
  referência global explica por que funciona com o público brasileiro/local.

## Mix do mês (regras)
Papéis: sempre apresentar, objeção, prova e oferta; resto varia. Linguagens: no máximo 2 iguais (vale a linguagem,
não o rótulo); ≥ 1 cinemático/documental da diária Ellcazo; ≥ 1 de celular quando fizer sentido; humor considerado
sempre que combina com a identidade. Fases de consciência misturadas (30/40/25/5). ~60 % construção / ~40 % conversão
(ajusta pela meta). 70/20/10 (o que funciona / variação / experimento). Nada repetido no mês nem dos meses anteriores
nem de outro cliente.

## Custo
Ideias curtas primeiro; pipeline completo só nas escolhidas. Modelo leve para coleta, resumo e radar; o melhor modelo
para escrita, crítica e fidelidade. Dossiê e contexto do mês em cache (`client_scan`, `source`='dossie' e
'contexto_roteiro') e reaproveitados em todas as gerações do mês.

## Formato no card (aba audiovisual, tipo video) — sem mudar telas
Campos que já existem (não mudar): `formato`, `ideia`, `ganchos` (3), `roteiro` [{`cena`, `fala`}], `outras_ideias` (3),
`referencia` {`link`, `porque`}, `cruzamento`, `filmar`; no card: `funil`, `serve`, `meta`, `inspirado`, `suposicao`.
- `roteiro`: **cada item é um bloco do arco** (3–7): `cena` = direção em CAIXA ALTA; `fala` = bloco contínuo com o nome
  de quem fala ("SANDRA: …").
- `ganchos`: os 3 melhores (os 3–5 de anúncio ficam em `producao.ganchos_anuncio`).
- `suposicao`: inclui as notas visíveis curtas ("Criativa 8,9 · Fidelidade 9,5 · Conhecimento 7,5").
Campos **extras** dentro de `data` (a tela ignora; o PDF e a equipe leem):
- Visíveis/curtos: `por_que_existe` (1 frase), `intencao` {`emocao`, `efeito`}, `papel`, `linguagem`, `persona`,
  `identificacao` (o "isso sou eu" usado), `momento` ('perene' ou {`validade`}), `nasceu_de` [{`fonte`, `dado`}],
  `marcas_autenticidade` [..], `notas` {`criativa`, `fidelidade`, `conhecimento`, `resumo`}.
- Produção: `producao` {`plano_diaria`, `shot_list`, `cola` [tópicos por bloco], `ganchos_anuncio` [3–5],
  `derivados` [..], `publicacao` {`capa`, `primeira_linha`, `legenda`, `cta_comentario`}, `pos_video` {`palavra`,
  `resposta`}}.
- Ocultos (auditoria, "Ver detalhes"): `auditoria` {`etapas` {dossie, conhecimento, estrategista, curador, copy,
  roteirista, diretor, editor}, `interrogatorio` [{`pergunta`, `resposta`}], `critico` {itens, benchmark,
  justificativa}, `fidelidade` [{`afirmacao`, `fonte`, `status`}], `cego` {nota, comentario}, `rodadas`},
  `referencia_nota` {aderencia, estrutura, prova, viabilidade, originalidade, nota, descartadas}, `perguntas`
  [{`pergunta`, `pontos`}], `frase_alma`, `logline`, `arco`, `duracao_s`.

## Aprender com o Italo
Cada recusa (`reject_reason`), refação (`redo_pedido`) e edição vira uma linha em `content_rules` ou no arquivo de
aprendizados: "qual instrução teria evitado esta nota?". O crítico calibra a nota prevista com o resultado real
quando houver (fase 2).
