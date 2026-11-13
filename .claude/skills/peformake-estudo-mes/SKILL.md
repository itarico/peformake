---
name: peformake-estudo-mes
description: Gera o estudo completo do mês de um cliente da Peformake em 3 etapas encadeadas — (1) diagnóstico e estudo, (2) estratégia mensal, (3) peças: social media, design, audiovisual, tráfego e venda — em PDF + HTML no design aprovado, sobe na pasta do cliente como "Para aprovar". Use quando pedirem "estratégia do mês", "planejamento do cliente X", "estudo do mês", "refazer o audiovisual/social de X", ou na rotina dos dias 11 a 15.
---

# Peformake · Estudo do mês

Estrutura definida pelo Italo em 13/11/2026: **primeiro o diagnóstico e todo o estudo, depois a estratégia mensal, e só então as peças** (social media, design, audiovisual, tráfego e venda). Nada nasce solto: cada etapa só começa com a anterior pronta e cada peça declara de qual parte da estratégia ela vem.

Regras que valem acima de tudo: `CLAUDE.md` (regra de ouro, identidade visual, Peformake é assessoria, nunca vilanizar o tráfego pago, nada vai ao cliente sem um humano). Passo a passo operacional (fila, upload, prazos): `peformake-gestao/docs/ROTINA-ESTRATEGIA-MENSAL.md`.

```
ETAPA 1  Diagnóstico e estudo  ──►  ETAPA 2  Estratégia mensal  ──►  ETAPA 3  Peças
(o que é verdade hoje)              (o que vamos fazer e por quê)      (como executar)
                                                                       ├ Social media
                                                                       ├ Design
                                                                       ├ Audiovisual
                                                                       ├ Tráfego
                                                                       └ Venda
                    ◄──────────── ETAPA 4  Aprender com o resultado (mês seguinte) ◄─┘
```

---

## Etapa 1 · Diagnóstico e estudo

Objetivo: saber o que é verdade hoje, com números. Saída: o **Dossiê do estudo** (interno, não vai ao cliente; resumo entra na Estratégia).

### 1.1 O que o sistema já sabe (Supabase `wkkzcjnxyylrqoolmmhi`, só leitura)
Ordem de prioridade (o de cima manda no de baixo):
1. `client_meeting_notes` com `done_at` nulo: o que o Italo anota na faixa **Reunião** (Estratégia → Consultoria → cliente → "Anotar") durante a reunião com o cliente. Marcar `done_at` depois de aplicar no documento.
2. `client_directions` (direcionamento da equipe por área).
3. `clients`, `client_services`, `client_team`, `company_profiles` (Peformake/Ellcazo).
4. `consult_docs` (diagnóstico anterior), `client_brand_guides`, `client_brand_voice`, `client_questions` respondidas.
5. Comercial e conversas: CRM, mensagens de WhatsApp (perguntas e objeções reais do público).
6. Resultado: `traffic_daily_metrics`, `traffic_entities`/`traffic_entity_daily`, `content_items`, `social_tasks`, `av_projects`, relatórios anteriores.
7. Coleta automática: `client_scan`, `monthly_scan_extra` (rotina "Coleta das redes" da madrugada).

### 1.2 Estudo de mercado (fora do sistema)
| Bloco | O que levantar | Ferramenta |
|---|---|---|
| Anúncios | os 10 anúncios ativos há mais tempo do nicho na cidade: promessa, gancho 0–3 s, prova, oferta, CTA; o que todos dizem × espaço vazio | ADS `ads_library_search` |
| Tendência e momento | o que viralizou nos últimos 30 dias no nicho (formato, gancho, áudio, tema) e as datas do período; o que já cansou | Firecrawl scrapecreators (`instagram/search-reels`, `tiktok/search-videos`, `instagram/user-posts`), YouTube Shorts |
| Concorrentes | 3 a 5 perfis: ritmo, formatos, o que engaja, preço/oferta | Firecrawl, Instagram do cliente (ADS `ads_get_ig_media` quando conectado) |
| Público | como o público fala: comentários, avaliações, perguntas no WhatsApp | Supabase, Firecrawl |
| Nicho novo | pesquisa profunda | skill `anthropic-skills:deep-research` |

Teto do Firecrawl: 40 créditos por cliente. Referência só vale com **link, visualizações e o porquê de funcionar** (nunca escolhida pelo título).

### 1.3 Diagnóstico
Skills: `anthropic-skills:diagnostico-cliente-agencia`, `anthropic-skills:frameworks-marketing-agencia` (SWOT, persona, funil, posicionamento).
Entrega: score de maturidade, forças/fraquezas/oportunidades/ameaças, persona, funil atual medido, 3 números que mais importam, red flags.

**Portão 1** (só passa se): tem números reais do sistema; anúncios e tendências com fonte; anotações da reunião lidas.

---

## Etapa 2 · Estratégia mensal

Objetivo: decidir o que fazer no mês e por quê. Saída: **Estratégia do mês** (pasta `estrategia`, identidade Peformake). Skills: `anthropic-skills:estrategia-360-agencia`, `anthropic-skills:frameworks-marketing-agencia`, `anthropic-skills:italo` (como o Italo decide).

Conteúdo obrigatório (poucas páginas, gráficos em vez de texto):
1. Diagnóstico embutido (1–3 páginas, números da Etapa 1).
2. **Tese do mês** em uma frase + **narrativa**: herói (o público), problema, vilão (o marketing no automático, nunca o tráfego pago), virada, prova.
3. **Ofertas com data** (entrada e principal), para quem e por que agora.
4. **Metas** medidas no sistema (conversas, pedidos, reuniões, contratos, views).
5. **Caminho de venda**: do conteúdo/anúncio até a venda, com quem responde e em quanto tempo.
6. **Cases e provas** disponíveis (com [autorização do cliente]).
7. **Calendário mestre** do período (datas comerciais, diárias de gravação, subidas de campanha).
8. Decisões para o Italo (no máximo 4, com a sugerida marcada) e próximos passos.

**Portão 2**: toda peça da Etapa 3 vai apontar para um item daqui. Se não houver tese, oferta e calendário claros, não siga.

---

## Etapa 3 · Peças (tudo puxa da estratégia)

Cada peça declara: **qual oferta ou tese serve · papel no funil (atrair, provar, quebrar objeção, converter) · meta que mede · data**. Peça que não serve a nada não entra (bastidor e humor só como embalagem de um papel). O que não se sabe fica entre [colchetes].

### 3.1 Social media + Design (pasta `social`, identidade Peformake)
Skills: `anthropic-skills:performake-content-agent`, `anthropic-skills:mdd`.
- Pilares, ritmo e calendário do mês.
- **Referências de arte (design):** para cada peça, 1 a 3 artes de referência com a **imagem (miniatura embutida) e o link** (Instagram, Pinterest, Behance, Biblioteca de Anúncios), e o que pegar de cada uma (composição, tipografia, cor, foto). Nunca só o nome.
- **10 postagens**, uma por página: referência real (miniatura, @, link, views) + formato (post, carrossel com o texto de cada tela, story, capa de reels), objetivo, ligação com a estratégia, **copy da arte** (título + texto curto), **legenda pronta** (CTA + 3 a 5 hashtags locais), direção de arte em 1 linha, data.

### 3.2 Audiovisual (pasta `audiovisual`, identidade Ellcazo: verde-limão/branco, preto só nos detalhes, nunca fundo preto)
Skills: `anthropic-skills:redator-audiovisual-agencia`, `anthropic-skills:mdd`. Repertório: **estudo de vídeos do Italo** (catálogo de estilos E1–E40, técnicas por perfil, modelos de roteiro M1–M49, manual de edição e som; hoje só no PC em `C:\Users\intal\peformake\video-tools\estilos\` — quando estiver no GitHub, usar daqui). Regra do Italo: extrair a **gramática transferível** e a **intenção antes da técnica**; aprender, não clonar.
- Página "Estudo do audiovisual" com os 6 blocos: mercado e anúncios, tendência e momento, comunicação, narrativa, estrutura e objetivo (vídeos por papel no funil), escopo (diárias, quem fala, quem grava).
- Capa minimalista, página de comunicação do cliente, referências de foto.
- **Até 10 vídeos**, uma página cada: prévia real + link + por que funciona; estilo do catálogo; papel, oferta, meta; **storytelling** (gancho, conflito, virada, CTA); **storyboard** cena a cena (o que aparece, enquadramento, fala, texto na tela, duração); quem fala, quem grava, diária, orgânico/anúncio; 3 ideias como variações do mesmo objetivo. Gastronomia: pouca fala, muito desejo; loja/serviço: mais fala e demonstração.

### 3.3 Tráfego (pasta `trafego`, só se o cliente tem tráfego)
**Siga o padrão `trafego-oferta.md` (nesta pasta):** oferta antes do anúncio, temperatura × mensagem, matriz oferta × ângulo, teto por resultado, o que acontece depois do clique e o banco de ofertas que venderam no nicho.
- **Criativos com referência:** cada criativo com 1 a 2 anúncios de referência da Biblioteca de Anúncios (imagem/miniatura embutida, link, há quanto tempo está no ar) e o que adaptar (gancho, oferta, formato).
- Campanhas, públicos, criativos ligados às peças e vídeos do mês, verba em 3 opções, testes A/B, metas, calendário de subida/pausa. Meta Ads só leitura.

### 3.4 Venda (dentro da Estratégia, seção "Venda"; vira documento próprio quando o cliente tiver o serviço comercial)
Skills: `anthropic-skills:copy-lp-vendas` (quando houver página), `anthropic-skills:frameworks-marketing-agencia`.
- Roteiro de atendimento no WhatsApp (primeira resposta, qualificação, oferta, fechamento) usando as perguntas reais do público.
- Respostas para as 5 objeções mais comuns (vindas do CRM/conversas).
- Mensagens prontas de recompra/reativação e de indicação.

**Portão 3 (conferência antes de subir)**
- [ ] Cada peça aponta para tese/oferta, papel e meta.
- [ ] Toda referência é real, com link e views.
- [ ] Nenhum valor de contrato; case só com [autorização do cliente].
- [ ] Peformake = assessoria; tráfego nunca é o vilão.
- [ ] Screenshot de cada página: nada cortado, vazio ou sobreposto.

---

## Saída: documento inteligente
- **Design dos PDFs: manter o padrão atual aprovado** (decisão do Italo, 13/11/2026). Peformake (ciano #1FC8DB, petróleo #056F84, azul-escuro #0B3C44, branco) em estratégia, social, tráfego e relatório; Ellcazo (logo, verde-limão e preto só nos detalhes) só no audiovisual. Modelo de referência: os documentos já entregues (Fornario, VOVINA, Brio, SN, Peformake). Não redesenhar.
- PDF **e** HTML com o mesmo nome (o HTML vira a Apresentação no sistema; uma página por `<section class="pg ...">`, imagens embutidas).
- Dados estruturados por página para "Virar tarefa" preencher roteiro e briefing: ver `peformake-gestao/docs/ESTUDO-DOC-INTELIGENTE.md` (estudo; aplicar quando aprovado).
- Nomes: "Estratégia · <período>", "Planejamento de social media · <período>", "Planejamento de audiovisual · <período>", "Estratégia de tráfego · <período>", "Relatório de tráfego · <período>".
- Subir e avisar: `ROTINA-ESTRATEGIA-MENSAL.md` → "Subir os PDFs". Chega como "Para aprovar"; nunca aprovar nem enviar no lugar do Italo.

## Etapa 4 · Aprender com o resultado (no mês seguinte, antes da Etapa 1)
- O que funcionou: views, conversas, pedidos por peça e por vídeo (sistema + Meta).
- Guardar as 3 melhores referências e ganchos do mês no banco do nicho; anotar o que não funcionou.
- O estudo seguinte começa por aqui.

## Gerador do design
Gerador (Node + Chromium) guardado em `peformake-gestao/tools/estudo-mes/` (veja o README de lá). Miniaturas e fotos não vão para o repositório.
