# Motor de roteiro (audiovisual): o que a IA segue

Versão operacional de `ESTUDO-ROTEIRO-AUDIOVISUAL.md` (o porquê está lá; índice de seções no topo). O texto para a IA
executar é `PROMPT-ROTEIRO-MASTER.md` (núcleo curto + módulos por etapa; também no banco:
`select instructions from agent_instructions where slug='roteiro-master';`). Radar e calendário: `RADAR-TENDENCIAS.md`.
Teste aplicado: `TESTE-ROTEIROS-SN.md`.

**Regra do Italo (18/11/2026): é proibido gerar roteiro simples ou genérico.** Todo roteiro passa por um pipeline de
especialistas, com a **espinha do MDD** (Método De Dentro: verdade → causa → história → cena → negócio, e os 5 filtros).
Nada vai ao cliente; a equipe aprova.

**Decisões do coordenador (18/11/2026), já aplicadas abaixo:** (1) números do mix são orientação, não trava;
(2) o sistema escolhe sozinho as melhores ideias; (3) avaliação numa banca única com 4 notas; (4) card enxuto, sem
duplicação; (5) prompt modular; (6) conjunto de ouro calibra a banca.

## O pipeline (em ordem; cada etapa entrega uma saída curta que a próxima lê)

| # | Papel | Camada MDD | Entra | Sai |
|---|---|---|---|---|
| 0 | **Dossiê** | Verdade | contexto do sistema (consultas do prompt mestre), site, perfil, Google, portfólio, cache do mês | dossiê com fonte em cada item (negócio, produtos, preços, equipe e quem aparece, local, reputação e palavras reais do público, dono × como o cliente enxerga, comunicação atual, mapa dor → conteúdo → formato, ficha de identidade audiovisual) |
| 0b | **Portão de conhecimento** | Verdade | dossiê | nota 0–10 em 11 itens (é a base da nota de **conhecimento do cliente** da banca); **< 7: só pré-roteiro de validação**; lista lacunas, tenta preencher, gera perguntas e marca suposições |
| 1 | **Estrategista** | Verdade + Causa + Negócio | dossiê, identidade, personas, metas, radar e calendário, desempenho | Repertório + Eixo, tese do mês, personas, mix do mês por papel (orientação, ver abaixo), objetivo, fase de consciência, linguagem e alvo; cada vaga **do momento** (com validade) ou **perene** |
| 2 | **Curador de referências** | História | mix, radar, acervo (`video-tools/`), Biblioteca de Anúncios, TikTok Creative Center, web | 2–3 candidatas por vaga com nota (5 critérios); escolhida ≥ 7 e aderência ≥ 3; engenharia reversa; ≥ 1 de fora do nicho no mês; descartadas com motivo |
| 3 | **Ideação barata** | História | tudo acima | 10–15 loglines (SCAMPER); nota rápida; **o próprio sistema escolhe** a melhor por vaga (maior nota, desempate por diversidade no mês); as demais vão para `outras_ideias`. Ninguém precisa escolher; a equipe só aprova ou refaz o card |
| 4 | **Copywriter** | Negócio | ideia escolhida, persona, nível de consciência | promessa, **3 ganchos** (chamam a persona, concretos, funcionam sem som; servem também ao corte de anúncio), argumentos (FAB), objeção tratada, oferta (escassez só verdadeira), CTA pela fase |
| 5 | **Roteirista** | História + Cena | copy, persona, identidade, referência, conjunto de ouro | logline, frase-alma, intenção (emoção + efeito), arco por duração, **fala contínua palavra por palavra** de quem aparece (cada frase com função), perguntas + pontos para resposta espontânea (entrevista), fecho que responde o gancho |
| 6 | **Diretor (videomaker)** | Cena | roteiro | planos, câmera, luz, som, local e horário, quem precisa estar, **diária Ellcazo × celular**, shot list, plano da diária, cola de tópicos |
| 7 | **Editor** | Cena | roteiro + direção | ritmo, cortes, B-roll = o que é dito, motion (skill `motion-pro`), texto sem som, trilha, derivados, pacote de publicação |
| 8 | **Interrogatório interno** | os 5 filtros | tudo | por quê / como / onde / quando / com quem / para quem / e se tirar? por decisão; sem resposta sólida → refaz ou corta. Oculto (auditoria) |
| 9 | **Banca** (uma só) | todos | roteiro final, dossiê, conjunto de ouro | **4 notas** (abaixo), cada uma com 1 linha de justificativa, comparação com a referência e com o conjunto de ouro, checagem de humor se houver |
| 9b | **Avaliador às cegas** (condicional) | — | só o roteiro + a persona | roda **só se alguma nota da banca ficar a 0,5 ou menos do mínimo** (acima ou abaixo). Nota independente; diferença > 1,5 → revisa o critério divergente |
| 10 | **Loop** | — | notas | abaixo do mínimo: volta só à etapa que derrubou (máx. 2 rodadas); depois disso grava com a lacuna explicada em `suposicao` |

## A banca: 4 notas e mínimos
| Nota | O que mede | Mínimo |
|---|---|---|
| **Criativa** | média de: gancho (para em 3 s sem som, cumpre a promessa) · originalidade (não repete o mês, meses anteriores nem outro cliente) · construção narrativa (tensão, virada, payoff, callback) · clareza da fala (contínua, natural na boca de quem fala) · viabilidade de gravar · potencial de conversão/objetivo (vende sem parecer venda; provoca o sinal certo) · diversidade no mês. Humor: + nota de humor ≥ 8 | **8,5** e nenhum item < 7 |
| **Fidelidade** | cada afirmação, produto, preço, condição, nome, horário, prazo, número, promessa e caso conferido contra fonte; tom contra a ficha de identidade e os proibidos | **9**; dado inventado = 0 até corrigir |
| **Autenticidade** | ≥ 2 marcas do cliente (pessoa, lugar, caso, palavra, método); passa na troca de logo; referência usada só como mecânica | **8** |
| **Conhecimento do cliente** | nota do portão (0b), ajustada pelo uso real do dossiê no roteiro (usa o caso, a palavra, a persona certa?) | **7**; abaixo = pré-roteiro de validação com perguntas |

Referência (curador, à parte da banca): (2×aderência + estrutura + prova + viabilidade + originalidade) ÷ 3; mínimo 7 e
aderência ≥ 3; referência global explica por que funciona com o público local.

A banca **calibra pelo conjunto de ouro**: antes de dar a nota, compara o roteiro com o exemplo de ouro do mesmo papel
("está no nível do institucional da Rosanne? a transição está tão clara quanto na live do Colégio Militar?").

## Mix do mês: orientação, não trava
Os números abaixo são **ponto de partida**. O estrategista pode fugir deles **desde que escreva o porquê** na vaga
(ex.: "3 de conversão em vez de 2: dezembro tem pedido programado com prazo").
- Papéis: apresentar, objeção, prova e oferta costumam estar no mês; o resto varia.
- Linguagens: em torno de no máximo 2 iguais (vale a linguagem, não o rótulo); ao menos 1 cinemático/documental da
  diária Ellcazo; 1 de celular quando fizer sentido; humor considerado sempre que combina com a identidade.
- **Série recorrente não conta como repetição**: episódios de uma série aprovada (mesmo formato, tema novo) são uma
  linguagem só e não ocupam as vagas de "iguais". O que não pode é o mês inteiro virar a série.
- Fases de consciência misturadas (referência 30/40/25/5); ~60 % construção / ~40 % conversão (ajusta pela meta);
  70/20/10 (o que funciona / variação / experimento).
- Nada repetido do mês, dos meses anteriores ou de outro cliente (exceto a série, que repete o formato de propósito).

## Custo
Ideias curtas primeiro; pipeline completo só nas escolhidas pelo sistema. Modelo leve para coleta, resumo, radar e
ideação; o melhor modelo para copy, roteiro e banca. Avaliador às cegas só quando a nota fica no limite. Cada etapa
recebe **só os módulos do ESTUDO que usa** (ver o prompt mestre), nunca o estudo inteiro. Dossiê e contexto do mês em
cache (`client_scan`, `source`='dossie' e 'contexto_roteiro') e reaproveitados em todas as gerações do mês.

## Formato no card (aba audiovisual, tipo video): enxuto, sem duplicação
Leitura atual da tela: `data.roteiro` = blocos {`cena`: direção em CAIXA ALTA, `fala`: "NOME: texto contínuo"}; os
outros campos de texto aparecem em "Ver detalhes". Não mudar telas.

**Visível (o que a equipe lê primeiro):**
- `roteiro`: 3–7 blocos do arco. `cena` = direção em CAIXA ALTA (só onde muda o que se vê); `fala` = bloco contínuo com o
  nome de quem fala ("SANDRA: …"). Pedido de detalhe para a pessoa preencher vai entre colchetes dentro da fala.
- `por_que_existe`: 1 frase.
- `intencao`: 1 frase, "emoção → efeito" (ex.: "alívio e confiança → o engenheiro manda a lista").
- `notas`: **o único lugar das notas**, 1 linha: "Criativa 8,7 · Fidelidade 9 · Autenticidade 9 · Conhecimento 5,3 ·
  pré-roteiro de validação". O detalhe por item fica em `auditoria.banca`.

**Campos que já existem (mantidos, sem repetir conteúdo):** `formato`, `ideia`, `ganchos` (os 3; **o único lugar dos
ganchos**; o 1º é o que abre o roteiro; o corte de anúncio usa estes mesmos), `outras_ideias` (as loglines que o sistema
não escolheu), `referencia` {`link`, `porque`}, `cruzamento`, `filmar`; no card: `funil`, `serve`, `meta`, `inspirado`,
`suposicao` (**só lacunas** "[a confirmar: …]", nunca notas).

**Extras (atrás de "Ver detalhes"; o PDF e a equipe leem):** `papel`, `linguagem`, `persona`, `frase_alma`, `duracao_s`,
`momento` ('perene' ou {`validade`}), `nasceu_de` [{`fonte`, `dado`}], `marcas_autenticidade` [..], `perguntas`
[{`pergunta`, `pontos`}] (entrevista), `producao` {`plano_diaria`, `shot_list`, `cola`, `derivados`, `publicacao`
{`capa`, `primeira_linha`, `legenda`, `cta_comentario`}, `pos_video` {`palavra`, `resposta`}}.

**Auditoria (oculta):** `auditoria` {`etapas` (1 linha por etapa), `interrogatorio` [{`pergunta`, `resposta`}], `banca`
{`criativa` {itens, justificativa}, `fidelidade` [{`afirmacao`, `fonte`, `status`}], `autenticidade`, `conhecimento`},
`cego` (só se rodou), `rodadas`}, `referencia_nota` {aderencia, estrutura, prova, viabilidade, originalidade, nota,
descartadas}, `logline`, `arco`.

Proibido repetir: gancho fora de `ganchos`; nota fora de `notas`/`auditoria.banca`; a mesma frase em `ideia`,
`por_que_existe` e `cruzamento` (cada um diz uma coisa: a ideia, o motivo, o dado que sustenta).

## Conjunto de ouro (régua da banca)
Roteiros aprovados que mostram o nível esperado. A banca compara com o exemplo do mesmo papel antes de dar a nota; o
roteirista lê o do papel que vai escrever. **É régua de escrita, não modelo de conteúdo** (outro cliente nunca vira
regra de conteúdo).

### 1. Método Visage · Rosanne Ventura (nail designer), Ellcazo, 4 vídeos
Fonte: PDF "Roteiros Método Visage Rosanne Ventura Ellcazo" (equipe, nov/2026).
| Vídeo | Papel | O que ensina |
|---|---|---|
| 01 "Unhas em gel com acabamento natural" | apresentar / institucional | abre na **dúvida real** ("tem receio de que fique grossa ou artificial"); **se apresenta depois do gancho**; método em 1ª pessoa ("antes de começar, eu observo o formato da sua unha…"); um valor emocional ("um tempo pra você"); fecha **convidando** ("se esse é o tipo de atendimento que você procura, me chama") |
| 02 "Como tudo começou" (3 perguntas) | história / entrevista | perguntas tiradas da **história real** (kit do Mercado Livre, pós em genética, a filha) com **"pontos pra resposta espontânea"** embaixo; a 3ª pergunta é cênica e gera imagem ("qual detalhe você ia querer que ela reparasse?") |
| 03 "Alongamento em gel fica grosso?" | objeção / carro-chefe | título = objeção do público; **ação de prova** com direção entre colchetes ("[mostra a unha de perfil]"); três dúvidas reais respondidas com **critério, não promessa** (respeita regra de saúde/estética) |
| 04 "Qual serviço em gel combina com você?" | oferta / cardápio | serviços organizados pelo **desejo do cliente** (comprimento, reforço, cor por mais tempo), não por lista; fecha com **pergunta de escolha** |
Lição geral: fala contínua de quem aparece; cada frase faz uma coisa (dúvida → quem sou → como faço → por que importa →
convite); direção só onde muda o que se vê; nenhum adjetivo vazio.

### 2. Live da Formatura do Batalhão Escolar · Colégio Militar do Recife, Ellcazo
Fonte: PDF "Roteiro Live Batalhão Escolar CMR Ellcazo" (18/11/2026).
| O que ensina | Onde aparece |
|---|---|
| **Contexto antes de tudo**: quem fala, onde, o que vai acontecer e por que importa | abertura: "ser coronel-aluno é assumir a responsabilidade de liderar os próprios colegas" |
| **Blocos com função** e **direção em CAIXA ALTA separada da fala** | 6 blocos (abertura, cerimônia, entrevista 1, entrevista 2, comandante, encerramento); "CORTA PARA O PÁTIO · MICROFONE DA APRESENTADORA FECHADO" |
| **Transições escritas**: o espectador nunca fica perdido | "a gente volta em instantes pra ouvir [nome de quem assume]…" |
| **Perguntas que sobem de nível**: emoção → aprendizado → mensagem | "o que passou pela sua cabeça?" → "o que liderar te ensinou?" → "que conselho você deixaria?" |
| **Lacuna honesta** entre colchetes em vez de inventar | "[nome da aluna]", "[nome de quem entrega]" |
| **Referência de linguagem nomeada** em 1 linha | "CazéTV, cerimônia de abertura de Paris 2024" |
| Encerramento com agradecimento, ciclo e despedida | "acontece todos os anos… a gente se vê na próxima" |

### Novos aprovados (espaço aberto)
Quando o Italo aprovar um roteiro gravado que performou (ou que ele marcar como "régua"), acrescente aqui:
| Data | Cliente | Vídeo | Papel | O que ensina (1 linha) | Fonte |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## Aprender com o Italo
Cada recusa (`reject_reason`), refação (`redo_pedido`) e edição vira uma linha em `content_rules` ou no arquivo de
aprendizados: "qual instrução teria evitado esta nota?". Roteiro aprovado sem edição é candidato ao conjunto de ouro.
A banca calibra a nota prevista com o resultado real quando houver (fase 2).
