# Estudo: roteiro de vídeo que converte (Peformake + Ellcazo)

18/11/2026. **Isto é estudo, não regra.** Serve para a IA e a equipe pensarem melhor antes de escrever. Espinha: o **MDD** (§2b). A versão
operacional está em `MOTOR-ROTEIRO.md`, o prompt completo em `PROMPT-ROTEIRO-MASTER.md`, o radar em `RADAR-TENDENCIAS.md` e o teste em `TESTE-ROTEIROS-SN.md`.

### Índice de seções (o prompt mestre manda a cada etapa só as seções que ela usa)
| § | Seção | Usada por |
|---|---|---|
| 1 | Por que a SN falhou | Estrategista, Banca |
| 2 | O que os dois roteiros da equipe ensinam (Rosanne, Colégio Militar) | Roteirista, Banca (conjunto de ouro em `MOTOR-ROTEIRO.md`) |
| 2b | O MDD expandido (espinha) | Estrategista, Ideação |
| 2c | Persona primeiro | Estrategista, Copywriter |
| 2d | Inteligência de dados do sistema | Dossiê, Portão, Estrategista |
| 3 | Objetivos e papéis | Estrategista |
| 3b | Catálogo de formatos (orgânico e anúncio) | Estrategista, Curador |
| 3c | Catálogo de 117 estruturas (S1–S117) e regra de variação por cliente | Estrategista, Curador, Ideação |
| 4 | Estruturas (arcos) | Roteirista |
| 5 | Banco de ganchos por objetivo | Copywriter |
| 6 | Neuromarketing em vídeo curto | Copywriter, Editor |
| 7 | Humor em vídeo de marca | Ideação, Roteirista, Banca (só se houver humor) |
| 8 | Linguagens visuais | Estrategista, Diretor |
| 9 | Escrita: fala contínua | Roteirista |
| 10.1 | Roteiro, estrutura e cena | Roteirista, Diretor |
| 10.2 | Storytelling de marca | Roteirista |
| 10.3 | Ganchos, atenção e vídeo curto | Copywriter, Editor |
| 10.4 | Persuasão e copy | Copywriter |
| 10.5 | Mente e emoção | Estrategista, Banca |
| 10.6 | Ofício em 15–90 s, publicidade e documentário | Roteirista, Diretor |
| 11 | Conteúdo magnético | Ideação |
| 12 | Radar do momento, dossiê, trend como gancho, hype e multiplicador | Dossiê, Estrategista, Curador, Editor |
| 13 | Intenção em tudo | Roteirista, Interrogatório |
| 14 | Próximos passos (fase 2) | (nenhuma; só equipe) |
| 15 | Vender sem parecer venda | Copywriter, Banca |
| 16 | Algoritmo de cada rede | Estrategista, Editor |
| 17 | Resultado imediato × marca | Estrategista |
| 18 | Percepção de quem assiste | Banca |
| 19 | Capa, título, legenda e SEO social | Editor |
| 20 | Depois do vídeo: conversa e atribuição | Editor |
| 21 | Direção de não-atores | Roteirista (entrevista), Diretor |
| 22 | Qualidade técnica mínima | Diretor |
| 23 | Teste A/B de ganchos e fadiga | Copywriter, Editor |
| 24 | Colaborações, influenciadores e UGC | Estrategista |
| 25 | Acessibilidade | Editor |
| 26 | Limites legais e éticos | Fidelidade (Banca) |
| 27 | Humor como pilar | Roteirista, Banca (só se houver humor) |
| 28 | Identidade de cada cliente | Dossiê, Roteirista, Banca |
| 29 | Autenticidade obrigatória | Roteirista, Banca |
| 30 | Mapa de frameworks por etapa | Estrategista |
| 31 | Fontes | (nenhuma; consulta) |

Pedido do Italo: a geração de roteiro "ficou bonita, mas não funcional". O roteiro tem que ser o diferencial da casa:
ideias novas e únicas por cliente, baseadas no que já deu certo (estrutura, gancho, neuromarketing, humor), com a
comunicação que o cliente precisa e foco em conversão. "Não é regra, é estudo; é construção narrativa criativa."

Base lida: `video-tools/NARRATIVA.md`, `video-tools/estilos/` (catálogo E1–E40, `estudo_narrativas.md` com G1–G12 e
M9–M18, `estudo_mavic.md` com H1–H14 e V1–V12, `licoes_profissionais.md`), `.claude/skills/roteiro-narrativa`
(SKILL, MODELOS, `IDEIAS_MDD.md`), `.claude/skills/peformake-estudo-mes` (rubrica, banco), os 2 roteiros da equipe
(Método Visage/Rosanne e Live do Colégio Militar), os 15 cards de audiovisual da SN (dez/2026), o briefing da SN,
o estudo de estratégia da SN (`tools/estudo-mes/sn.js`) e pesquisa na web (fontes no fim).

---

## 1. Por que a SN falhou (diagnóstico com os cards reais)

São 15 cards (14 roteiros + 1 pauta de entrevista). O que aconteceu, com número:

| Problema | O que está nos cards | Causa no processo |
|---|---|---|
| **Tudo igual** | 12 de 14 roteiros são "Sandra no balcão/corredor com a peça na mão falando para o celular". Os rótulos mudam ("Reel (ensinar)", "Reel (venda)", "Série curta") mas a **linguagem** é a mesma. Nenhum cinemático, documental, institucional ou história. | A regra "no máximo 2 formatos iguais" valia para o **rótulo**, não para a linguagem visual. A IA cumpriu a letra e furou o espírito. |
| **Público errado** | 7 de 14 falam com o consumidor leigo ("quantas pessoas moram aí?", "sua caixa transborda?", "você passa veda-rosca do lado certo?", "Gente, a SN não é só hidráulica"). Só 4 falam com quem compra para obra (S8 depoimento, S9 peça que parou a obra, S10 pedido, Extra Tigre). | O briefing lista **três públicos** e a IA tratou os três como iguais. O estudo da própria Peformake (`sn.js`) já tinha decidido: "vende para quem constrói", tese "tempo de obra", oferta "Manda a lista da obra". Esse estudo **não entra** no `strategy_brief_context`, e o quadro de dezembro não tem card de tese (aba resumo vazia). A IA escreveu sem leitura do cliente. |
| **Sem cruzamento de dados** | Nenhum card diz de qual dado nasceu. A obra de Maria Farinha (prova real do briefing) aparece só como pergunta de entrevista; "consultor que visita a obra", "8h às 18h sem fechar no almoço" (o post mais curtido) e "pedido programado de janeiro" ficaram de fora dos roteiros. | O formato do card não pedia a origem. Sem campo, sem disciplina. |
| **Referência fraca** | As referências foram escolhidas por view: "nomes estranhos que os clientes pedem" (130 mil, loja de elétrica falando com leigo), glossário de engenheiro civil (112 mil, público de estudante e curioso). Na lista do briefing, um "exemplo de distribuidora que fala com construtoras" (`DN1iXAXXPQz`) é **um post da própria SN** (18 curtidas). | Busca + colar. Nenhum critério de aderência ao público do cliente. View alto de público errado vira vídeo errado. |
| **Fala picada** | S3: "Joelho: faz a curva do cano." / "Luva: emenda dois canos iguais." / "Tê: divide a água pra dois lados." Cada linha é uma legenda; não há pensamento que atravesse o vídeo. | O formato `roteiro [{cena, fala}]` com uma linha por cena **induz** a escrever uma frase por plano. |
| **Sem apresentação, sem motivo para confiar** | A Sandra se apresenta em 1 de 14 ("Oi, eu sou a Sandra, da SN" como gancho, o mais fraco possível). Nenhum vídeo explica o método (como a SN confere uma lista), nenhum traz número ou caso. | Não havia papel "apresentar/autoridade" obrigatório no mix. |
| **Fecho carimbo** | 13 de 14 terminam em "Manda a lista/me chama no WhatsApp". | CTA único é bom; o fecho idêntico em todos não é. O fecho tem que nascer da história de cada vídeo. |

Lição: a IA não falhou por falta de criatividade, falhou por **falta de leitura do cliente antes de criar** e por
um **formato de saída que empurra para o raso**. O motor corrige as duas coisas.

---

## 2. O que os dois roteiros da equipe ensinam (estudo, não modelo)

### Método Visage (Rosanne, nail designer): 4 vídeos, 4 papéis
1. **Institucional** "Unhas em gel com acabamento natural": abre na **dúvida/medo real** ("tem receio de que fique
   grossa ou artificial"), **se apresenta depois do gancho** ("Eu sou Rosanne Ventura, nail designer"), conta o
   **método** em 1ª pessoa ("antes de começar eu observo o formato da sua unha, converso…"), dá um **valor emocional**
   ("um momento pra você sentar e ter um tempo pra você") e fecha **convidando, não empurrando** ("se esse é o tipo de
   atendimento que você procura, me chama").
2. **História em 3 perguntas** "Como tudo começou": perguntas escritas **a partir da história real** (kit do Mercado
   Livre, pós em genética, a filha) e, abaixo de cada uma, **"pontos pra resposta espontânea"**: o que a pessoa deve
   lembrar de contar, sem decorar. A 3ª pergunta é cênica ("se pudesse mostrar uma unha pra Rosanne daquele primeiro
   kit, qual detalhe…?") e gera **imagem** na resposta.
3. **Carro-chefe** "Alongamento em gel fica grosso?": título = objeção do público. Uma **ação de prova** ("olha esse aqui
   de lado comigo" + direção entre colchetes "[mostra a unha de perfil]"), depois a segunda dúvida que ela ouve
   ("qual técnica é a mais resistente?") e a terceira ("estraga a unha?"), cada uma respondida com critério, não promessa.
4. **Serviços como cardápio** "Qual serviço combina com você?": em vez de listar serviços, organiza por **desejo do
   cliente** ("quer ganhar comprimento? quer reforço? quer a cor por mais tempo?") e fecha com pergunta de escolha.

O que extrair: **cada vídeo tem um papel diferente no mês**; a fala é **contínua, em 1ª pessoa, de quem aparece**;
cada frase faz uma coisa (dúvida → quem sou → como faço → por que importa → convite); a direção aparece **só onde
muda o que se vê**; nada de adjetivo vazio; o fecho é convite com pergunta.

### Live do Batalhão Escolar (Colégio Militar do Recife)
- **Contexto antes de tudo**: quem fala, onde está, o que vai acontecer e por que importa ("ser coronel-aluno é
  assumir a responsabilidade de liderar os próprios colegas").
- **Blocos com função** (abertura, cerimônia, entrevista 1, entrevista 2, comandante, encerramento) e **direção em
  caixa alta separada da fala** ("CORTA PARA O PÁTIO · MICROFONE DA APRESENTADORA FECHADO").
- **Transições escritas** ("a gente volta em instantes pra ouvir…"): o espectador nunca fica perdido.
- **Perguntas que sobem de nível**: emoção ("o que passou pela sua cabeça?") → aprendizado ("o que liderar te
  ensinou?") → mensagem ("que conselho você deixaria?").
- **Referência de linguagem nomeada** (CazéTV, abertura de Paris 2024): a equipe sabe o "jeito" sem precisar de
  parágrafo.
- Encerramento com agradecimento, ciclo ("acontece todos os anos") e despedida.

---

## 2b. O MDD expandido: a espinha de tudo

O **Método De Dentro (MDD)** é o maior estudo da casa e a base do Italo (skill `anthropic-skills:mdd`, índice v3.1;
ideias soltas D1–D78 em `.claude/skills/roteiro-narrativa/IDEIAS_MDD.md`; moldes M25–M38 em `MODELOS.md`). O motor de
roteiro **segue o MDD**; as autoridades abaixo entram para reforçar, completar ou corrigir cada camada.

**Nas palavras do método:** "marketing feito de dentro pra fora: de dentro da verdade da marca, de dentro da operação,
de dentro da própria voz. Não de longe, não de fachada, não no automático." Inimigo: **o automático, o raso, a
fachada**. Lei: "verdade vende mais que perfeição".

**Leis que valem sempre:** (1) **Duas camadas**: regra universal com [variáveis] + contexto do cliente carregado na
hora; exemplo nunca vira regra; variável essencial vazia = perguntar ou diagnosticar antes. (2) Lê a ficha antes,
salva depois. (3) Conhecimento vivo: estável (técnica, psicologia, dramaturgia) × rotativo (plataformas, trends, com
data e etiqueta CONFIRMADO/CONSENSO/HIPÓTESE; hipótese vence em 4 semanas sem teste). (4) Tudo passa pelos 5 filtros.

**Motor Autoral (gate):** sem **Repertório** (haste única, amplitude, peças reais: vivências, casos com resultado,
números próprios, cicatrizes, metáforas proprietárias, bastidor exclusivo) e sem **Eixo** (convicção central
falseável, satélites, inimigo-ideia, lista "não somos isso") **o MDD não gera, pergunta**. Gatilho do mundo +
Repertório → Eixo → **Tese**. "Não são 50 assuntos, são 50 ângulos de 1 ideia central." "Originalidade não é invenção,
é enquadramento." "Argumento não constrói autoridade; evidência constrói."

**Pipeline universal do MDD (Base Mestra v2):** 1 Assunto com nome/número/caso → 2 **Fase de consciência** (1
inconsciente, 2 problema, 3 solução, 4 produto, 5 pronto; mix 30/40/25/5; nunca 2 seguidos na mesma fase) → 3
**Intenção RETINA** (Relacionamento, Engajamento, Transformação, Interação, Nível de consciência, Autoridade) → 4
Narrativa + motor de entretenimento (tensão, surpresa, emoção ou estética: qual liga no segundo 1?) + assinatura viral →
5 Formato + hook + checklist neuro (mín. 7/10, item ético eliminatório) → 6 **Diferenciação Brutal** (concorrente
postaria trocando o logo? mín. 3/6) → 7 Entrega falável, 1 CTA, classificar venda invisível ou explícita (80/20).

**Os 5 filtros (toda peça):** Diferenciação Brutal · Anti-Fórmula (roteiro dirigido, não template preenchido) ·
Humanização (teste da boca: lido em voz alta soa gente?) · Venda como consequência (a história prova o benefício, não
interrompe) · De dentro (feito da verdade/operação/voz, não de fora).

### Cada camada do MDD × autoridades × metodologias que somam

| Camada MDD | O que pede | Reforçam | Completam (novo) | Contradizem / cuidado |
|---|---|---|---|---|
| **1. Dentro da verdade** (identidade: onlyness, inimigo-ideia, mito fundador, marca-personagem) | achar a verdade antes de gravar | Sinek (**Golden Circle**: por quê → como → o quê); Kindra Hall (história de fundador e de valor); Godin ("pessoas como nós fazem coisas assim") | **Jobs-to-be-Done** (Christensen): que "trabalho" o cliente contrata a marca para fazer? Para a SN: "não deixar a obra parar", não "comprar tubo" | Sinek é inspiracional; em B2B o "porquê" precisa de **prova** (Hopkins, Ogilvy). Porquê sem evidência vira fachada (o inimigo do MDD) |
| **2. Dentro da causa** (movimento, desejo, universo) | marca vira bandeira | StoryBrand (Miller): o **cliente é o herói**, a marca é o guia; Campbell/Vogler (mentor); Berger (moeda social, "público") | **Hero-Hub-Help** (Google): Hero = peça grande (cinemático), Hub = série recorrente, Help = utilidade de busca | movimento em B2B é mais "padrão de mercado que combatemos" (Avis, Volvo) do que causa social |
| **3. Dentro da história** (story-mining, narrativa, humor, venda invisível) | conteúdo nasce de dentro e é contado como história | McKee (cena = valor que muda), Dicks (momento de 5 segundos), Hall (4 componentes), Zak (arco gera oxitocina), Heath (concreto) | **ABT** (Olson: E… MAS… PORTANTO = a regra MAS/ENTÃO do MDD), **Story Spine** (Pixar), **Kishōtenketsu** (4 atos sem conflito, a virada é surpresa: ótimo para sensorial/gastronomia) | o "conflito obrigatório" do MDD tem exceção: Kishōtenketsu e ASMR seguram por surpresa/prazer estético |
| **4. Dentro da cena** (produção, escrita dirigida, desfecho intencional, humanização) | gravar de dentro, abrir in medias res, final decidido | Hitchcock (bomba sob a mesa), Murch (emoção 51 %), Kuleshov (o corte cria o sentido), Stanton ("2+2": dar as peças, não a conta), Sorkin (intenção × obstáculo) | **Hook-Retain-Reward** (Hormozi), re-hook a cada 15–20 s, **beat sheet** proporcional à duração (Snyder) | o in medias res é default, não lei: em entrevista e institucional a apresentação (contexto) vem cedo (Live CMR) |
| **5. Dentro do negócio** (ponte orgânico↔pago, funil, métricas de caixa) | conteúdo vira venda | Schwartz (nível de consciência decide o texto), Cialdini (prova social, autoridade, unidade), Hopkins (afirmação preventiva), Kennedy (mensagem-mercado-mídia) | **AIDA, PAS, BAB, 4Ps** (Promise-Picture-Proof-Push) por fase; **Minto** (conclusão primeiro) para B2B racional; criativo como público (Matriz ângulo × formato × fase) | métrica de vaidade (hook rate alto + hold baixo = gancho mentiroso) |

**Como ler junto:** o MDD diz **de onde** vem o conteúdo (de dentro) e **o que** ele tem que passar (5 filtros); as
autoridades dizem **como** prender, emocionar e converter. Sempre que uma técnica brigar com um filtro do MDD, o filtro
vence (ex.: gancho de curiosidade que mente = reprova em "venda como consequência" e em ética).

---

## 2c. Persona primeiro

Antes de qualquer ideia, o pipeline cria ou atualiza **uma persona por público** do cliente. Persona aqui não é
"homem, 35 anos": é o que faz a pessoa parar, se reconhecer e agir.

**Campos (cada um com fonte ou marcado HIPÓTESE):** quem é e o que faz no dia (rotina real, horários, onde está quando
vê o celular) · dores e medos (o que dá errado na semana dela) · desejos (o que seria um dia bom) · objeções (por que
não compra / não troca de fornecedor) · **linguagem real** (palavras, gírias, apelidos, como ela escreve no WhatsApp) ·
crenças (o que ela acha que é verdade sobre o mercado) · onde consome conteúdo (Reels, YouTube, grupos de WhatsApp,
LinkedIn) · o que a faz **parar o scroll** · **gatilhos de "isso sou eu"** (situações que só quem vive reconhece) ·
quem influencia a decisão · momento de compra (gatilho, sazonalidade) · nível de consciência típico (Schwartz).

**Fontes, por ordem de força:** palavras reais do cliente final (conversas de WhatsApp do próprio cliente no sistema,
comentários, perguntas do atendimento) > respostas do cliente (perguntas do mês, reunião) > briefing e diagnóstico >
pesquisa (comentários em vídeos do nicho, Reclame Aqui, fóruns) > dedução (marcada HIPÓTESE). Comentário vale mais que
o vídeo (MDD, Caçador).

**Cada roteiro declara:** a qual persona fala, qual **ponto de identificação** usa ("isso sou eu") e qual palavra real
dela entrou no gancho ou na objeção.

---

## 2d. Inteligência de dados do sistema (o que ler e o que tirar)

O sistema já guarda o que acontece em cada área do cliente. O motor cruza tudo antes de criar. Conferido no banco em
18/11/2026.

| Fonte (tabela.campo) | O que tirar para o roteiro |
|---|---|
| `strategy_brief_context(cliente, mês)` | já junta: briefing, briefing do mês, perguntas do mês, anotações abertas de reunião, direcionamento, voz, recusas, o que funcionou (último relatório mensal), já feito, contrato, faltou no briefing. **Ponto de partida.** |
| `clients`: `segment`, `niche`, `description`, `target_audience`, `value_proposition`, `competitors`, `brand_style` (voz, faça, evite, foto) | modelo de negócio, públicos, proposta de valor, o que a marca faz/evita (não vem no contexto acima) |
| `client_briefs.data`: `publico`, `voz`, `produtos`, `diferenciais`, `proibidos`, `quem_aparece`, `quem_grava`, `capacidade`, `referencias`, `concorrentes`, `links`, `links_extra` | persona, prova, quem grava, limites |
| `client_brief_months.data`: `meta`, `ofertas`, `datas_travam` | objetivo e oferta do mês |
| `client_questions` (`question`, `answer`, `status`='respondida', `pack`, `focus`, `area`) | respostas do cliente em todas as áreas, não só do mês: objeções, histórias, números |
| `client_meeting_notes.body` (abertas: `done_at` nulo) | decisões e pedidos recentes |
| `client_directions` (`area`, `month`, `body`) | **direcionamento da equipe: prioridade sobre tudo** |
| `client_brand_voice` (`essencia`, `proposito`, `arquetipo`, `tom`, `evitar`, `expressao`, `regra_teste`, `pilares`) e `client_brand_guides.guide` | voz, arquétipo, pilares, palavras proibidas |
| `consult_docs` (`doc`, `research`, `status`) | diagnóstico: SWOT, concorrência, maturidade (usar só se `status` não for erro) |
| `strategy_cards` de meses anteriores (`title`, `tab`, `status`, `reject_reason`, `redo_pedido`, `data`) e `content_rules.rule` | o que foi aprovado (padrão a manter), recusado e **por quê** (regra), refeito e o pedido do Italo (aprender com a edição) |
| `content_items` (`kind`, `status`, `title`, `headline`, `caption`, `revision_note`, `approved_at`, `publish_date`) e `content_plans` | peças de social aprovadas/publicadas: tom que o cliente aprova, temas já cobertos, revisões pedidas |
| `av_projects` (`title`, `script`, `script_status`, `script_note`, `revision_note`, `final_link`) | roteiros já gravados, o que o cliente pediu para mudar |
| `ad_accounts.client_id` → `traffic_entities` (`level`='ad', `name`, `effective_status`, `thumbnail_url`) + `traffic_entity_daily` (`spend_cents`, `impressions`, `reach`, `clicks`, `results`, `leads`) | **criativos vencedores**: custo por resultado e CTR por anúncio nos últimos 30–90 dias; o ângulo que converteu vira pauta (ponte pago → orgânico) |
| `traffic_daily_metrics`, `traffic_reports` (`summary`, `metrics`), `traffic_strategies`/`traffic_strategy_items`, `traffic_goals` | tendência, metas e decisões de tráfego |
| `social_accounts` → `social_metrics_daily` (`reach`, `engagement`, `profile_visits`, `followers`); `social_docs.summary`; `social_suggestions` | o que dá alcance e visita ao perfil |
| `client_scan` (`month`, `source`, `data`) | coleta do mês (perfil, concorrentes, referências) sem recoletar; **também serve de cache do contexto do roteiro** (`source`='contexto_roteiro') |
| `whatsapp_accounts.client_id` → `whatsapp_messages` (`from_me`=false, `body`) | **a voz do cliente final**: dúvidas, objeções, apelidos de produto, palavras para gancho. Atenção: `wa_contacts.client_id` liga contatos do número da Peformake ao cliente (equipe dele), não o cliente final; `ai_summary`/`ai_intent`/`ai_sentiment` ajudam a filtrar |

**SN em 18/11/2026 (o que o sistema tem):** sem conta de anúncio, sem conta social conectada, sem WhatsApp próprio no
sistema, diagnóstico (`consult_docs`) com erro de coleta, sem guia de marca, nenhuma pergunta respondida, nenhuma
recusa registrada, 4 artes em aprovação ("Aqui você encontra materiais", "Sua obra merece produtos hidráulicos que
duram"…). Ou seja: **dados escassos**. O motor deve dizer isso, marcar a persona como hipótese e gerar as perguntas
que faltam (ver teste).

---
## 3. Objetivos e papéis (para que serve cada vídeo)

O objetivo vem da **necessidade do cliente** (meta do mês, fase de consciência do público, o que falta no funil), não
da moda. Objetivos cobertos: **alcance/viralizar · criativo de tráfego pago · autoridade · ensinar · vender/converter ·
prova social · comunidade/humor · recrutamento** (quando o cliente contrata). Cada objetivo tem o sinal que prova que
funcionou (MDD §11): tese → envios e seguidores · bastidor → retenção · educativo → salvamentos · case → comentário e
lead · react/trend → alcance de não seguidor · anúncio → custo por resultado.

Um mês bom é um **elenco de papéis**, não uma pilha de dicas. Cada papel responde a uma pergunta que o comprador faz
antes de comprar.

| Papel | Pergunta do comprador | Fase de consciência | Formatos que servem (ver §3b) | Sinal de sucesso |
|---|---|---|---|---|
| **Apresentar / autoridade** | "Quem são vocês e por que eu confiaria?" | 2–3 | institucional cinemático, mini-doc, dono falando, entrevista | salvamentos, visitas ao perfil, "vi o vídeo de vocês" |
| **História / origem** | "Por que vocês fazem isso?" | 1–3 | storytime, entrevista em perguntas, mini-doc | tempo de visualização, comentários pessoais |
| **Objeção principal** | "Mas e o preço / o prazo / a confiança?" | 3–4 | talking head documental, nós × eles, react a comentário, diálogo leigo × especialista | conversas que citam o argumento |
| **Prova** | "Funciona? Para quem?" | 3–4 | depoimento, montagem de depoimentos, antes e depois, teste na mão, timelapse | pedidos parecidos com o caso |
| **Método** | "Como é trabalhar com vocês?" | 3 | POV, bastidor, day in the life, processo/ASMR | conversas mais qualificadas |
| **Oferta** | "O que eu ganho agora e até quando?" | 4–5 | vídeo de oferta, UGC problema-solução, unboxing | conversas/pedidos no período |
| **Comunidade / humor** | "Eles entendem a minha vida?" | 1–2 | esquete, personagem, sátira do nicho, trend adaptada, meme | compartilhamentos, marcações |
| **Ensinar / utilidade** | "O que eu preciso saber?" | 2–3 | tutorial, listicle, mito × verdade, faceless | salvamentos |
| **Alcance** | (não pergunta: rola o feed) | 1 | trend adaptada, entrevista de rua, desafio, react, gancho visual | alcance de não seguidor, envios |
| **Recrutamento** | "Vale a pena trabalhar aí?" | — | day in the life da equipe, depoimento de funcionário | candidaturas |

Regras de bolso: mês de 6–8 vídeos tem pelo menos **apresentar, objeção, prova e oferta**; o resto varia; fases de
consciência em mistura (MDD: 30 % fases 1–2, 40 % fase 3, 25 % fase 4, 5 % fase 5); nunca dois seguidos na mesma fase.

---

## 3b. Catálogo profundo de formatos (orgânico e anúncio)

Formato de cada ficha: **o que é** · **objetivo/funil** · **por que funciona** (mecanismo) · **batidas** · **gancho
típico** · **exige** (equipe, local, tempo) · **erros** · **referência** · **adaptar** (B2B · varejo local · serviço ·
saúde). Referências com caminho são do nosso acervo (`video-tools/estudos-perfis/`, `video-tools/estilos/`).

**UGC e anúncios de criador**
1. **UGC (conteúdo gerado por usuário/criador)** · prova e oferta (meio e fundo; anúncio) · par falando com par: parece
   recomendação, não propaganda (prova social, semelhança; Cialdini "simpatia" e "prova social") · gancho → problema
   vivido → produto em uso → resultado → CTA · "Eu não acreditava que…", "Achei a solução pra [dor]" · 1 criador com
   celular, 20–40 min, roteiro em tópicos · erro: texto decorado, criador que não é do público · ref.: formatos UGC de
   Modern Millie (showcase, demo, unboxing, problema-solução, depoimento, voiceover, transformação, educativo) ·
   adaptar: B2B = **engenheiro/mestre real** filmando no canteiro (o "UGC" de B2B é o cliente profissional); varejo =
   cliente da loja; serviço = cliente na hora do serviço; saúde = só relato autorizado, sem promessa de resultado.
2. **UGC "unboxing"** · fundo · antecipação + recompensa (dopamina da expectativa, Sapolsky) · caixa → abre → detalhe →
   uso → veredito · "Chegou!" · 10 min · erro: produto sem diferença visível · adaptar: B2B = **o pedido chegando na
   obra conferido** (abrir o pallet com a lista); varejo = embalagem; serviço = "o kit que você recebe".
3. **UGC "teste/review"** · meio · ceticismo resolvido ao vivo (prova > afirmação) · desconfiança → teste → resultado →
   veredito honesto (com 1 ressalva) · "Testei pra ver se é verdade" · 15 min · erro: review 100 % elogio · adaptar: SN
   "cola e puxa: solta?"; ótica "a lente risca?"; saúde só com evidência e sem antes/depois não autorizado.
4. **UGC "problema-solução"** · fundo/anúncio · identificação com a dor + alívio (PAS) · dor vivida → tentativa que
   falhou → solução → resultado → CTA · "Se você sofre com [dor]…" · 10 min · erro: dor genérica · adaptar: B2B "a obra
   parou por uma peça"; varejo "a pizza chega fria"; serviço "orçamento que nunca vem".
5. **UGC "3 motivos"** · meio/fundo · lista curta com progresso (loop numérico, Zeigarnik) · "3 motivos pra…" → 1, 2, 3
   (o 3º o mais forte) → CTA · 10 min · erro: motivos genéricos · adaptar: "3 coisas que o engenheiro confere antes de
   fechar a hidráulica".

**Gente da marca falando**
6. **Dono falando (founder-led)** · autoridade e confiança (fases 2–4) · rosto + responsabilidade (Hall: história do
   fundador; Kennedy: quem assina vende) · tese → história curta → prova → convite · confissão ou tese contraintuitiva ·
   30 min, teleprompter ou tópicos · erro: dono lendo, falando "nós somos referência" · adaptar: SN = Sandra; saúde = o
   profissional com CRM/CRO (regras do conselho).
7. **Talking head (cabeça falante)** · ensinar, objeção · fala contínua prende quando tem tensão interna (ABT) · gancho
   → 2–3 batidas com virada → fecho · todos os ganchos G1–G12 · 15 min · erro: fala picada, sem prova visual; resolver
   com inserts (E16 rosto↔cartaz) · ref.: Giullya `DcJcoxMRu7z` (objeção na voz do público, 15 mil curtidas).
8. **Depoimento** e 9. **Montagem de depoimentos (testimonial stack)** · prova (fundo; anúncio de retargeting) · prova
   social de par + especificidade · problema antes → o que mudou → detalhe concreto → recomendação; no stack: 3–5
   rostos, uma frase forte cada, ritmo rápido · "Eu achava que…" · 20–30 min por pessoa, autorização · erro: depoimento
   roteirizado, elogio vago · adaptar: B2B = engenheiro sobre prazo; saúde = sem resultado prometido.
10. **Entrevista de rua (vox pop / street interview)** · alcance + identificação · curiosidade sobre a resposta do
    outro + pergunta que o espectador responde mentalmente · pergunta → 3–6 respostas → virada/revelação → marca · a
    pergunta na tela · 1 h na rua, microfone de mão, autorização · erro: pergunta sem tensão · adaptar: B2B = "pergunta
    de canteiro" em obra (mestres e encanadores); varejo = na calçada do bairro; saúde = mitos de saúde (sem diagnóstico).
11. **Podcast / cortes** · autoridade + volume (1 gravação → 10 cortes; Gary Vee "pilar → micro") · conversa longa com
    picos; corte = 1 pico com contexto · a frase mais forte do episódio · 1 h de gravação, 2 câmeras · erro: corte sem
    contexto (NARRATIVA §11b) · "fake podcast" no anúncio = cenário de podcast para dar ar de conversa.
12. **Entrevista sentada com perguntas** (Visage, Live CMR) · história, autoridade · perguntas da história real + pontos
    pra resposta espontânea · 40–60 min rendem 3–5 cortes.

**Documental e cinematográfico**
13. **Mini-documentário** · marca, autoridade (Hero) · personagem + o que está em jogo + virada (Zak; McKee) · mundo →
    pessoa → tensão → processo mostrado → respiro → fecho na pessoa · imagem que intriga · Ellcazo, 2–4 h · erro:
    "bonito sem história" · ref.: E2/E7, M14; Volvo Live Tests.
14. **Institucional cinemático** · apresentar (fixado no perfil, site, LinkedIn) · emoção + uma ideia só (Binet & Field)
    · ver Roteiro 1 do teste · Ellcazo · erro: catálogo de produtos com trilha épica.
15. **Bastidor / day in the life** · método, recrutamento, identificação · o "invisível" vira prova (venda invisível:
    "bastidor que gera desejo") · manhã → tarefa difícil → detalhe que ninguém vê → resultado · "6h da manhã na [marca]"
    · celular, contínuo · erro: rotina sem conflito ("dia perfeito não é história").
16. **POV** · método, ensinar · imersão: o espectador é o personagem (neurônios-espelho) · "POV: você é…" + cenário
    real que prova (E17, Giullya "publicitária no mercado" 14,2 mi) · 20–30 min · erro: POV sem conhecimento técnico.
17. **Storytime** · história, comunidade · narrativa em 1ª pessoa com tensão (Dicks: momento de 5 s) · in medias res →
    contexto mínimo → virada → lição/ponte · "Teve um dia que…" · 15 min · erro: história sem ponte (umbiguismo, MDD).
18. **ASMR / sons do processo** · alcance, marca (fase 1) · prazer estético sem fala; o som é personagem (MDD §6) ·
    só som real + detalhe · 30 min com microfone direcional · adaptar: SN = corte de tubo, encaixe, caminhão; gastronomia
    = fritura, crocância.
19. **Timelapse / processo** e 20. **Transformação / antes e depois** · prova · contraste temporal (o cérebro adora
    mudança visível) · antes → processo acelerado → depois · tripé fixo, tempo de obra · erro: "depois" sem o "antes"
    no mesmo enquadramento; saúde: antes/depois só com autorização e regras do conselho.

**Ensinar**
21. **Tutorial / how-to** · ensinar, salvamento · utilidade + resultado primeiro (E9) · resultado → passos (1 por frase)
    → erro comum → CTA · "Como [resultado] sem [esforço]" · 20 min · erro: passo sem demonstração.
22. **Listicle** · ensinar, alcance · loop numérico com escalada ("o 3º é o mais importante") · 15 min.
23. **Mito × verdade** · ensinar, objeção · quebra de crença (Schwartz: o mercado acredita X) · mito dito com convicção
    → "mentira" → prova → regra prática · "Tubo marrom serve pra água quente? Mito." · 15 min.
24. **Faceless / B-roll + narração** · ensinar, alcance (quando ninguém quer aparecer) · imagem por frase + voz (E15,
    E23) · 0 de diária (banco próprio de imagens) · erro: B-roll genérico; "imagem = o que é dito".
25. **Green screen** · react a print/notícia/comentário · prova visual atrás da fala · celular + app · erro: print
    ilegível.

**Conversa com o público**
26. **React / reação** · alcance, posicionamento · opinião sobre algo que já tem atenção (newsjacking; janela 48 h no
    MDD) · trecho → pausa → opinião com tese → ponte para o público · "Viu isso?" · 15 min · erro: só reagir, sem tese;
    nunca chutar quem está no chão.
27. **Dueto / stitch / resposta a comentário** · objeção, comunidade · a dúvida real do público como gancho (Voss:
    rotular a objeção) · comentário na tela → resposta com prova → convite · 10 min · melhor uso das **palavras reais**.
28. **Desafio / teste ("testei na mão")** · alcance, prova · aposta + resultado incerto (tensão, recompensa variável) ·
    desafio → tentativa → resultado → lição · "Desafio: furar concreto com a menor broca" (estudo_narrativas G12).

**Entretenimento e marca**
29. **Série / franquia recorrente** · comunidade, hábito (Hub) · Eyal: gatilho → ação → recompensa variável → hábito;
    título fixo, bordão, episódio que funciona sozinho · erro: série que depende do episódio anterior (Mavic: 178–563 ♥
    contra 28,5 mil do avulso).
30. **Trend adaptada** · alcance · reconhecimento do formato + surpresa da adaptação · só com motivo ligado à tese e
    janela de produção menor que a vida da trend · erro: trend crua (Diferenciação Brutal reprova).
31. **Meme / esquete / personagem / sátira do nicho** · comunidade, alcance, objeção leve · violação benigna (§7) ·
    premissa → escalada → virada → produto como fim da piada → tag · ref.: `estudo_mavic.md` (H1–H14, V1–V12),
    `estudos-perfis/mavicproducoes/`.
32. **Carrossel em vídeo / slideshow** · ensinar, salvamento · leitura no próprio ritmo; loop de 6–8 s (E11).
33. **Animação / motion / IA** · ensinar o invisível (como funciona um biodigestor por dentro) · E23 explainer 3D;
    skill `motion-pro`; erro: IA no lugar de prova real (regra da casa: nada de imagem por IA como foto do cliente).

**Venda e institucional**
34. **Vídeo de oferta / promo** · fundo (fase 4–5) · escassez **verdadeira** + condição concreta (Cialdini; Kennedy:
    prazo) · condição → para quem → por que agora → como pedir · 10 min · erro: preço não confirmado (proibido).
35. **Convite para evento** · conversão para presença · quem, o quê, quando, onde, por que ir (FOMO verdadeiro).
36. **Recrutamento** · vagas · day in the life + depoimento de funcionário + "quem não queremos" (polarização).
37. **Comparação "nós × eles"** · objeção (fase 3–4) · contraste (Avis; MDD: inimigo = ideia, **nunca concorrente pelo
    nome**) · o padrão do mercado → o nosso jeito → prova · erro: atacar CNPJ (proibido no briefing da SN).
38. **Gancho visual** (abertura que é só imagem) · alcance · interrupção de padrão (Von Restorff) · objeto/escala
    absurda (tanque de 25 mil litros com uma pessoa ao lado) · serve de abertura para qualquer outro formato.

### Formatos de anúncio que mais convertem (Meta/TikTok) e a métrica que movem
Métricas (definições): **hook rate** = reproduções de 3 s ÷ impressões (TikTok usa 2 s); **hold rate** = ThruPlays ÷
reproduções de 3 s; **CTR** = cliques ÷ impressões; **CPA** = custo por resultado. Faixas publicadas para Meta (público
frio): hook ~25 % médio, 30–40 % forte, abaixo de 15–20 % a abertura falhou; hold 40–50 % médio na definição ThruPlay
÷ 3 s. **Gancho alto + hold baixo = gancho que promete o que o vídeo não entrega** (atrai o público errado e piora o CPA).
Sempre comparar com a média da própria conta.

| Formato de anúncio | Batidas | Move principalmente |
|---|---|---|
| **Gancho + problema + demo + prova + oferta + CTA** (o "padrão de resposta direta") | 0–3 dor ou resultado · 3–8 problema · 8–20 demonstração · 20–25 prova · 25–30 oferta e CTA | CPA (é o mais completo) |
| **Testimonial stack** | 3–5 clientes, uma frase forte cada, fecho com oferta | hold rate e conversão em retargeting |
| **Split screen** (lado a lado) | o jeito comum × o nosso, ao mesmo tempo | hook rate (contraste visual) |
| **Nós × eles** | o padrão do mercado × a nossa forma, com prova | CTR (público em fase 3) |
| **Unboxing** | expectativa → revelação → detalhe → uso | hold rate |
| **Fake podcast** | duas pessoas "conversando" sobre a dor; a solução surge na conversa | hold rate (parece conteúdo, não anúncio) |
| **Street interview** | pergunta na rua → respostas → a marca resolve | hook rate |
| **Founder story** | o dono conta por que criou + prova + convite | CTR e confiança (ticket alto, B2B) |
| **UGC problema-solução** | criador com a dor → solução → resultado | CPA em público frio |

Regra da ponte (MDD, tráfego): **orgânico com sinal forte vira criativo; criativo que converteu volta como pauta
orgânica**. Para cada vídeo de anúncio, entregar **3–5 variações de gancho** sobre o mesmo corpo (o gancho é a
variável mais barata de testar; Hormozi e o estudo da casa).

---
## 3c. Catálogo de 117 estruturas de vídeo (para variar todo mês)

19/11/2026, pedido do Italo. **Estrutura** é o esqueleto do vídeo (quem fala, como abre, como anda, como prova); o
**papel** (§3) diz para que serve e a **linguagem** (§8, E1–E40) diz como fica na tela. A mesma estrutura serve a vários
papéis. Onde já há ficha profunda, a coluna "Nome" aponta (§3b-n, M = `estudo_narrativas.md`, H/V = `estudo_mavic.md`,
E = `catalogo_estilos.md`). Fontes no §31.

Legenda. **Funil:** T topo (alcance), M meio (confiança, objeção), F fundo (venda). **Exige:** 📱 celular e 1 pessoa ·
👥 2+ pessoas · 🎬 diária Ellcazo · ✂️ edição/motion forte · 📍 precisa do local do cliente · ✍️ autorização de imagem
de terceiro. **Serve:** B = B2B/indústria/construção · V = varejo local e gastronomia · S = serviço · H = saúde e
estética (sempre com as regras do conselho, §26).

**Regra de uso (motor):** cada vídeo grava o código da estrutura em `data.estrutura` (ex.: "S63"). Antes do mix, o
estrategista lê as estruturas usadas pelo cliente nos últimos 3 meses (consulta no M1 do prompt) e: (1) **≥ 2 vídeos
do mês com estrutura nunca usada por aquele cliente**; (2) nenhuma estrutura repetida no mês, salvo episódios de série
aprovada; (3) estrutura que performou (sinal forte em `social_metrics_daily`/tráfego) pode voltar, com tema novo, e
conta como "o que funciona" do 70/20/10; (4) a cada mês, ≥ 1 estrutura de um grupo que o cliente nunca usou.

### A. Falado (rosto e voz)
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S1 | Talking head com tese (§3b-7) | uma pessoa, uma ideia contraintuitiva, inserts de prova | T/M | "Todo mundo faz X. Está errado." | 📱 | BVSH |
| S2 | Confissão do dono | erro/cicatriz do dono que virou o método de hoje | M | "O maior erro que eu cometi aqui foi…" | 📱 dono | BVSH |
| S3 | Opinião impopular | discorda do senso comum do nicho, com prova | T | "Opinião impopular sobre [nicho]:" | 📱 | BVS |
| S4 | Selfie de opinião (E22) | plano único, título fixo, fala curta | T | título fixo em 2 linhas | 📱 | VSH |
| S5 | Leigo × especialista (M18) | dúvida na voz do leigo, especialista traduz | M | "Minha cliente me perguntou…" | 👥 | BSH |
| S6 | Explicando pra minha mãe | tradução extrema do técnico para um leigo real | T/M | "Explicando [termo] pra minha mãe" | 👥 | BSH |
| S7 | Carta aberta | fala dirigida a um tipo de cliente | M/F | "Pra você que [situação]…" | 📱 | BSH |
| S8 | Previsão do setor | o que vai mudar e o que fazer antes | M | "Em [ano] isso vai mudar no [nicho]" | 📱 | BS |
| S9 | Manifesto falado (M3) | crença da marca em frases curtas sobre B-roll | T | a frase-tese | 📱 + ✂️ | BVSH |
| S10 | A pergunta que ninguém faz | a pergunta certa antes de comprar | M/F | "Antes de fechar, pergunte isso" | 📱 | BSH |
| S11 | Por que a gente escolheu | bastidor de uma decisão (fornecedor, ingrediente, material) | M | "Por que a gente paga mais caro em…" | 📱 📍 | BVS |

### B. Entrevista e bate-papo
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S12 | Entrevista sentada em perguntas (§3b-12) | perguntas da história real com pontos de resposta | M | a resposta mais forte primeiro | 🎬 | BVSH |
| S13 | Vox pop / rua (§3b-10) | uma pergunta, várias respostas, virada | T | a pergunta na tela | 📱 ✍️ | VSH |
| S14 | Pergunta de balcão/canteiro | vox pop dentro do local do cliente (clientes e equipe) | T/M | "Pergunta rápida pra quem está na fila" | 📱 📍 ✍️ | BV |
| S15 | Podcast e cortes (§3b-11) | conversa longa, corte = 1 pico com contexto | M | a frase mais forte do episódio | 🎬 👥 | BS |
| S16 | Fake podcast | cenário de podcast, conversa roteirizada da dor | F | pergunta do "host" | 👥 | BVSH |
| S17 | Debate de bancada | dois da equipe discordam e chegam numa regra | M | "Ele acha X. Eu acho Y." | 👥 | BVS |
| S18 | Cliente entrevista o dono | o cliente real faz as perguntas difíceis | M/F | a pergunta mais incômoda | 👥 ✍️ | BVSH |
| S19 | Adivinha o preço | o público chuta, revela o real (só preço confirmado) | T | "Quanto você acha que custa…" | 📱 ✍️ | VS |
| S20 | Orgulho de ofício | o funcionário conta o detalhe que só ele vê | T/M | "Há 12 anos eu…" | 📱 📍 | BVS |

### C. UGC e criador
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S21 | UGC problema-solução (§3b-4) | dor vivida → tentativa → solução → resultado | F | "Se você sofre com [dor]…" | 📱 criador | BVS |
| S22 | UGC teste/review (§3b-3) | ceticismo resolvido ao vivo, com 1 ressalva | M | "Testei pra ver se é verdade" | 📱 | BVS |
| S23 | UGC unboxing (§3b-2) | expectativa → revelação → uso | F | "Chegou!" | 📱 | BV |
| S24 | UGC 3 motivos (§3b-5) | lista curta, o 3º mais forte | M/F | "3 motivos pra…" | 📱 | BVS |
| S25 | Gravado pelo cliente real | o cliente grava com o próprio celular | F | "Me pediram pra contar" | ✍️ | VSH |
| S26 | Rotina com o produto | o produto entra no meio de uma rotina comum | M | "Arruma comigo pra…" | 📱 | VH |
| S27 | Conselho de amigo | recomendação pessoa a pessoa, sem cara de anúncio | F | "Se eu fosse você, eu…" | 📱 | VS |
| S28 | Creator do bairro (collab) | influenciador local visita e vive a experiência | T | "Vim conhecer o lugar que todo mundo fala" | collab, contrato | VS |

### D. Gancho visual (interrupção nos 2 primeiros segundos; serve de abertura para outras estruturas)
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S29 | Escala absurda (§3b-38) | objeto gigante/minúsculo ao lado de uma pessoa | T | só a imagem | 📍 | BV |
| S30 | Objeto fora do lugar | algo do cliente num lugar impossível | T | só a imagem | 📱 | VB |
| S31 | Macro que não se reconhece | close extremo; revela o que é depois | T | "O que é isso?" | lente macro | VH |
| S32 | In medias res | começa no ápice da ação | T/M | o momento de maior tensão | qualquer | BVSH |
| S33 | Cronômetro na tela | o relógio dita a tensão | T/M | "Tenho 60 s pra…" | 📱 | BVS |
| S34 | Quebra de realidade (E24) | VFX ancorado no real | T | o absurdo | ✂️ | VB |
| S35 | Palavra-mundo (E1/E40) | a palavra-pico vira cenário atrás da pessoa | T | a palavra | ✂️ | BVSH |
| S36 | Match cut de transformação (E8) | mesma pose, tudo muda | T/M | o corte | ✂️ | VSH |
| S37 | Erro proposital | algo "dá errado" no 1º segundo e vira o assunto | T | o tombo/derrubada | 📱 | VS |
| S38 | Só as mãos | mãos fazem a ação, sem rosto (E32) | T/M | o gesto | 📱 | VB |

### E. Narrativa e documental
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S39 | Mini-documentário (§3b-13) | personagem + o que está em jogo + virada | T/M | imagem que intriga | 🎬 | BVSH |
| S40 | Institucional cinemático (§3b-14) | uma ideia, emoção, fixado no perfil | T | frase-alma | 🎬 | BVSH |
| S41 | Storytime (§3b-17) | 1ª pessoa, in medias res, ponte para o público | M | "Teve um dia que…" | 📱 | BVSH |
| S42 | Cena com relógio (M11) | hora, lugar, o que daria errado, o serviço agindo | M/F | "17h40, sexta, a obra parou" | 👥 | BS |
| S43 | História de lugar em 3 atos (M14) | o lugar como personagem | T | o lugar no passado | 🎬 | VB |
| S44 | Caso famoso → princípio → aplicação (M12) | história conhecida ensina a regra do cliente | M | "Sabe por que [caso] deu certo?" | 📱 ✂️ | BS |
| S45 | Dia na vida (§3b-15) | rotina com conflito, detalhe invisível | M | "6h da manhã na [marca]" | 📱 📍 | BVSH |
| S46 | Memória da empresa (E5) | retrô-documentário de aniversário ou marco | T | o ano gigante | ✂️ | BVS |
| S47 | Jornada do cliente herói | o cliente com o problema, a marca como guia | M/F | a dor no rosto do cliente | 👥 ✍️ | BSH |
| S48 | Carta do futuro | "daqui a 10 anos" ou "eu de 2015" | T | "Se o [dono] de 2015 visse isso…" | 📱 | VS |
| S49 | Biografia de um objeto | o produto do fornecedor até o cliente final | M | "Esse [produto] viajou 800 km" | 📍 ✂️ | BV |

### F. Ensino
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S50 | Tutorial (§3b-21) | resultado primeiro, passos, erro comum | M | "Como [resultado] sem [esforço]" | 📱 | BVSH |
| S51 | Listicle (§3b-22) | lista com escalada | T/M | "5 coisas que…, a 5ª…" | 📱 | BVSH |
| S52 | Mito × verdade (§3b-23) | crença dita com convicção → prova | M | "[Crença]? Mito." | 📱 | BVSH |
| S53 | Você está fazendo errado | o erro comum e o jeito certo | M | "Pare de [erro]" | 📱 | BVSH |
| S54 | Checklist antes de comprar | o que conferir, com o cliente passando em todos | F | "Confere essas 4 coisas" | 📱 | BSH |
| S55 | Perguntas encadeadas (M13) | cada resposta abre a próxima pergunta | M | uma pergunta curiosa | ✂️ | BSH |
| S56 | Ranking com revelação adiada (M10) | do 5º ao 1º, o 1º no fim | T/M | "O 1º vai te surpreender" | 📱 | BV |
| S57 | Lado a lado (split screen) | jeito comum × jeito certo ao mesmo tempo | M | as duas telas | ✂️ | BV |
| S58 | Glossário ("o que é…") | 1 termo por vídeo, série | T/M | "[Termo] em 20 s" | 📱 | BH |
| S59 | Novidade → mecanismo → ressalva (M9) | o que mudou, como funciona, o cuidado | M | "Agora dá pra…" | 📱 | BS |
| S60 | Anatomia (desmontado) | abre o produto e mostra por dentro | M | o produto cortado ao meio | 📍 | BV |

### G. Prova e depoimento
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S61 | Depoimento (§3b-8) | antes → o que mudou → detalhe concreto | F | "Eu achava que…" | ✍️ | BVSH |
| S62 | Montagem de depoimentos (§3b-9) | 3–5 rostos, uma frase forte cada | F | a frase mais forte | ✍️ ✂️ | BVSH |
| S63 | Antes e depois (§3b-20) | mesmo enquadramento, processo no meio | M/F | o "antes" feio | 📍 | VSH* |
| S64 | Teste ao vivo / desafio (§3b-28) | aposta com resultado incerto | T/M | "Será que aguenta?" | 📱 | BV |
| S65 | Números na tela | um dado real por frase (obras, pedidos, anos) | F | o número | ✂️ | BS |
| S66 | Feedback lido em voz alta | dono lê uma avaliação real (boa ou ruim) e responde | M | "Recebi essa avaliação…" | 📱 | VS |
| S67 | Reação na entrega | câmera no rosto do cliente na hora de receber | M/F | o rosto antes do reveal | ✍️ | VSH |
| S68 | Garantia demonstrada | a garantia acontecendo de verdade | F | "Deu problema. Olha o que fizemos." | 📍 | BV |
| S69 | Bastidor da qualidade | inspeção, laudo, conferência, certificado | M | "Isso aqui ninguém vê" | 📍 | BH |

\* saúde e estética: antes/depois só com autorização e dentro das regras do conselho.

### H. Humor, trend e meme
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S70 | Esquete de 2 pessoas (M19–M24) | premissa → escalada → produto como fim da piada | T/M | a situação de dor | 👥 | BVS |
| S71 | Personagem recorrente (H5/V12) | figura com bordão que o público segue | T | o bordão | 👥 | VS |
| S72 | Paródia de gênero (H6) | novela, terror, detetive com a dor do cliente | T | a trilha do gênero | 👥 ✂️ | BVS |
| S73 | Literalização (H3) | a expressão da dor acontece de verdade | T | a imagem literal | 👥 | VS |
| S74 | Exagero da dor (H2) | consequência impossível da dor real | T | "A fila tava tão grande que…" | 👥 | VS |
| S75 | "Isso é um anúncio" (H9/V6) | admite que é propaganda e faz disso a piada | T/F | "Me pagaram pra dizer isso" | 👥 | VS |
| S76 | Tipos de cliente | "todo [nicho] tem esse cliente" | T | "O cliente que…" | 👥 | VS |
| S77 | Expectativa × realidade | o que o cliente imagina × o que acontece | T | tela dividida | ✂️ | VS |
| S78 | Trend como gancho (protocolo no `MOTOR-ROTEIRO.md`) | o elemento reconhecível da trend abre; o conteúdo do cliente converte | T/M | o áudio/frase/visual da trend | 📱 | BVSH |
| S79 | Meme de texto estático (E22) | texto sobre fundo, áudio do momento | T | a frase | 📱 | VS |
| S80 | Dublagem de áudio em alta | lip sync com o áudio, situação do nicho | T | o áudio | 📱 | VS (áudio comercial só da biblioteca da rede) |

### I. Oferta e anúncio
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S81 | Resposta direta padrão | gancho → problema → demo → prova → oferta → CTA | F | dor ou resultado | 📱 | BVSH |
| S82 | Nós × eles (§3b-37) | o padrão do mercado × o nosso, sem citar concorrente | M/F | "O comum é…" | 📱 | BVS |
| S83 | Comum × o nosso (M15) | mesmo objeto, duas versões | F | as duas lado a lado | ✂️ | BV |
| S84 | Oferta / promo (§3b-34) | condição → para quem → por que agora | F | a condição | 📱 | VS |
| S85 | Escassez real | vagas, estoque ou prazo verdadeiros, mostrados | F | "Sobraram 4" (com prova) | 📱 | VS |
| S86 | Founder ad (§3b-6) | o dono conta por que criou + convite | F | "Eu criei isso porque…" | 📱 dono | BS |
| S87 | Bumper de 6 s | uma ideia, uma imagem, a marca | T/F | a imagem | ✂️ | V |
| S88 | Cardápio pelo desejo | serviços organizados pelo desejo do cliente (Visage 04) | F | "Qual combina com você?" | 📱 | VSH |
| S89 | Convite para evento (§3b-35) | quem, o quê, quando, onde, por que ir | F | o momento do evento | 📱 | BVS |
| S90 | "Ainda pensando?" (retargeting) | fala com quem já visitou e trata a última objeção | F | "Você olhou e não fechou. Normal." | 📱 | BVSH |

### J. Série
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S91 | Série recorrente (§3b-29) | título fixo, episódio que funciona sozinho | T/M | o título da série | 📱 | BVSH |
| S92 | Dia 1 de 30 | desafio longo contado por dia | T | "Dia 7:" | 📱 | VS |
| S93 | Pergunta da semana | a dúvida real mais frequente (WhatsApp, comentários) | M | a pergunta | 📱 | BVSH |
| S94 | Quadro fixo com bordão | mesmo cenário e bordão, tema novo | T | o bordão | 📱 📍 | V |
| S95 | Segredos do lugar (E17) | POV andando pelo lugar mostrando o que ninguém vê | T/M | "POV: você descobre…" | 📱 📍 | VB |
| S96 | Construindo em público | obra, reforma ou abertura por etapas | M | "Semana 3 da obra" | 📍 | BS |

### K. Interação, react e stitch
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S97 | React (§3b-26) | trecho → pausa → opinião com tese → ponte | T | "Viu isso?" | 📱 | BVSH |
| S98 | Dueto / stitch (§3b-27) | responde a vídeo de outro com prova | M | o trecho do outro | 📱 | BVSH |
| S99 | Enquete encenada | duas opções, o público escolhe nos comentários | T | "Qual você leva?" | 📱 | V |
| S100 | Palavra-isca | "comenta X que eu te mando" (§20) | F | a promessa da isca | 📱 | BVSH |
| S101 | Reagindo ao próprio passado | dono comenta o vídeo/foto antigo da marca | T/M | "Olha a gente em 2019" | 📱 | VS |
| S102 | Especialista reage a mito viral | corrige um vídeo viral do nicho, sem atacar a pessoa | M | o mito viral | 📱 | HB |
| S103 | Live recortada | a pergunta ao vivo e a resposta | M | a pergunta | 📱 | BVSH |

### L. Faceless, B-roll e texto
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S104 | B-roll + narração (§3b-24) | imagem = o que é dito | T/M | a frase de abertura | ✂️ | BVSH |
| S105 | Tese em palavras (M17) | texto-motion sem fala, 7–12 s | T | a frase | ✂️ | BVSH |
| S106 | Carrossel em vídeo (§3b-32) | slides em loop, leitura no próprio ritmo | M | a capa | ✂️ | BSH |
| S107 | Explainer 3D/animação (§3b-33) | o invisível por dentro | M | o objeto por dentro | ✂️ | BH |
| S108 | Slideshow de fotos reais | fotos do cliente no ritmo de um áudio do momento | T | a 1ª foto | 📱 | V |
| S109 | Tela filmada / demo (E21/E15) | sistema, app ou planilha filmada | M | "Olha como chega o pedido" | 📱 | BS |

### M. Processo, ASMR e transformação
| # | Nome | O que é | Funil | Gancho típico | Exige | Serve |
|---|---|---|---|---|---|---|
| S110 | ASMR / sons do processo (§3b-18) | só som real + detalhe | T | o som | microfone | BV |
| S111 | Timelapse (§3b-19) | processo longo acelerado | T/M | o vazio do início | tripé 📍 | BS |
| S112 | Do zero ao pronto | receita, peça ou obra completa em 30 s | T/M | o ingrediente cru | 📍 | VB |
| S113 | Bastidor → 3·2·1 → resultado (E28) | bastidor real e contagem para o resultado | T | "Resultado em 3, 2, 1" | ✂️ | VSH |
| S114 | Satisfação de ordem | organizar, alinhar, empilhar | T | a bagunça | 📍 | VB |
| S115 | Restauração | velho → novo (peça, carro, fachada) | T/M | o estado ruim | 📍 | SV |
| S116 | Making of da gravação | o bastidor do próprio vídeo | M | "Isso foi o que deu errado" | 📱 | BVSH |
| S117 | Multiplicador (1 bruto → N estruturas) | um material gravado vira 6+ vídeos (protocolo no `MOTOR-ROTEIRO.md`) | T→F | depende do derivado | ✂️ | BVSH |

**Exploração:** quando o catálogo não tiver a estrutura certa, o curador pode criar uma nova (combinação de duas
linhas, ex.: S33 cronômetro + S42 cena com relógio) e registrá-la com código provisório "S-novo: nome" no card; a equipe
decide se entra no catálogo.

---

## 4. Estruturas (arcos) que funcionam

Detalhe e exemplos em `estudo_narrativas.md` §3 e `MODELOS.md`. Resumo por papel:

- **Institucional com método** (Visage 1): dúvida real → quem sou → como faço (método em 2–3 passos concretos) → o
  valor que não está no produto → convite.
- **Documental de lugar/processo** (M14, E2/E19): imagem que intriga → personagem → o que está em jogo → o processo
  mostrado (não dito) → respiro → frase que fecha na pessoa.
- **Objeção honesta** (M15 + ressalva honesta + efeito "Avis"): diz a objeção em voz alta → **admite o que é verdade**
  → reenquadra o critério de escolha → mostra o método/prova → convite sem pressão.
- **Cena com relógio** (M11): hora, nome, lugar → "normalmente…" (o que daria errado) → o serviço agindo → o resultado.
- **Leigo × especialista** (M18): a dúvida na voz do público → diagnóstico em 1 frase → itens com a tradução do leigo.
- **Esquete** (M19–M24): premissa (dor real numa cena de 2 pessoas) → 2–4 escaladas → virada em 55–75 % → produto como
  fim da piada → tag de 3–6 s.
- **Entrevista em perguntas** (Visage 2, Live): perguntas da história real + pontos pra resposta espontânea; sobem de
  emoção → aprendizado → mensagem.
- **Retenção no meio**: uma virada anunciada a cada 15–20 s ("só que tem um detalhe"), ressalva honesta a 70–85 %,
  fecho em círculo (a última frase responde a primeira).

---

## 5. Banco de ganchos por objetivo (0–3 s)

Tipos G1–G12 em `estudo_narrativas.md` §2. Escolha **pelo objetivo do vídeo**, nunca pela moda.

| Objetivo | Gancho que funciona | B2B / obra | Local / B2C |
|---|---|---|---|
| Autoridade | **Imagem que intriga** sem explicar (G2) ou **sentença contraintuitiva** (G5) | "Toda obra tem um dia em que tudo para por causa de uma peça pequena." | "Unha natural não é a mais fina. É a que respeita a sua." |
| Objeção | **A objeção dita em voz alta**, por alguém real (G8) | "'Sandra, vocês não foram os mais baratos.' Às vezes não somos mesmo." | "Alongamento em gel fica grosso?" |
| Prova | **Resultado + personagem identificável** (G1) ou **cena com hora** (G6) | "Sexta, 6h40. A obra de Maria Farinha precisava do biodigestor às 8h." | "A Dona Lúcia voltou depois de 3 anos." |
| Oferta | **Condição concreta + prazo verdadeiro** | "Pedido fechado até [19/12], material na obra na volta das férias." | "Só até sábado: [condição]." |
| Educar | **Curiosidade sobre algo que todos veem e ninguém repara** (G7) | "Por que o tubo de esgoto é branco e o de água é marrom?" | "Você sabe por que esse molho é mais vermelho?" |
| Humor / comunidade | **Conflito já em andamento** (G10) ou **título-meme** de situação reconhecível | "Quando a lista da obra chega num papel de pão…" | "Quando o cliente diz 'é só uma pontinha'…" |
| História | **In medias res** (G6) ou **contraste presente × passado** | "Em 2012 a gente era Só Hidráulica." | "Comecei com um kit do Mercado Livre." |

Regras do gancho: detalhe **concreto e verdadeiro** (número, nome, lugar); **teste sem som** (o texto na tela conta o
assunto em ≤ 2 linhas); 3 versões para testar (o gancho é a variável mais barata: no estudo da casa, o mesmo autor
foi de 91 a 2.791 comentários só trocando o gancho); nunca "oi, gente", logo ou título genérico; e **o gancho fala
com quem compra**: para B2B, a dor de quem responde pela obra (prazo, equipe parada, especificação), não a do curioso.

---

## 6. Neuromarketing aplicado a vídeo curto (o que a ciência e as plataformas dizem)

1. **Atenção se decide no começo.** A Meta orienta "capturar a atenção rápido: comece forte"; nos testes dela para
   feed, o que funcionou foi **reduzir a uma história só, abrir com a imagem mais forte, encurtar e trazer a marca
   para mais cedo, com texto para quem assiste sem som** (Meta for Business). Números de mercado circulam ("71 % decide
   em 3 s", "65 % de quem vê 3 s fica 10 s"); são de consultorias e relatórios internos, use como tendência, não como
   lei.
2. **Lacuna de curiosidade (loop aberto).** Curiosidade nasce quando a pessoa percebe uma lacuna entre o que sabe e o
   que quer saber, e cresce perto de fechar (Loewenstein, 1994). Na prática: abrir uma pergunta que **só o vídeo
   fecha** ("e não é o que você imagina", a peça que ninguém lembrou) e fechar **antes do CTA**. Loop que não fecha é
   clickbait e queima o perfil.
3. **História com arco > informação solta.** Narrativas com arco dramático (tensão que sobe e se resolve) provocaram
   aumento de cortisol e oxitocina, e a oxitocina se correlacionou com empatia e com doação depois do vídeo; histórias
   com personagem melhoram a compreensão e a lembrança dos pontos semanas depois (Zak, HBR 2014; Cerebrum 2015).
   Tradução: **personagem + o que está em jogo + virada**, mesmo em 30 s.
4. **Emoção também vende em B2B.** No banco do IPA analisado por Binet & Field para o B2B Institute (LinkedIn), a
   decisão B2B é só "um pouco" mais racional que a B2C; campanhas emocionais têm mais efeito de marca no longo prazo e
   as racionais ativam venda no curto prazo; o equilíbrio vence. A Volvo Trucks (Live Tests, "Epic Split") partiu do
   insight de que o comprador de caminhão é "coração e cérebro" e de que **muita gente influencia a compra**: mais de
   100 milhões de views e quase 8 milhões de compartilhamentos, mostrando **uma característica por filme**, de verdade.
5. **Comitê de compra.** Em compra B2B complexa, a Gartner fala em grupos de 6 a 10 pessoas. Numa construtora: quem
   especifica (engenheiro), quem compra (suprimentos), quem recebe e reclama (mestre), quem paga (dono). Cada vídeo
   escolhe **um** deles como alvo e fala a língua dele.
6. **Especificidade gera crença.** Número, nome, hora e lugar ("Maria Farinha", "desde 2012", "8h às 18h sem fechar
   no almoço") valem mais que adjetivo ("qualidade", "excelência"). Prova visual > afirmação.
7. **Contraste e ressalva honesta.** Admitir um limite verdadeiro aumenta a confiança no resto (estudo da casa: os
   vídeos de maior autoridade têm "mas pera, isso não faz X"; Avis "We're number two, we try harder" virou prejuízo em
   lucro e durou 50 anos).
8. **Prova social certa.** Depoimento de **par** (engenheiro para engenheiro) pesa mais que número de seguidores.
   Prova de caixa (pedidos, obras entregues), não de vaidade.

---

## 7. Humor em vídeo de marca (estudo)

**Por que funciona:** humor prende e faz lembrar (anúncios mais engraçados foram mais lembrados no Super Bowl,
Warren, Percival Carter & McGraw). **Por que dá errado:** o que derruba a marca não é falta de graça, é **reação
negativa** (ofensa, constrangimento, nojo): no mesmo estudo, a reação negativa explicou muito mais a atitude com a
marca do que o quanto o anúncio era engraçado.

**A teoria que guia (violação benigna, McGraw & Warren):** rimos quando algo "está errado" mas é inofensivo.
- **Violação leve > grave**: o humor grave (acidente feio, perigo) faz rir igual e fere a marca.
- **Inclusiva > exclusiva**: rir da **situação** ou da natureza humana ajuda a marca; rir de **um grupo ou pessoa**
  (o cliente, a mulher, o nordestino, o pedreiro) piora a marca mesmo quando é engraçado.
- **Humor com encaixe no produto** (humor-product fit) protege a marca justamente com público **muito envolvido**
  (comprador B2B), que de outro modo se distrai com a piada (*Psychology & Marketing*, 2022, fonte no fim). Em B2B, **a piada tem que ser sobre o trabalho dele**, não solta.
- Em B2B, comprador gosta de humor e vê pouco (mais de 70 % dizem que é eficaz; 36 % dizem ver com frequência,
  citados pela Refine Labs): é espaço vazio.

**Mecanismos** (catálogo completo H1–H14 em `estudo_mavic.md` §3): quebra de expectativa (solene → banal),
exagero da dor, literalização, mal-entendido, personagem-tipo com bordão, **paródia de gênero** (documentário,
detetive, telejornal), anacronismo, repetição em escalada, metalinguagem ("isto é um anúncio"), plot twist, ironia
dramática, timing do silêncio, trocadilho, tag depois da marca. Use **1 mecanismo-mãe + 1–2 de apoio**.

**Como não queimar a marca (checklist):**
1. O alvo da piada é a **situação** (a lista no papel de pão, o prazo, o calor), nunca o cliente, a equipe dele ou um
   grupo. Se alguém do público pode se sentir o "bobo", reescreva até ele se sentir o "entendido".
2. O riso nasce de uma **verdade do público** que só quem vive aquilo reconhece (isso é o que gera compartilhamento
   entre pares).
3. **O produto é o fim da piada** (V1): troque a marca por outra; se a piada continua funcionando, ela não vende.
4. Uma frase séria no meio, curta, que **devolve a credibilidade** ("brincadeira à parte: decifrar lista é trabalho
   nosso").
5. Atuação séria, ninguém ri da própria piada; o absurdo é levado a sério.
6. Nada de piada racial, de gênero, política, de doença, de demissão ou de acidente de obra.
7. Em B2B: humor **de ofício** (a obra, a lista, o prazo, o jargão) > humor de internet (meme da semana).

**Exige na diária:** 2–4 pessoas que topem atuar, 1 locação real (o galpão, o balcão), lapela em todos, ensaio de
10 min, 2–3 takes por fala para achar o tempo do silêncio. 1 esquete ≈ 1h de diária.

---

## 8. Linguagens visuais e o que cada uma exige

Gramática completa em `catalogo_estilos.md` (E1–E40). Aqui, o que importa para planejar a diária.

| Linguagem | Serve para | Quem aparece | O que exige | Tempo de diária | Cuidado |
|---|---|---|---|---|---|
| **Cinemático / curta (E19)** | apresentar, autoridade, marca | dono ou personagem real; voz off | Ellcazo: câmera, lentes, luz motivada, gimbal/tripé, locação preparada, roteiro de planos; voz gravada à parte em sala silenciosa | 2–3 h (+ obra externa) | precisa de **ideia e personagem**; "bonito sem história" é vitrine cara |
| **Documental mínimo (E2)** | história, prova, processo | pessoas reais no lugar real | 2 tamanhos de plano, lapela, pouca encenação, acompanhar o processo de verdade | 1–2 h | deixar a pessoa falar; não decorar |
| **Entrevista sentada** | história, autoridade, corte em vários vídeos | dono, cliente | 2 câmeras (aberto + close), luz suave, fundo com profundidade, perguntas + pontos pra resposta espontânea | 40–60 min rendem 3–5 cortes | pedir resposta em frase completa (a pergunta é cortada) |
| **Institucional falado (talking head)** | apresentar, objeção, oferta | dono | teleprompter ou bloco curto decorado, 2 enquadramentos, inserts de prova | 30–40 min | fala contínua, não picada; inserts = o que é dito |
| **POV câmera viva (E17)** | método, bastidor, passeio | quem conduz | grande-angular na mão, caminho ensaiado, fala contínua andando | 20–30 min | o cenário tem que provar algo |
| **Tutorial / demonstração (E9)** | educar, prova de produto | quem domina | close de mão, mesa limpa, luz dura, um passo por frase | 20 min | resultado primeiro |
| **Esquete / humor (E18)** | comunidade, alcance, objeção leve | equipe que atua | 2–4 pessoas, figurino barato e assumido, lapela, campo/contracampo | ~1 h | checklist do §7 |
| **Trend / nativo de feed (E22)** | alcance barato | equipe | celular, áudio do momento | 10 min | só com motivo ligado à tese; a equipe do cliente faz no dia a dia |
| **Bastidor cru (E21)** | prova de que é real, rotina | equipe | celular, sem grading | contínuo (cliente grava) | não confundir com conteúdo principal |
| **Depoimento de cliente** | prova | cliente real com autorização | marcar com antecedência, 2 perguntas boas | 20–30 min por pessoa | autorização de imagem; nunca roteirizar a resposta |
| **Vitrine / lista** | oferta, mix | produto | planos de produto limpos, ritmo | 15 min | só depois que o cliente já confia |
| **Motion / texto (E14, E16)** | tese, dado, carrossel animado | ninguém | só edição | 0 de diária | não substitui gente quando gente rende mais |

Mistura recomendada num mês com 1 diária Ellcazo: **1 cinemático/documental** (o que só a Ellcazo faz) + **1 entrevista**
que vira 3 cortes + **1 talking head de objeção** + **1 esquete** + **2–3 de celular** que o cliente grava no dia a dia.

---

## 9. Escrita: fala contínua, cada frase com função

O erro da SN, em um exemplo:

> Picado (legenda): "Joelho: faz a curva do cano." / "Luva: emenda dois canos iguais." / "Tê: divide a água pra dois lados."

> Contínuo (pensamento): "Quando um encanador me pede 'aquele do banheiro', eu já sei que vou precisar perguntar mais
> duas coisas: a bitola e se é água quente ou fria. Lista de obra quase nunca vem completa, e tá tudo bem. O meu
> trabalho é perceber o que ficou de fora antes de virar uma viagem a mais."

Como escrever:
- Escreva **como a pessoa fala**, em 1ª pessoa, num bloco por momento do arco (não uma frase por plano).
- Cada frase faz **uma** coisa e dá pra dizer qual: abre a lacuna, apresenta, mostra o método, prova, admite limite,
  vira para o espectador, convida. Frase sem função sai.
- 3–12 palavras por frase, com variação; frase curta como pancada depois de uma longa.
- **Direção separada da fala**, em caixa alta, só onde muda o que se vê ou o tom (como na Live).
- **Mostre o que se diz** (falou "lista", aparece a lista real; falou "Maria Farinha", aparece a obra).
- Velocidade para estimar duração: 3,3 palavras/s (Reels falado), 2,5 (institucional), 1,5 (emocional/documental).
- Fecho que **responde o gancho** e convida com uma ação só, dita do jeito daquele vídeo.

---

## 10. Biblioteca de princípios (as maiores autoridades, só o que muda a escrita)

Não é resumo de livro. Cada linha diz **o princípio** e **como vira roteiro** (→). O prompt mestre consulta esta
biblioteca em cada etapa (indicado entre colchetes).

### 10.1 Roteiro, estrutura e cena [Roteirista, Diretor]
- **Aristóteles (Poética):** unidade de ação (uma história só); peripécia (virada) e reconhecimento. → Um vídeo, uma
  ação; a virada é o ponto em que o espectador "reconhece" algo.
- **Robert McKee (Story):** toda cena muda um valor de carga (+ → − ou − → +); se nada muda, não é cena; o caráter se
  revela na escolha sob pressão; a lacuna entre o que o personagem espera e o que acontece gera interesse. → Cada bloco
  do roteiro precisa virar uma carga (obra parada → obra andando; dúvida → confiança). Mostre a Sandra **escolhendo**
  sob pressão (o item que falta, a hora que aperta).
- **Syd Field (Screenplay):** 3 atos com pontos de virada; o problema tem que estar armado cedo. → Em 60 s: ato 1 até 10
  s, virada 1, ato 2 até 45 s, virada 2, fecho.
- **Blake Snyder (Save the Cat):** cena "salvar o gato" (o herói faz algo que nos faz gostar dele cedo); logline antes
  de escrever; beat sheet (imagem de abertura, tema dito, catalisador, debate, virada, diversão e jogos, ponto médio,
  tudo perdido, final, imagem final). → Toda ideia começa por **uma logline** de 1 frase; versão de bolso do beat sheet
  por duração (15 s: abertura · catalisador · final; 60 s: abertura · tema · catalisador · virada · ponto médio ·
  final · imagem final); imagem final espelha a de abertura.
- **Campbell / Vogler (jornada):** chamado, recusa, mentor, provação, retorno com o elixir. → A marca é **o mentor**
  (Miller), o cliente é o herói; a "provação" é a dor real dele.
- **John Truby (Anatomy of Story):** desejo × necessidade; o oponente quer a mesma coisa; argumento moral. → Personagem
  quer "preço baixo" (desejo) mas precisa de "obra sem parar" (necessidade): o vídeo mora nessa diferença.
- **Lajos Egri (Art of Dramatic Writing):** a **premissa** (personagem + conflito → resolução) testável. → Escreva a
  premissa antes do gancho: "lista conferida (personagem/ação) leva a obra sem parada (resolução)".
- **Pixar (Emma Coats, 22 regras; Story Spine; Andrew Stanton TED "Clues to a great story"):** "era uma vez… todo dia…
  até que um dia… por causa disso… até que finalmente"; admiramos o personagem pelo que tenta, não pelo que consegue;
  "faça-me importar"; **2+2**: dê as peças, não o 4. → O espectador soma; não explique a moral.
- **Aaron Sorkin:** intenção e obstáculo: alguém quer algo e algo está no caminho; sem isso não há cena. → Primeira
  pergunta do roteirista: quem quer o quê, e o que impede?
- **Charlie Kaufman (palestra BAFTA, 2011):** honestidade e especificidade pessoal vencem a fórmula. → É o filtro
  "de dentro" do MDD.
- **Hitchcock (a Truffaut):** surpresa = 15 s de susto; suspense = mostrar a bomba sob a mesa e dar minutos de
  tensão. → Mostre ao público o problema que o personagem ainda não viu (a peça que vai faltar) e deixe a tensão
  correr até a virada.
- **Kurosawa:** movimento na cena (vento, chuva, gente) dá emoção ao plano parado. → No institucional, algo se move no
  quadro (poeira no contraluz, carrinho, caminhão).
- **Walter Murch (In the Blink of an Eye):** regra de 6 no corte: emoção 51 %, história 23 %, ritmo 10 %, direção do
  olhar 7 %, plano 2D 5 %, espaço 3D 4 %. → Na dúvida, o corte que preserva a emoção ganha do corte "correto".
- **Eisenstein / Kuleshov:** o sentido nasce da justaposição: o mesmo rosto parece faminto, triste ou apaixonado
  conforme o plano seguinte. → O insert depois da fala decide o que o público sente (lista → obra andando = alívio).

### 10.2 Storytelling de marca e conteúdo [Estrategista, Roteirista]
- **Kindra Hall (Stories That Stick):** 4 componentes: personagem identificável, emoção autêntica, momento
  significativo, detalhes específicos; 4 histórias: valor, fundador, propósito, cliente. → Checklist de cada vídeo de
  história; mês com pelo menos 2 das 4 histórias.
- **Donald Miller (StoryBrand SB7):** personagem quer algo → tem problema (externo, interno, filosófico) → encontra um
  guia (empatia + autoridade) → que dá um plano → e chama para a ação → evita o fracasso → termina em sucesso. → O
  problema **interno** (medo, vergonha, cansaço) é o que prende; a marca mostra empatia antes da autoridade.
- **Matthew Dicks (Storyworthy):** toda história é sobre um **momento de 5 segundos** de mudança; comece o mais perto
  possível do fim; "homework for life" (anotar momentos todo dia). → Ache o momento de 5 s do cliente (a entrega que
  salvou a obra) e construa para trás.
- **Nancy Duarte (Resonate):** alternar "o que é" × "o que poderia ser" (sparkline); um momento inesquecível (STAR). →
  Para objeção e institucional.
- **Seth Godin:** "pessoas como nós fazem coisas assim"; o mínimo público viável; seja notável (vaca roxa). → B2B:
  falar como "nós, de obra"; nichar até doer (MDD).
- **Jonah Berger (Contagious, STEPPS):** moeda social, gatilhos, emoção, público, valor prático, histórias. → Crítico
  checa: por que alguém mandaria isso para outro? Qual gatilho do dia a dia lembra o vídeo?
- **Chip & Dan Heath (Made to Stick, SUCCESs):** simples, inesperado, concreto, crível, emocional, histórias; a
  maldição do conhecimento. → Crítico checa os 6; roteirista corta jargão que só o especialista entende.

### 10.3 Ganchos, atenção e vídeo curto [Copywriter, Editor]
- **MrBeast (documento de produção):** o primeiro minuto é o mais importante e tem que cumprir a promessa da capa;
  escalar sempre; nada chato. → Em Reels, o primeiro quadro cumpre o gancho; cada bloco sobe a aposta.
- **Paddy Galloway:** a ideia e a embalagem (título/capa) antes da produção; ideia fraca não se salva na edição. →
  Etapa de ideias curtas e baratas antes do pipeline completo.
- **Brendan Kane (Hook Point):** o mundo de 3 segundos; testar muitas versões rápido. → 3–5 ganchos por vídeo.
- **Nir Eyal (Hooked):** gatilho → ação → recompensa variável → investimento. → Série com recompensa que muda a cada
  episódio e um pedido de participação (mande sua lista, comente).
- **Alex Hormozi ($100M Leads; ganchos):** **Hook-Retain-Reward**; chamar o público pelo nome ("se você é engenheiro…");
  equação de valor (resultado desejado × probabilidade ÷ tempo × esforço); muitos ganchos para o mesmo corpo. →
  Copywriter escreve o gancho que chama a persona e promete o resultado com menos tempo/esforço.
- **Gary Vaynerchuk:** documente, não crie; um conteúdo pilar vira dezenas de micro conteúdos. → Diária gera entrevista
  pilar + cortes; bastidor documentado.

### 10.4 Persuasão e copy [Copywriter, Crítico]
- **Robert Cialdini (Influence; Pre-suasion):** reciprocidade, compromisso, prova social, autoridade, simpatia,
  escassez, unidade; o que se coloca em foco **antes** da mensagem muda como ela é recebida. → Abra o vídeo pondo em
  foco o critério que favorece o cliente (prazo, não preço) antes de falar dele.
- **Eugene Schwartz (Breakthrough Advertising):** 5 níveis de consciência (não sabe do problema → sabe do problema →
  sabe da solução → conhece o produto → pronto); o desejo não se cria, se canaliza; sofisticação do mercado. →
  Copywriter **escolhe o nível**: frio = história e problema; quente = oferta direta.
- **David Ogilvy:** pesquisa antes de escrever; fato específico vende; "o consumidor não é idiota". → Nada de adjetivo
  sem fato.
- **Gary Halbert:** a multidão faminta (mercado certo) vale mais que a melhor copy. → Persona certa > texto bonito.
- **Joseph Sugarman:** escorregador: a função da 1ª frase é fazer ler a 2ª; sementes de curiosidade. → Cada frase do
  roteiro empurra para a próxima.
- **Claude Hopkins (Scientific Advertising):** especificidade, teste, **afirmação preventiva** (contar o processo que
  todos fazem mas ninguém conta, como a Schlitz com o vapor das garrafas). → SN: mostrar a conferência da lista, que
  todo distribuidor "deveria" fazer e ninguém mostra.
- **Dan Kennedy:** mensagem-mercado-mídia; oferta com prazo; especificidade. → Oferta do vídeo tem condição e data reais.
- **Jim Camp / Chris Voss (negociação):** empatia tática, rotular ("parece que você…"), auditoria de acusações (dizer as
  objeções antes do outro), perguntas que admitem "não". → Roteiro de objeção começa dizendo a objeção em voz alta.

### 10.5 Mente e emoção [Estrategista, Crítico]
- **Daniel Kahneman:** Sistema 1 (rápido, intuitivo) decide primeiro; facilidade cognitiva; regra pico-fim. → Fala
  simples, um pico emocional e um final forte.
- **Paul Zak:** arco dramático gera cortisol (atenção) e oxitocina (empatia), e muda comportamento depois.
- **Uri Hasson (PNAS, 2010):** o cérebro de quem ouve se acopla ao de quem conta quando há compreensão; quanto maior o
  acoplamento, melhor a compreensão. → Clareza e ritmo de fala natural; quem fala tem que **entender e sentir** o que
  diz (não decorar).
- **Antonio Damasio:** marcadores somáticos: sem emoção, a decisão trava. → Mesmo o B2B racional precisa de uma emoção
  (alívio, orgulho, medo de perder).
- **Robert Sapolsky:** a dopamina sobe na **antecipação** e no "talvez". → Recompensa incerta segura (o que falta na
  lista? será que solta?).
- **Lisa Feldman Barrett:** emoção é construída pelo cérebro que prevê com base no contexto; quebrar a previsão captura
  atenção. → Gancho que quebra o esperado; contexto (trilha, luz) define a emoção da mesma imagem.
- **Paul Ekman:** emoções básicas lidas no rosto. → Close na reação; a emoção do rosto vende mais que a fala.
- **Gerald Zaltman:** a maior parte da decisão é inconsciente e se expressa por metáforas profundas. → Uma metáfora
  central por vídeo (a obra como relógio; a lista como mapa).
- **Martin Lindstrom (Buyology):** rituais, sons e sensações criam marcadores de marca. → Assinatura sonora/ritual fixo
  (o som do caminhão saindo, "próximo!").

### 10.6 Ofício traduzido para 15–90 s e para publicidade/documentário de marca
| Ofício | Em 15–30 s | Em 60–90 s | Em documentário de marca |
|---|---|---|---|
| Cold open (abrir no meio) | o primeiro quadro já é a ação | 3–5 s de cena antes do contexto | cena com som ambiente antes de qualquer fala |
| Bomba sob a mesa | o texto na tela mostra o risco que o personagem não vê | o risco volta a cada virada | o público sabe o prazo antes do personagem |
| Setup e payoff / callback | o gancho é respondido na última frase | 1 objeto plantado no início volta no fim | a imagem final espelha a de abertura |
| Subtexto | a imagem diz o que a fala não diz | contraste fala × imagem (ironia) | entrevista + imagem que revela mais |
| Montagem (Kuleshov) | 2 planos criam o sentido | sequência de 3 inserts por ideia | o B-roll é argumento, não enfeite |
| Som como emoção | silêncio de 1 s antes da frase forte | trilha sobe no respiro | som direto do lugar como personagem |
| Economia (Murch) | corte tudo que não serve à emoção | uma virada a cada 15–20 s | cenas de 1–2 min que prendem sozinhas |

---

## 11. Conteúdo magnético (Giulia Becker) e o que o acervo novo ensina

Acervo novo: `video-tools/estudos-perfis/` (2.078 arquivos de texto: transcrições, legendas, fichas e análises de
@giubeckers, Mavic, rabbits, Vianna, dacosta, Aslani, EarnEdits, 99hud, tráfego, tutoriais e canais do YouTube).
Estudos consolidados continuam em `video-tools/estilos/estudo_*.md`.

**Giulia (Giullya) Becker, comunicadora (895 mil seguidores):** "conteúdo magnético" = **o próprio vídeo é a prova do
que ela vende**. No post de referência (`giubeckers/.../DecE-WsxmJ9`, 34,6 mil curtidas, 2,47 mil comentários, 80 s):
"Como fazer uma pessoa travadona gravar?" → apresenta o personagem com a dor ("esse é o Esteve, só de olhar para a
câmera ele esquece o nome") → desafio com tarefas numeradas → resultado na frente da câmera → frase-mantra repetida
("tudo na vida é treinável") → CTA de palavra no comentário com material maior que o vídeo. Outros padrões (estudo
`estudo_giubeckers.md`): título-série fixo no topo; conhecimento técnico aplicado a um lugar real (o mercado prova a
aula: 14,2 mi de views); nome técnico para cada segredo (autoridade sem arrogância); objeção na voz do público ("Ai,
Giu, mas…", `DcJcoxMRu7z`, 15,2 mil curtidas, 3,1 mil comentários); fecho que vira o assunto para o seguidor + frase
assinatura sempre igual ("Ocupe seu lugar"); bastidor/erro depois do CTA como recompensa.
→ **Para clientes:** cada mês tem pelo menos 1 vídeo em que **a demonstração é a prova** (a lista conferida na frente
da câmera; a unha vista de lado; o molho rendendo na lata).

**Tráfego (`estudos-perfis/trafego/`):** o criativo de referência (Felipe Tâmbara, 41 s, 33 comentários) usa gancho de
**substituição/inimigo** ("pare de pedir X antes de…"), prova de custo concreta ("a lista inteira custou 60
centavos"), comparação com a alternativa cara (com preço), ressalva do jeito normal ("ele inventaria metade") e CTA de
palavra. → Para anúncio: número concreto + alternativa comparada + CTA de baixo atrito.

**YouTube (fluxos de IA, `estudo_youtube.md`):** o "one-shot" sai barato; dividir em etapas (Duncan Rogoff: 6
trabalhos; Lucas Leite: 8 skills + skill mestre) e manter um **arquivo de aprendizados** ("qual instrução teria
evitado esta nota?"). É o desenho do pipeline deste motor.

---

## 12. Radar do momento, dossiê e portões (resumo; desenho técnico em `RADAR-TENDENCIAS.md` e `MOTOR-ROTEIRO.md`)

- **Dossiê do cliente (etapa 0):** diagnóstico (dor → conteúdo → formato), produtos e como funcionam, preços, horário,
  equipe e quem aparece, estrutura, área de atendimento, reputação (Google, comentários, Reclame Aqui, WhatsApp), como
  o **dono** pensa × como o **cliente** enxerga a marca (a distância vira pauta), auditoria da comunicação atual.
  Atualizado por mês e guardado em cache (`client_scan`, `source`='dossie').
- **Portão de conhecimento:** "sei o suficiente?" com checklist pontuado; abaixo do mínimo não sai roteiro final, sai
  lista de lacunas e perguntas.
- **Radar do momento:** o que chama atenção agora no nicho (TikTok Creative Center, Google Trends PE, Biblioteca de
  Anúncios dos concorrentes, YouTube em alta, comentários, WhatsApp) + calendário (`seasonal_dates`, `client_dates`)
  com antecedência de produção. Cada ideia diz se é **do momento** (com validade) ou **perene**.
- **Inteligência de performance:** criativos com mais, menos e nenhum resultado (custo por resultado, CTR, frequência,
  fadiga) geram **criativo substituto** com diagnóstico (gancho, oferta ou público), sempre como sugestão.
- **Concorrência em camadas** (Recife, PE, Brasil, mundo) com ofertas e ângulos extraídos e **engenharia reversa**
  (gancho, batidas, prova, oferta, CTA, linguagem, mecanismo) → adaptar, nunca copiar. **Sair da bolha:** pelo menos 1
  referência de fora do nicho por mês, explicando por que funciona com o público local.
- **Checagem de fidelidade:** cada afirmação conferida contra dossiê/briefing; sem fonte = [a confirmar] ou corta.
  Exemplo real da SN: o portfólio diz "distribuidora **autorizada**" e o briefing diz "**oficial** Tigre"; no
  portfólio o ícone de WhatsApp está ao lado de (81) 93446-9009, e site e briefing dizem 98818-8000. Roteiro só afirma
  depois de confirmar.

---

## 13. Intenção em tudo

Mesmo o vídeo "simples" é simples **de propósito**. Cada escolha (formato, estrutura, linguagem visual, palavra,
pausa, plano, trilha, CTA) declara o porquê, e o card guarda uma **intenção** curta: emoção-alvo + efeito desejado
(ex.: "alívio → o engenheiro manda a lista da próxima etapa"). Escolha sem porquê sai no interrogatório interno.

## 14. Próximos passos (fase 2, só descritos)
1. **Memória de resultados:** ligar cada vídeo publicado (`content_items`/`av_projects`) às métricas (`social_metrics_daily`,
   `traffic_entity_daily`) e devolver ao motor "o que funcionou neste cliente" por formato, gancho e papel.
2. **Banco próprio de referências** com etiquetas (nicho, formato, gancho, mecanismo, número, data) e atualização
   semanal pelo radar, para o curador consultar antes de buscar na web.
3. Função SQL `roteiro_context(cliente, mês)` que junta o que hoje são consultas soltas (dossiê, desempenho, voz do
   cliente final), para a geração pela API ler o mesmo que o agente.

---
## 15. Vender sem parecer venda (e fechar sem queimar alcance)

Base: MDD §8 (venda invisível, régua 80/20, "invisível é a forma, nunca a verdade"), Mavic V1–V12, Hormozi, Cialdini.
- **Venda embutida:** o produto aparece **trabalhando** dentro da história ou do ensino (a lista conferida, a peça
  certa no lugar certo); teste do MDD: tirando toda menção comercial, o vídeo ainda merece existir?
- **Prova antes da oferta:** demonstração, caso, número; a oferta chega como consequência ("é por isso que…").
- **Quebra de objeção dentro do conteúdo:** a objeção dita pelo personagem ou pelo público (Voss: auditoria de
  acusações) e respondida com prova, sem tom defensivo.
- **Oferta irresistível (Hormozi):** resultado desejado ↑, probabilidade percebida ↑ (prova, garantia cumprível),
  tempo ↓, esforço ↓ ("manda a lista do jeito que estiver"). Bônus e garantia só se o cliente cumpre.
- **Escassez e urgência éticas:** só data, vaga ou estoque **verdadeiros** (MDD: "escassez por critério e sempre
  verdadeira"; rubrica da casa: validade compatível com o Código do Consumidor).
- **CTA suave × direto:** suave ("comenta", "manda pra quem…", "salva") para fases 1–3 e conteúdo de alcance; direto
  ("chama no WhatsApp", "pede até sexta") para fases 4–5, oferta e anúncio. Um CTA só. CTA no meio derruba retenção.
- **Loop aberto para o WhatsApp/direct:** prometer no vídeo um material **maior que o vídeo** ("comenta LISTA que eu
  te mando o checklist do que mais falta na hidráulica") → automação/atendimento entrega → conversa começa quente.
- **Fechar sem queimar alcance:** o fecho continua a história (callback, imagem final, tag); a oferta ocupa 2–5 s;
  nada de 10 s de cartela. 80 % do mês com venda invisível, 20 % explícita (MDD).

## 16. Algoritmo de cada rede (sinais e o que o roteiro faz para provocar)

Conhecimento **rotativo** (MDD): revisar mensalmente, com data. Estado em 18/11/2026.
- **Instagram (Adam Mosseri, jan/2025 e 2026):** os três sinais que mais pesam são **tempo de visualização, curtidas e
  envios**; curtidas pesam mais com seguidores, **envios por DM pesam mais para alcançar não seguidores**; métricas a
  acompanhar: envios por alcance, curtidas por alcance, tempo médio; conteúdo **original** é favorecido (marca d'água
  de outro app e repost atrapalham); **Trial Reels** mostram o Reel primeiro a não seguidores (testar ideias); Reels
  até 3 min podem ser recomendados; carrossel rende mais que foto única; agendar não prejudica.
- **TikTok:** retenção e visualização completa, replays, compartilhamentos, comentários e seguir após ver; busca
  interna forte (palavra-chave falada e escrita). Métricas de anúncio contam a partir de 2 s.
- **YouTube Shorts:** visualização completa e loop, engajamento depois de ver; título e palavras-chave pesam na busca.
- **Facebook/Reels:** mesma família da Meta; público mais velho; compartilhamento em grupos.
- **LinkedIn (B2B):** tempo de permanência, comentários de qualidade e rede do autor; vídeo nativo com legenda; perfil
  pessoal do dono costuma alcançar mais que a página (CONSENSO; testar).
- **Kwai e Pinterest:** Kwai = interior e classes C/D, humor e utilidade; Pinterest = busca visual e "ideia salva"
  (bom para acabamento, decoração, receita).

| Sinal | O que o roteiro faz para provocar |
|---|---|
| Tempo de visualização / retenção | gancho que cumpre, re-gancho a cada 15–20 s, loop aberto fechado no fim, mais curto possível |
| Envio por DM (compartilhar) | identificação ("isso é a minha obra"), humor de ofício, "manda pro mestre que…", utilidade para um terceiro |
| Salvar | conteúdo de consulta: lista, tabela, checklist, passo a passo, "salva antes de ir na loja" |
| Comentar | pergunta de escolha binária, opinião de mercado, palavra-chave por material, "qual a pior lista que você já recebeu?" |
| Seguir após ver | série com título fixo e promessa de próximo episódio |
| Replay | final que pede rever (detalhe escondido, loop perfeito) |
| Busca / SEO social | palavra-chave **dita** nos primeiros segundos, escrita na tela e na 1ª linha da legenda ("distribuidora de tubos em Recife") |

Duração e frequência: o menor tempo que conta a história (estudo da casa: o mesmo conteúdo em 9 s venceu o de 33 s);
consistência de qualidade (3–5 fortes por semana) > volume fraco (MDD §11).

## 17. Resultado imediato × construção de marca (e rentabilidade)

- **Rápido:** oferta clara + prova + tráfego pago + atendimento pronto (fase 4–5). **Constrói:** autoridade, história,
  comunidade, humor (fases 1–3). Binet & Field: emocional constrói no longo prazo, racional ativa no curto; os dois.
- **Mix do mês sugerido:** ~60 % construção (alcance, história, ensino, comunidade) e ~40 % conversão (objeção, prova,
  oferta), ajustado pela meta do mês e pelo nível de consciência do público. Cliente sem tráfego pago precisa de mais
  prova/oferta no orgânico; cliente com tráfego pode deixar o orgânico construir e o anúncio converter.
- **Rentabilidade:** custo por vídeo = horas de roteiro + diária ÷ vídeos da diária + edição. **Reaproveitamento é o
  que paga a diária:** 1 gravação → vídeo principal + 2–3 cortes + versão de anúncio 15 s com 3–5 ganchos + story +
  carrossel de quadros + Shorts. No máximo 6 vídeos por diária de 3 h (rubrica da casa).

## 18. Percepção de quem assiste

- **0,5–3 s:** rosto humano ou mão em ação, movimento já acontecendo, contraste forte, texto de 3–7 palavras legível
  sem som. Nada de logo, abertura lenta ou "oi gente".
- **Credibilidade:** autenticidade > produção em B2B e local (UGC e cru convertem bem: CONSENSO 2026); cinema só quando
  a ideia pede (institucional, marca). Produção alta demais em conteúdo de feed pode parecer anúncio e ativar o
  "escudo".
- **Carga cognitiva:** uma ideia por frase, um elemento novo por vez na tela, texto que não concorre com a fala.
- **Legibilidade no celular:** legenda grande o suficiente, fora das áreas da interface (topo e base), contraste alto,
  no máximo 2 linhas.
- **Som desligado:** a história se entende pela imagem + texto (teste sem som obrigatório).
- **Fadiga:** o mesmo rosto, cenário e fecho em todo vídeo cansam (o erro da SN); variar linguagem e plano.

## 19. Capa, título, legenda e SEO social
Capa com rosto + 3–5 palavras da promessa (a capa precisa ser cumprida no primeiro quadro, MrBeast); 1ª linha da
legenda = gancho + palavra-chave de busca; legenda completa: contexto → valor → CTA → pergunta; hashtags poucas e
específicas; palavra-chave dita em voz alta no começo.

## 20. Depois do vídeo: conversa e atribuição
Palavra-chave para DM/WhatsApp (automação ou atendimento com **roteiro de resposta pronto**: primeira mensagem,
pergunta de qualificação, entrega do material, próximo passo); link com UTM quando houver página; cupom ou código por
vídeo/campanha quando fizer sentido; pergunta "como nos conheceu?" no atendimento; etiqueta no WhatsApp Business
("Instagram", "anúncio") para contar resultado (estudo da SN: meta de 20 listas contadas).

## 21. Direção de não-atores (fazer o dono falar natural)
Perguntas em vez de texto decorado (entrevista que vira fala); **cola de tópicos** de 3–5 palavras por bloco; takes
curtos (um bloco por vez); aquecimento de voz e corpo (Giulia: "tudo na vida é treinável"); "conta como se fosse para
um cliente no balcão"; refazer só o bloco; deixar a pessoa trocar palavras, manter o pensamento; para quem trava,
começar pela história que ela mais gosta de contar. Ver anexo MDD "atuação e presença magnética".

## 22. Qualidade técnica mínima por nível
- **Celular (cliente):** luz de janela de frente, lente limpa, 4K/30, microfone de lapela sem fio, enquadramento na
  altura dos olhos, fundo que prova (estoque, obra), sem contra-luz.
- **Ellcazo padrão:** 2 câmeras, lapela + boom, luz principal suave + recorte, cor corrigida, −14 LUFS.
- **Cinemático:** lentes claras, luz motivada, movimento estabilizado, som ambiente gravado, trilha licenciada,
  grading. (MANUAL_EDICAO, `sound_design.md`.)

## 23. Teste A/B de ganchos e fadiga criativa
Mesmo corpo, 3–5 ganchos; trocar **uma variável por vez**; decidir por hook rate e depois por custo por resultado com
volume mínimo de impressões; Trial Reels no orgânico; fadiga: CTR caindo e frequência subindo por 7 dias → trocar
gancho primeiro, depois ângulo, depois formato (MDD, tráfego: fila de criativos pronta).

## 24. Colaborações, influenciadores locais e UGC de clientes reais
Par do público (engenheiro, mestre, cliente da loja) vale mais que celebridade; collab no Instagram soma alcance dos
dois perfis; UGC real exige autorização de imagem por escrito e pode virar anúncio (com permissão de uso).

## 25. Acessibilidade
Legenda em todo vídeo, contraste alto, fonte legível, não depender só de cor, descrição na legenda quando a imagem
carrega a informação, ritmo de fala compreensível.

## 26. Limites legais e éticos
- **LGPD:** nada de dado pessoal de cliente em vídeo (lista com nome/telefone borrados; conversa de WhatsApp só com
  autorização e anonimizada).
- **Direito de imagem:** autorização por escrito de quem aparece (cliente, funcionário, criança com responsável).
- **Música:** só licenciada ou da biblioteca da plataforma; anúncio exige licença comercial.
- **CONAR:** publicidade identificada como tal (#publi em parceria), sem comparação enganosa, sem denegrir concorrente
  (regra da casa: concorrente nunca pelo nome).
- **Conselhos de saúde:** medicina (Resolução CFM 2.336/2023: antes e depois só em caráter educativo e com as regras
  da norma; dados obrigatórios do médico), odontologia (CFO), estética e demais conselhos: sem promessa de resultado.
- **Código de Defesa do Consumidor:** preço e condição verdadeiros, validade razoável.

---
## 27. Humor como pilar (aprofundamento de §7)

**Teorias (por que rimos):** **incongruência** (a expectativa armada é quebrada de um jeito que faz sentido depois);
**superioridade** (rimos de quem erra; é a mais arriscada para marca: vira "rir DE"); **alívio** (a tensão acumulada
se solta); **violação benigna** (McGraw & Warren: algo está errado, mas é seguro; leve e inclusiva funciona,
grave e excludente fere a marca, ver §7 e fontes). Na prática, quase todo humor de marca bom é **incongruência +
violação benigna inclusiva**.

**Tipos e quando servem:**
| Tipo | O que é | Serve para | Cuidado |
|---|---|---|---|
| Observacional ("só quem trabalha com X sabe") | a verdade do ofício que ninguém fala | identificação e envio por DM (o mais forte para B2B) | precisa de detalhe real do nicho |
| Situação de balcão/atendimento | o pedido estranho, o cliente apressado | comunidade, objeção leve | rir **com** o cliente, nunca dele |
| Autodepreciativo | a marca brinca com o próprio defeito periférico | simpatia, quebra do "escudo" | nunca da competência central (MDD) |
| Absurdo / literalização | a expressão vira cena real | alcance | manter o fio com a dor real |
| Sátira do nicho | exagera o padrão do mercado (o inimigo-ideia) | posicionamento | atacar a prática, nunca o concorrente nomeado |
| Personagem fixo com bordão | rosto recorrente (Willy da Mavic) | série, hábito | o personagem precisa funcionar avulso |
| Ironia / contraste | texto diz uma coisa, imagem outra | objeção, crítica | leitura clara sem som |
| Paródia de trend / gênero | formato conhecido com conteúdo do cliente | alcance rápido | janela curta; envelhece |
| Meme | imagem/texto reconhecível | alcance barato | envelhece em semanas |

**Estrutura de piada:** setup (arma a expectativa) → punchline (quebra; a palavra-força no **fim** da frase) → tag
(piada extra depois). **Regra de três** (dois iguais, o terceiro quebra). **Callback** (a piada do início volta no
fim). **Timing:** pausa de 1–2 s antes do payoff; o rosto conta a piada (close de reação). **Economia brutal:** cortar
toda palavra que não serve ao riso. **Especificidade:** o detalhe real e absurdo do nicho é o ouro (MDD §9).
**Escalada:** cada repetição mais absurda (Mavic H8). Commit total: ninguém pisca para a câmera.

**Humor que carrega a mensagem sem perder credibilidade:** o produto é o fim da piada (V1); uma frase séria curta na
virada ("brincadeira à parte…") devolve a autoridade; humor mora em relacionamento/engajamento, **nunca na hora da
prova** (MDD); dose: tempero em até 40 % das peças, 100 % cômicas no máximo 15 % (MDD).

**Nichos sérios (saúde, jurídico, financeiro):** humor só sobre a **situação do paciente/cliente** (a fila, o medo da
agulha, a mania de pesquisar no Google), nunca sobre doença, resultado ou erro profissional; sem antes/depois em
piada; respeitar o conselho da profissão.

**Riscos:** ofender (grupo, cliente, região), envelhecer rápido (meme, trend), desviar da marca (a piada lembrada sem
a marca: teste "trocando a marca, a piada morre?"), parecer infantil para B2B (resolver com humor **de ofício**).

**Como achar o humor de cada cliente (garimpo):** listar 10 situações reais do dia a dia do cliente e do público
(perguntas estranhas, pedidos impossíveis, erros comuns, jargão, manias, "aquele cliente que…"); perguntar à equipe "o
que acontece aqui que faz vocês rirem?"; ler comentários e WhatsApp (as palavras reais são piada pronta); escolher a
que é verdade para o público, segura (benigna) e termina no produto.

**Referências que fazem bem (observação de mercado):** Mavic Produções (Roraima; universo de personagens, venda como
fim da piada; estudo completo em `estudo_mavic.md`), Porta dos Fundos (esquete; conteúdo de marca com roteiro forte),
perfis de marca que usam humor de comunidade (ex.: Netflix Brasil). Para B2B, Volvo Trucks (Live Test com humor e
espetáculo) e o humor de canteiro dos perfis de profissionais de obra.

**Checagem própria de humor (no pipeline):** o crítico responde: (1) é engraçado **para esta persona** (ela riria e
mandaria para um colega)? (2) o alvo é a situação? (3) a piada termina no produto? (4) envelhece em menos de 1 mês? (5)
lido em voz alta, o timing funciona? Nota de humor < 8 → reescrever ou trocar de formato.

## 28. Identidade de cada cliente (para todo roteiro soar como AQUELA marca)

**Base:** arquétipos (Jung; Mark & Pearson, *The Hero and the Outlaw*: 12 arquétipos, como o Cuidador, o Sábio, o
Herói, o Cara Comum, o Criador, o Bobo da Corte); plataforma de marca (propósito, posicionamento, personalidade,
promessa); tom de voz em **escalas** (formal ↔ informal, sério ↔ divertido, técnico ↔ simples, contido ↔ entusiasmado,
respeitoso ↔ irreverente); vocabulário próprio e bordões; MDD (onlyness, inimigo-ideia, marca-personagem, Eixo).

**Ficha de identidade audiovisual (uma por cliente):**
- Arquétipo principal + secundário · propósito · posicionamento (para quem, o quê, diferente de quem) · promessa.
- Tom em 5 escalas (1–5) · palavras e expressões **que usa** · palavras **proibidas** · bordões e frase-assinatura.
- Rosto da marca (quem aparece, como fala, o que não faz na câmera) · personagens recorrentes.
- Visual em vídeo: cores (da marca e do audiovisual), tipografia de legenda e títulos, enquadramentos preferidos,
  lugares que provam (cenários), luz, ritmo de corte, trilha (gênero, energia), assinatura sonora, fecho fixo.
- O que nunca: temas, piadas, formatos, concorrentes.
**Onde guardar (sem tela nova):** `client_brand_voice` (essência, propósito, arquétipo, tom, evitar, expressão,
regra_teste, pilares) + `client_brand_guides.guide` (visual) + `clients.brand_style` (voz, faça, evite, cores,
fontes). **O sistema deduz sozinho** arquétipo, escalas de tom e vocabulário a partir do perfil, site, briefing e
vídeos aprovados; **pergunta** o que só o cliente sabe (o que não pode, quem aparece, bordão que já usa, limites de
humor). A checagem de fidelidade compara cada roteiro com a ficha.

---
## 29. Autenticidade obrigatória

Cada cliente soa único; nunca cópia de referência nem de outro cliente.
1. **Referência é transformada:** só a mecânica (estrutura, ritmo, mecanismo psicológico) é aproveitada; fala,
   cenário, personagem e piada vêm do dossiê e da identidade do cliente (MDD: "originalidade é enquadramento").
2. **Teste da troca de logo** (Diferenciação Brutal): trocando só o nome, serve para outra marca? Reprova.
3. **Pelo menos 2 marcas de autenticidade** por roteiro: história real, bordão, pessoa real, lugar real, dado/número
   real, situação real do público (palavras reais).
4. **Similaridade:** comparar ideia, estrutura e gancho com os roteiros do mês, de meses anteriores do cliente
   (`strategy_cards`, `av_projects`) e dos outros clientes do mesmo mês; parecido demais = refaz.
5. Nota de **autenticidade** própria no crítico.

## 30. Mapa de frameworks por etapa do motor (qual etapa usa o quê)

| Etapa | Frameworks (fonte) | Para quê, na prática |
|---|---|---|
| **0. Dossiê** | **The Mom Test** (Rob Fitzpatrick: perguntar sobre o passado concreto, não opinião sobre o futuro) · social listening · dark social (o que circula em WhatsApp/DM e não aparece em métrica) | perguntas do briefing e da entrevista ("conta a última vez que uma obra parou por material"); ler comentários e conversas |
| **1. Estrategista** | **Byron Sharp / Ehrenberg-Bass** (*How Brands Grow*: disponibilidade mental, **Category Entry Points** = situações em que o comprador pensa na categoria, **ativos distintivos**) · **regra 95-5** (LinkedIn B2B Institute: só ~5 % dos compradores B2B estão no mercado agora; os outros 95 % precisam lembrar da marca depois) · **Binet & Field 60/40** (marca/ativação) · **See-Think-Do-Care** (Avinash Kaushik) e TOFU/MOFU/BOFU · **Posicionamento** (Ries & Trout) · **Value Proposition Canvas** (Osterwalder: tarefas, dores, ganhos) · JTBD · North Star por cliente · AARRR | escolher para quem e em que momento de entrada na categoria cada vídeo fala ("quando a etapa da obra vai começar"); equilibrar construção e ativação; dar ao vídeo um ativo distintivo fixo (fecho, bordão, cor) |
| **2. Curador** | **Steal like an artist** (Austin Kleon: roubar de muitas fontes e remixar) · engenharia reversa · camadas regional/nacional/global · "sair da bolha" | trazer referência de fora do nicho e transformar |
| **3. Ideação** | **SCAMPER** (substituir, combinar, adaptar, modificar, outro uso, eliminar, inverter) · **Seis Chapéus** (De Bono) · volume de ideias + filtro com nota · **Rory Sutherland** (*Alchemy*: a solução psicológica pode valer mais que a lógica; mudar a percepção é mais barato que mudar o produto) · **Fogg B=MAP** (comportamento = motivação × capacidade × gatilho) | gerar 10–15 loglines baratas; aumentar a "capacidade" do cliente agir (ex.: "manda a lista do jeito que estiver" reduz esforço) |
| **4. Copywriter** | Schwartz (níveis) · **Hormozi** (equação de valor, **Grand Slam Offer**) · psicologia de preço (**âncora**, **decoy**/opção-isca) · **4U** (útil, urgente, único, ultra-específico) · **PAS, PASTOR** (problema, amplificar, história, transformação, oferta, resposta) · **QUEST** (qualificar, entender, educar, estimular, transição) · **Star-Story-Solution** · **FAB** (característica → vantagem → benefício) · **Regra de Um** (uma ideia, uma promessa, uma oferta, um CTA) · **Caples** (títulos testados; o título é o anúncio do anúncio) · Cialdini | gancho, promessa, argumento, oferta e CTA; cada característica traduzida em benefício para a persona |
| **5. Roteirista** | **Dan Harmon Story Circle** (você, precisa, vai, procura, encontra, paga, volta, muda) · **"mas/portanto"** (Trey Parker & Matt Stone: cenas ligadas por "mas" e "portanto", nunca por "e então"; é o MAS/ENTÃO do MDD) · formas de **Vonnegut** (homem no buraco, Cinderela) · **7 enredos de Booker** (vencer o monstro, da pobreza à riqueza, a busca, viagem e volta, comédia, tragédia, renascimento) · want × need (Truby) · in medias res · **Zeigarnik** (o não terminado fica na memória: loop aberto) · StoryBrand (cliente herói, marca guia) · beat sheet | arco e fala; para documentário: **Errol Morris / Interrotron** (o entrevistado olha nos olhos da câmera; perguntas abertas e silêncio) e **Michael Rabiger** (*Directing the Documentary*: achar a história no material real, ponto de vista do autor) |
| **6. Diretor** | linguagem audiovisual: tamanho de plano e emoção (geral = contexto; médio = conversa; close = emoção; detalhe = prova) · movimento de câmera (push-in = tensão/importância; travelling = descoberta; fixo = verdade) · lente (grande-angular = proximidade/energia; tele = intimidade/compressão) · regra dos terços · **eixo de 180°** · luz de 3 pontos e **Rembrandt** · cor/grading por marca · **storyboard e shot list como entrega da diária** | plano da diária e decupagem |
| **7. Editor** | **J/L-cut** · **match cut** · **quebra de padrão a cada 3–5 s** no vídeo curto · hierarquia de texto na tela sem som (1 frase de gancho, legenda, palavra-chave) · trilha e sound design (`sound_design.md`) · Murch · Kuleshov | ritmo, cortes, legenda, trilha |
| **8. Crítico** | SUCCESs (Heath) · STEPPS (Berger) · checklist neuro e 5 filtros (MDD) · **hook rate, hold rate** · **nota prevista × resultado real** (calibrar o crítico com o que aconteceu) | notas e comparação com benchmarks |
| **9. Mês** | **pilares de conteúdo** e **70/20/10** (70 % do que já funciona, 20 % variação, 10 % experimento) · séries/franquias (Hero-Hub-Help) · 60/40 | diversidade e equilíbrio do mês |

---
## 31. Fontes

- Meta for Business: "Adopt a mobile-first creative approach" (facebook.com/business/news/mobile-first-creative) e
  "Video ads: testing what works for mobile feed" (facebook.com/business/news/building-video-for-mobile-feed).
- Loewenstein, G. (1994). *The Psychology of Curiosity: A Review and Reinterpretation*. Psychological Bulletin
  (cmu.edu/dietrich/sds/docs/loewenstein/PsychofCuriosity.pdf).
- Zak, P. (2014). "Why Your Brain Loves Good Storytelling", Harvard Business Review; Zak (2015), "Why Inspiring Stories
  Make Us React: The Neuroscience of Narrative", Cerebrum (pmc.ncbi.nlm.nih.gov/articles/PMC4445577).
- Binet, L. & Field, P. *The 5 Principles of Growth in B2B Marketing*, LinkedIn B2B Institute
  (business.linkedin.com/advertise/resources/b2b-institute/marketing-as-growth).
- Contagious (2014), "Insight & Strategy: Volvo, Live Tests" (contagious.com/en/article/news-and-views/insight-strategy-live-tests).
- Gartner, B2B buying journey (gartner.com/en/sales/insights/b2b-buying-journey), via resumo em geisheker.com.
- Warren, C. & McGraw, A. P. (2016). "When Does Humorous Marketing Hurt Brands?", Journal of Marketing Behavior
  (cópia em wearesocial.com/uk/wp-content/uploads/sites/2/2021/09/warren.mcgraw.2016a.pdf).
- Warren, C., Percival Carter, E. & McGraw, A. P. "The Influence of Perceived Humor and Negative Emotional Reactions on
  Brand Attitudes" (leeds-faculty.colorado.edu/mcgrawp/pdf/warren.percivalcarter.mcgraw.inpress.pdf).
- "The influence of humor in advertising: Explaining the effects of humor in two-sided messages", Psychology &
  Marketing, 2022 (onlinelibrary.wiley.com/doi/full/10.1002/mar.21634).
- Refine Labs, "Why Humor Works in B2B Marketing" (refinelabs.com/blog/why-humor-works-in-b2b-marketing).
- Avis "We try harder" (DDB, 1962), resumo em mynameiskalam.com/case-studies/avis-we-try-harder.
- Estudos internos: `video-tools/estilos/estudo_narrativas.md`, `estudo_mavic.md`, `catalogo_estilos.md`,
  `video-tools/NARRATIVA.md`, `.claude/skills/roteiro-narrativa/`.
- Mosseri (Instagram), sinais de ranking jan/2025 e 2026, via Social Media Today e resumo em zoomsphere.com/blog/instagram-algorithm-2026-what-actually-gets-reach; Trial Reels (creators.instagram.com).
- Hook rate e hold rate: sparkugc.com/resources/creative-metrics-glossary-thumbstop-hook-hold-rate; admakeai.com/blog/hook-rate (Meta: 3-Second Video Plays; TikTok: 2-second views).
- UGC: Modern Millie, "9 UGC video ideas" (youtube.com/watch?v=4xkWq0brqBk); attnagency.com/blog/tiktok-ugc-ads.
- MrBeast, "How to succeed in MrBeast production" (documento vazado, comentado em simonwillison.net/2024/Sep/15/how-to-succeed-in-mrbeast-production).
- Stephens, Silbert & Hasson (2010), "Speaker–listener neural coupling underlies successful communication", PNAS (pnas.org/doi/10.1073/pnas.1008662107).
- Berger, *Contagious* (STEPPS) (consumerresearcher.com/jonah-berger-contagious).
- Murch, regra de 6 (gointothestory.blcklst.com/walter-murch-and-the-rule-of-six-47de34be834a); Hitchcock a Truffaut, suspense × surpresa (nofilmschool.com/alfred-hitchcock-and-francois-truffaut-explain-surprise-vs-suspense); efeito Kuleshov (en.wikipedia.org/wiki/Kuleshov_effect).
- Pixar, 22 regras / Story Spine (aerogrammestudio.com/2013/03/07/pixars-22-rules-of-storytelling).
- Schwartz, níveis de consciência (betweenthelinescopy.com/blog/stages-of-awareness).
- Olson, ABT (crtc.wustl.edu/and-but-therefore-the-powerful-narrative-framework-transforming-scientific-communication).
- Hero-Hub-Help (practicalecommerce.com/the-hero-hub-help-content-marketing-strategy).
- CFM, Resolução 2.336/2023 sobre publicidade médica (sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2023/2336_2023.pdf).
- Catálogo de estruturas (§3c): Motion, "The 30 ad formats every top brand is stealing" (motionapp.com/library/talk/the-30-ad-formats-every-top-brand-is-stealing-in-2025); Influencer Marketing Hub, "The Complete Guide to UGC Video Ads" (influencermarketinghub.com/video-advertising/ugc-video-ads); thebrief.ai/blog/ugc-video-ads-guide-formats; TikTok for Business, guia de criativo (ads.tiktok.com/business/en/guides/what-is-ad-creative-guide); acervo interno `video-tools/estilos/` (E1–E40, M1–M24, H1–H14, V1–V12) e `video-tools/estudos-perfis/`.
- Trend e hype (MOTOR, RADAR): Billion Dollar Boy, ciclo de vida das trends no TikTok (netinfluencer.com/billion-dollar-boy-report-lifecycle-tiktok-trends); Bazaarvoice, trendjacking (bazaarvoice.com/blog/how-brands-can-leverage-trendjacking); Metricool, "Trendjacking: what works and what backfires" (metricool.com/trendjacking-what-works-and-what-backfires); Influencer Marketing Hub, "Is trend-jacking actually driving results" (influencermarketinghub.com/is-trend-jacking-actually-driving-results); Lei 9.279/1996 (marcas) e Lei 9.610/1998 (direitos autorais). GTA 6: data de 19/11/2026 anunciada pela Rockstar em 06/11/2025 (techradar.com/gaming/grand-theft-auto-6-release-date-confirmed-but-its-been-delayed-heres-why; gamesradar.com/gta-6-release-date-news-trailers-map-gameplay-rumours).
- Livros citados como referência bibliográfica (sem link): Aristóteles, *Poética*; McKee, *Story* (1997); Field, *Screenplay* (1979); Snyder, *Save the Cat* (2005); Campbell, *O herói de mil faces* (1949); Vogler, *A jornada do escritor* (1992); Truby, *The Anatomy of Story* (2007); Egri, *The Art of Dramatic Writing* (1946); Murch, *In the Blink of an Eye* (1995); Hall, *Stories That Stick* (2019); Miller, *Building a StoryBrand* (2017); Dicks, *Storyworthy* (2018); Duarte, *Resonate* (2010); Godin, *This Is Marketing* (2018); Heath & Heath, *Made to Stick* (2007); Kane, *Hook Point* (2020); Eyal, *Hooked* (2014); Hormozi, *$100M Offers* (2021) e *$100M Leads* (2023); Vaynerchuk, *Crushing It!* (2018); Cialdini, *Influence* (1984) e *Pre-Suasion* (2016); Schwartz, *Breakthrough Advertising* (1966); Ogilvy, *Ogilvy on Advertising* (1983); Halbert, *The Boron Letters*; Sugarman, *The Adweek Copywriting Handbook* (2006); Hopkins, *Scientific Advertising* (1923); Kennedy, *The Ultimate Sales Letter*; Voss, *Never Split the Difference* (2016); Camp, *Start with No* (2002); Kahneman, *Rápido e devagar* (2011); Damasio, *O erro de Descartes* (1994); Sapolsky, *Behave* (2017); Barrett, *How Emotions Are Made* (2017); Ekman, *Emotions Revealed* (2003); Zaltman, *How Customers Think* (2003); Lindstrom, *Buyology* (2008); Sharp, *How Brands Grow* (2010); Ries & Trout, *Positioning* (1981); Osterwalder et al., *Value Proposition Design* (2014); Sutherland, *Alchemy* (2019); Fogg, *Tiny Habits* (2019); Fitzpatrick, *The Mom Test* (2013); Booker, *The Seven Basic Plots* (2004); Rabiger, *Directing the Documentary*; Kleon, *Steal Like an Artist* (2012); Mark & Pearson, *The Hero and the Outlaw* (2001); De Bono, *Six Thinking Hats* (1985); Caples, *Tested Advertising Methods* (1932); Christensen, *Competing Against Luck* (2016); Sinek, *Start With Why* (2009); Minto, *The Pyramid Principle* (1987); Kaushik, See-Think-Do-Care (kaushik.net); LinkedIn B2B Institute, regra 95-5 (Dawes, 2021).
