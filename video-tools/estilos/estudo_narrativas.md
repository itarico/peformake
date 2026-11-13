# Estudo — Construção narrativa das referências (08/11/2026)

Pedido do Italo: "de todos os vídeos que vimos, entenda como foi feita a construção narrativa — escopo, roteiro,
narração, storytelling". **Este arquivo não resume os assuntos** (ferramenta X, curso Y). Ele extrai a
**engenharia** de cada roteiro, que serve para qualquer tema: tipo de gancho, batidas com tempo, recursos de
retenção, fecho, ritmo de fala. Complementa `NARRATIVA.md`, a skill `roteiro-narrativa` (modelos M1–M8),
`estudo_giubeckers.md`, `estudo_youtube.md` §2 e `tutoriais_aplicar.md`. Os modelos novos começam no **M9**.

## 0. Base do estudo
- **128 pastas do Instagram** (`_salvos/{claude,edicao,profissionais}`, `_perfis/giubeckers`, `_estilos`,
  `_tutoriais`; `_trafego` está vazio).
  - **104 analisados pela fala** (transcrição + legenda do post).
  - **9 analisados pela imagem** (sem fala, mas com narrativa visual ou texto na tela) → §7.
  - **15 pulados:** 14 sem fala nem narrativa (vitrines de SFX/pack de projeto, remakes de luta, demos de efeito,
    talking heads em uzbeque sem transcrição) + 1 duplicado (Andrhé `DfLJHz4i4gS` aparece em duas pastas).
- **YouTube (amostra para narrativa longa):** os 4 de documentário (`CLnS22LHdkw`, `IjMVme1aDWg`, `bwz-jLZz2w8`,
  `gwyneGrX9Jw`) + 2 MAESTROS (`2Ui4Qiuo-tQ`, `JF1jgRuFOMQ`). No Instagram também entram 2 ficções longas
  (Kagome, 164 s; Chronicles of Bone, 15 min).
- **Palavras por segundo (w/s)** = palavras da transcrição ÷ duração total (inclui trechos sem fala).
  Mediana dos 104: **3,32 w/s**; só português (71 vídeos): **3,43 w/s**. Duração mediana: **53 s** (p25 36 s ·
  p75 74 s).

### Legenda dos códigos da tabela
**Objetivo:** V vender · L lead (comentar palavra → direct) · E educar · A autoridade · P posicionar ·
Em emocionar · En entreter.
**Gancho:** D desejo (resultado + personagem + prazo) · N novidade ("agora X faz Y") · R demonstração/resultado
primeiro (inclui "este vídeo é a prova") · P prova/número · C curiosidade/pergunta · CI contraintuitivo/sentença ·
PR polêmica/resposta · I inimigo/substituição (caro × grátis, Davi × Golias) · H história/in medias res ·
Cf confissão/segredo · Ds desafio/transformação ao vivo · Dl diálogo/esquete.
**Retenção:** LA loop aberto · LN lista numerada · PV progresso visível · UI "o último é o mais importante" ·
AD antes/depois · PE personagem · DI diálogo · HU humor · PG pergunta direta ao espectador · NT nome técnico ·
NE número específico · RA revelação adiada · VA virada anunciada ("a parte mais interessante", "o pulo do gato",
"mas pera") · RS ressalva honesta ("ninguém te conta", "só não exagera") · MR meta-revelação ("esse vídeo foi feito
por IA") · BT bastidor/erro no fim.

---

## 1. Tabela por vídeo (104 com fala)

### 1.1 `_salvos/claude` (28) — nicho "ferramenta de IA + comenta palavra"
| autor | id | dur | obj | gancho (tipo · frase) | estrutura em batidas | retenção | fecho/CTA | w/s | bom ou fraco porquê |
|---|---|---|---|---|---|---|---|---|---|
| Lucas Pinheiro | DeRyI-tM_0U | 25 | L | R · "Abra esse site, faz o login…" | passos 0–14 · resultado 14–19 · CTA 19–25 | NE ("menos de 1 min") | "comenta Claude que eu te mando" | 3,0 | sem promessa: começa no passo 1. Funciona pela isca (695 coment.) |
| Lucas Pinheiro | DfLAmABCC7c | 29 | L | N+D · "Claude agora cria um carrossel automático em menos de um minuto e eu vou te mostrar como" | promessa 0–8 · passos 8–19 · prova 19–25 · CTA 25–29 | NE | idem | 3,1 | mesmo roteiro do anterior com promessa na frente: comparação útil de A/B |
| Juan | DfU15waS65m | 72 | L | I+NE · "Para de pagar a assinatura que já tem versão de graça… 9 trocas, mais de R$ 1.400 por mês" | gancho 0–9 · 9 itens "No lugar do X, o Y" 9–39 (~3 s cada) · prova social 39–44 · RS 44–57 · regra transferível 57–63 · CTA 64–69 · pergunta 69–71 | LN, NE, RS, PG | "Comenta REPO…" + "Qual dessas você cancelaria primeiro?" | 3,3 | forte: fórmula repetida em cada item, ressalva que dá confiança, CTA duplo (isca + opinião fácil) |
| Jammal | DfVmmblBD1z | 72 | L/E | C · "Você sabe fazer esse tipo de animação aqui? Eu vou te ensinar em um minuto!" | gancho 0–5 · passos 5–26 · CTA no meio 26–31 · passos 31–60 · CTA 60–72 | — | "comenta eu quero" + segue | 3,9 | fraco: CTA no meio quebra o fio; passos sem marcos (4 coment.) |
| Igor Henrique | DfGTf2fO0Q4 | 53 | L | N · "Agora eu consigo usar o Claude pra criar aplicativos de iPhone e instalar direto no meu celular" | gancho 0–6 · "olha como funciona" · o que é 7–22 · VA 22–38 · RS 38–43 · "imagina…" 43–48 · CTA 48–53 | VA, RS | "Quer aprender? Comenta X2" | 3,5 | esqueleto-padrão do nicho; "imagina ter a ideia de manhã e testar no mesmo dia" põe desejo antes do CTA |
| Igor Henrique | DfQtz48tThx | 44 | L | CI · "Essa ferramenta acabou de vez com o Claude. E eu vou te explicar o porquê." | gancho+LA 0–4 · nome+NE 70% 4–11 · problema 11–21 · mecanismo 21–37 · benefício 37–40 · CTA 40–44 | LA, NE, NT ("Knowledge Graph") | "Quer testar grátis? Comenta token" | 3,4 | gancho exagerado, miolo exemplar: problema → mecanismo com nome → benefício |
| IA no Fácil | DfGmXVPhzmn | 32 | L | N+D · "O Claude agora consegue cuidar da produção do seu canal do YouTube inteiro!" | gancho 0–4 · nome 4–9 · etapas 9–18 · VA "a parte mais interessante?" 18–26 · síntese 26–30 · CTA | VA | "Comenta FÁBRICA" | 3,2 | correto; a dor ("canal que você nunca começou") ficou só na legenda |
| Gabriel Gouvea | De9lLWSsJAj | 65 | L | H+I · "Um cara fez engenharia reversa no OpusClip e escreveu isso aqui no topo do projeto dele." | história 0–5 · o que faz 5–14 · HU ("ele admite que o Opus é bom") 14–18 · defeitos do rival 18–24 · vantagem 24–28 · passos 28–40 · "olha o que entrega" 40–49 · VA "pulo do gato" 49–60 · CTA | PE, LA, I, VA×2, NE | "Comenta CORTE" + segue | 3,9 | forte (10,9 mil curtidas): personagem + rival + duas viradas anunciadas |
| Pedro Augusto | DfDWbpugC2T | 64 | L | P+CI · "A skill mais instalada… passou de 4 milhões de instalações, e não é a que você imagina." | gancho 0–6 · contexto 6–9 · ranking 4º→2º 9–24 · revelação do 1º 24–38 · RS "ninguém te conta" 38–52 · regra 52–58 · CTA 58–64 | RA (contagem regressiva), NE, RS | "Top 10 + minha lista de segurança: comenta E37" | 3,65 | muito forte: loop aberto até 24 s; alerta de risco dá autoridade; CTA promete mais que o vídeo |
| Dev em dobro | DfHnBYqhCyq | 41 | L | L · rajada de 35 nomes | lista 0–35 · CTA 35–41 | volume | "comment…" | 2,2 | fraco: nomes sem promessa nem benefício |
| Santinello | DfFU8OHiVZa | 57 | E/A | N+I · "Fizeram o Higgsfield open source que roda no seu PC sem pagar crédito nenhum." | gancho 0–4 · o que é 4–14 · história de bastidor (prometeram e não abriram; concurso de US$ 25 mil) 14–28 · recursos 28–45 · bônus 45–53 · "gostou?" | história, NE | "E aí, gostou? Me segue" | 3,6 | bom miolo; CTA vago = 36 coment. |
| Leonardo Bortolazzi | DfHo-nkxqc2 · DfHsVmqJZBv · DfNE87epzsb | 40 · 42 · 40 | L | D · "Como eu faço os meus sites em 5 minutos?" | pergunta 0–4 · plataforma 4–16 · cola no Claude 16–28 · resultado 29–37 · CTA | NE, resultado na tela | "comenta BUILD" | 3,0 · 2,8 · **1,7** | 3 versões do mesmo roteiro: a mais enxuta e lenta (mais tempo de resultado na tela) teve 4.461 coment. contra 148 e 3.421 |
| Marcos Maia | DfFaVmAitkU | 46 | V | R · "Hoje a internet está assim: você instala o dedo e aí eu posso fazer a review de um carro que nem lançou…" | demonstração 0–36 · virada "saber fazer não basta… converter em dinheiro" 36–44 · CTA | AD, HU ("dá pra ver meu reflexo?") | "Quer aprender, comenta" | 3,8 | 35 mil curtidas: o vídeo é a prova; a virada troca a promessa técnica por dinheiro |
| Ciarevit | DfYF7QvR9_K | 36 | L | P · "60 vídeos em 3 dias, e isso eu fiz sozinho usando esse plugin aqui." | gancho 0–6 · fluxo 6–19 · nome 19–23 · identificação "se você, assim como eu, sofreu…" 23–31 · CTA | NE, identificação | "comenta plugin" | 3,3 | bom gancho; identificação veio tarde demais |
| Henrique da IA | DfCXg0VPOiw | 65 | L | I · "O Google cobra caro… Aí a China foi lá e soltou um melhor, de graça." | rival 0–6 · nome+ranking 6–18 · como funciona 18–37 · requisito 37–45 · onde testar 45–49 · CTA 49–54 · compartilhar 54–58 · assinatura 58–65 | Davi × Golias, NE | "comenta H3" + "manda pro amigo que ainda paga mensalidade" + "Eu sou Henrique e aqui…" | 3,3 | CTA triplo com alvo de compartilhamento definido |
| Augusto Gobatto | DfGjbeHNdTZ | 33 | L | N+P · "Esse repositório do GitHub clona qualquer vídeo viral. 26 mil estrelas." | gancho 0–4 · o que faz 4–8 · objeção "Não tem tempo? Tá, ninguém tem." 8–10 · passos 10–27 · MR "esse vídeo saiu assim" 27–28 · HU "o Augusto só reclamou do meu queixo" · CTA | MR, HU, objeção em 2 batidas | "comenta vídeo" | 4,3 | ótimo: frases de 3–6 palavras; narrador é a própria IA |
| Manoel Thiago | DfAI_ZaRJWm | 86 | V | H (rotina) · "O meu Claude acorda todo dia, uma hora da manhã, vai lá no TikTok…" | rotina narrada 0–52 · resultado vago 52–62 · oferta (PDF R$ 47) 62–86 | PE (a IA como funcionário) | "escreve DORME" → PDF pago | 2,7 | narrativa boa ("trabalha enquanto você dorme"); preço falado e fim arrastado |
| Mateo Jiménez | DfLCSibu-8N | 50 | L | P+D · "Con esta skill… publicamos más de 100 carruseles todos los meses." | gancho 0–4 · por quê 4–12 · 3 entradas 12–25 · "lo mejor" 25–36 · resultado (mês em 1 h) 36–44 · CTA | NE, VA | "comenta CARRUSEL" | 4,3 | prova de volume + prazo |
| Igor Miranda | DfHXuayxxaK | 77 | L | D+PE · "Como eu coloquei a Mia pra gerar leads quentes pra mim todos os dias?" | gancho 0–5 · prova datada ("7 da manhã do dia 30 de outubro… 7 leads") 5–16 · CTA intermediário 16–26 · como 26–64 (NE 215 → 13 leads) · generaliza 64–66 · bônus 66–71 · CTA | prova com data e hora, NE | "comenta LEAD" | 3,6 | prova datada excelente; CTA no meio dispersa |
| Vini Parizotto | DfMyjdCAQ8L | 81 | L | N · "Tem uma skill do Claude que encontra o B-roll perfeito para o teu vídeo." | gancho 0–4 · define o termo 4–7 · origem 7–13 · como 13–41 · CTA 43–53 · repete 53–78 · CTA | definição para leigo | "comenta IA" (2×) | 4,3 | fraco: fala continua depois do CTA, conteúdo repetido |
| Ghost Lab | DfDIDp4pnRT | 41 | L | CI+D · "Pedi pro Claude prever os meus próximos 5 anos e ele foi assustadoramente preciso." | gancho 0–5 · negação "nada de astrologia" 5–9 · prompt 1 · prompt 2 · "esses dois impressionam, mas o terceiro é brutal" 20–28 · AD 28–30 · "e o último?" 30–35 · condição · CTA | LN, escalada, AD, UI | "comenta FUTURO" (4 prompts) | 3,35 | ótimo: curiosidade sobre si mesmo + intensidade crescente (6,1 mil curtidas) |
| Felipe Tâmbara | DeP5nEBCCh0 | 36 | L | N · "Alguém acabou de criar a skill mais poderosa… e ninguém está usando ela de verdade." | gancho 0–5 · autoridade de origem 5–9 · como 9–26 · NE 3 mi 26–30 · FOMO 30–34 · CTA | FOMO, NE | "comenta SKILLS" | 4,2 | 5,1 mil coment.: superlativo + "ninguém usa" + "você está ficando pra trás" |
| Marina Braz | DfUqo5sAPZh | 67 | L/A | D (resultado+personagem+prazo) · "Como eu coloquei a minha empresa no top 1 do Google em 5 dias?" | gancho 0–4 · prova 4–11 · analogia "sabe quando você pesquisa um restaurante…" 11–24 · 3 passos 24–43 · resultado + bônus 43–52 · generaliza · CTA · assinatura de série | analogia cotidiana, NE, série | "comenta GOOGLE" + "mais um episódio de…" | 3,3 | Kallaway de livro; a legenda conta o erro engraçado (bastidor) |
| Copfy | DfDDIHCDadw | 72 | L | N+D · "Agora você consegue dar um número de WhatsApp pro Claude e fazer ele atender seus clientes" | gancho 0–6 · cena "imagina, 2 da manhã…" 8–18 · nome+NE 18–28 · 3 passos 28–52 · RS "mas pera" 52–65 · compartilhar 65–69 · CTA | cena, LN, RS | "Manda pra aquele amigo que perde venda porque demora pra responder" + "comenta ATENDENTE" | 3,2 | fórmula fixa da série Copfy |
| Copfy | DfGgIh-DyiK | 70 | L | N · "Caraca! Agora o Claude entra no Google Maps e encontra todas as empresas da cidade." | mesma fórmula (exemplo concreto "clínicas de estética de Campinas", RS "só não exagera") | RS | idem | 3,1 | 42 curtidas: a fórmula não salva um desejo fraco |
| Copfy | DfcNUfKRpZ6 | 60 | L | R+MR · "Eu não editei e nem gravei um segundo desse vídeo." | MR 0–7 · insumos 7–13 · passos 13–56 · CTA | MR | "digita SHORTS" | 3,2 | gancho "este vídeo é a prova" |

### 1.2 `_salvos/edicao` (26 com fala)
| autor | id | dur | obj | gancho | estrutura | retenção | fecho/CTA | w/s | bom ou fraco porquê |
|---|---|---|---|---|---|---|---|---|---|
| Melika Zaghari | DfM8Y32IQUY | 22 | L | R · "Here's how I made this." | resultado 0–6 · 4 passos 6–20 · CTA | AD | "comment FRAME" | 2,2 | pouca fala, o efeito carrega (4 mil coment.) |
| Calebe | DewmEbNOvlP | 80 | A | CI · "A parte criativa eu prefiro não terceirizar pra ele." | tese 0–7 · personagem (o estagiário) 13–21 · regra 21–30 · caso real 30–62 · visão 62–76 | PE, bastidor | sem CTA | 3,55 | bom conteúdo; sem resultado no gancho, sem CTA (23 coment.) |
| Deborah Folloni | DfICNPPt_gh | 39 | L | R+CI · "Gravei esse vídeo com uma câmera só e usei uma IA pra parecer que tinham 5 câmeras" | gancho 0–6 · "é simples" · passos 8–18 · AD 21–28 · CTA com bônus · "amanhã tem mais" | AD, série | "comenta MANUS" | 3,95 | o vídeo é a prova; promessa de continuidade |
| Giullya Becker | De9lNMuRYmy | 132 | E/V | CI/PR · "…e é por isso que o burro é aplaudido e você não." (entra no meio da frase) | gancho 0–7 · promessa "3 camadas" 7–10 · história-âncora (Clube da Luta) 10–27 · camada 1 27–38 · "só que tem um detalhe" · camada 2 55–61 · "só que…" · camada 3 68–82 · volta ao filme 82–98 · síntese · 3 perguntas para o roteiro do espectador 104–119 · CTA | in medias res, LN, PG, "só que" como ponte | "comenta BLACK… primeira regra da Black Magnética: sempre comente" | 4,1 | excelente: uma história externa costura 3 conceitos; o CTA fecha em círculo com o filme |
| Victor ZK | DcjsyZRSkuA | 139 | E | R · "Vou te ensinar como fazer esse efeito que apliquei no meu último vídeo." | promessa 0–3 · conceito 3–27 · "falta um molho especial" 27–31 · passos 31–71 · "me dá a sua mão… tá quase" · teoria X/Y/Z 74–95 · passos · "dica extra" · desculpa da duração + "salva" | HU, PE, "dica extra" | "salva… curte, comenta e compartilha" | 3,3 | 12 mil curtidas em 139 s: personalidade sustenta; CTA genérico |
| Victor ZK | DdcN3ZfNPgV | 62 | L | CI · "E se eu te falar que eu criei essa animação com apenas um clique? Ou melhor, um prompt." | gancho 0–4 · nome · "vem comigo" · passos · RS para quem anima à mão · "e tem mais" · CTA | VA, microvirada no gancho | "comenta Motion IA" | 3,4 | "ou melhor…" corrige a si mesmo e aumenta a promessa |
| Altra Labs | De9u3-QRJ3_ | 18 | L | R · "O Claude acabou de chegar no nível bizarro. Olha essa edição." | 4 s de fala · 14 s de vitrine muda | resultado | "comente MOTION" | 0,8 | gancho curto + prova muda |
| Sanjar Nai-Chien | DeJ_gTHs-FB | 42 | L | R+C · "Look at this animation. It feels cinematic, right?" | resultado 0–7 · "what if I told you…" 7–13 · objeção "sem After Effects" 13–20 · 3 passos 20–35 · "mude qualquer coisa" | LN, pergunta de concordância | "comment VOX" | 3,25 | 19 mil coment.: pergunta que o espectador responde "sim" sozinho |
| Vaisakh | Dc4Bnn0vCQj | 27 | V | C (qualificação) · "Are you looking for a… ready to move in?" | pergunta 0–4 · objeção (sem atraso) 4–10 · 3 benefícios 10–25 · CTA | lista | "connect us right now" | 3,5 | anúncio clássico: a pergunta filtra quem é o público |
| Shaan Johari | DfMhcgtRnbX | 33 | L | R+CI · "These captions… aren't made in After Effects." | gancho · HU · demonstração 5–27 · RA "this room doesn't actually exist" 28–31 · CTA | RA, HU | "comment CAPTIONS" | 3,1 | 166 coment. |
| Shaan Johari | DfSrDF-Riau | **9** | L | C · "Wait, how are these words going behind my head?" | pergunta 0–3 · resposta 3–9 | — | CTA só na legenda | 3,7 | **16,5 mil coment.**: o mesmo assunto do anterior cortado a gancho + resposta |
| Ignacio Vásconez | DecOTJJuFyQ | 47 | L | D · "Hoy te enseño a crear estas animaciones… para tus clientes" | promessa 0–14 · passos 14–39 · CTA | resultado visual | "comenta ANIMACIÓN" | 3,5 | 33 mil curtidas: promessa de uso comercial + visual forte |
| Ashok Reddy | DePNgrmToh9 | 38 | L | D · "…Vox-style collage animations like this using Claude without animating a single frame" | gancho 0–7 · definição 7–14 · passos · "not only that" · CTA | VA | "comment…" | 3,7 | gancho = resultado + objeção removida |
| Barsolmedia | Dbvg-nZT6XL | 29 | V | CI (sentença) · "If there's no video, your event never happened." | tese 0–4 · dor (meses, milhares gastos) 4–10 · contraste ("3 stories borrados que expiraram ao meio-dia") 10–15 · máxima "o evento é uma noite; o conteúdo vende o próximo" 15–19 · assinatura | sentença, contraste, NE | "We are Barsol Media, and we make sure everyone knows it happened." | 2,2 | modelo direto para 3LM: o fecho repete a tese do gancho |
| Hudson Brendon | DfNpcidka9R | 36 | L | P+PE · "Um cara juntou mais de 230 vídeos… e liberou o prompt de cada um de graça." | gancho 0–6 · nome · tipos · uso · CTA | NE, PE | "comenta MOTION" | 3,6 | padrão "um cara fez X" |
| Andrhé Alves | DfLJHz4i4gS | 33 | V | CI+PG · "E se eu te disser que esse vídeo… foi 100% editado com IA? Você acreditaria? Não, né?" | gancho 0–8 · prova 8–15 · dor ("madrugada") 15–19 · antítese "não precisa saber editar, precisa saber pedir" · oferta · CTA-ultimato | PG, antítese | "…ou continuar editando de madrugada. Você que sabe." | 2,85 | roteiro bom (CTA que devolve a dor); perfil pequeno |
| Jo Mendes | DdrD7WQpYK7 | 36 | L | CI · "Editors are still doing this manually but you don't have to." | gancho 0–9 · promessa · passos | manual × automático | "comment AI" | 3,0 | |
| wintage | DfQNycSzvkm | 23 | E | R+AD · "Looks cinematic, right? Remove those three layers. Feels flat." | AD por subtração 0–4 · contexto · 3 camadas · "and that's it" | AD | "comment file" | 2,95 | gancho por subtração: mostra como fica SEM o truque |
| Sahil Verma | Deq3DdTu9d4 | 58 | E | D · "Agora você também pode fazer essa animação de colagem…" (hindi) | promessa · "3 coisas que você precisa" · fontes | LN | — | 2,5 | |
| Kanishya | DeEoDBASC5R | 59 | En/A | C+CI · "Want to hear something wild? Real bananas… are packed with hard seeds." | fato estranho 0–7 · origem 7–18 · "a very brief history" 18–23 · cap. 1 23–39 · cap. 2 + ameaça 39–48 · "Enter the banana keepers" 48–57 | fato contraintuitivo, linha do tempo, ameaça, entrada de personagem | (legenda) | 3,3 | mini-documentário em 1 min: estranheza → história → ameaça → heróis |
| Reverse/VFX | DfAE8n5ovTR | 14 | V | C (FAQ) · "What's the difference between a home inspection and an appraisal?" | pergunta 0–3 · resposta | — | — | 4,6 | a dúvida frequente do cliente vira gancho |
| Leonardo Boehme | DeuXePGPcQ5 | 45 | L | CI (absurdo) · "Eu sou o primeiro brasileiro a ter o carro voador da Tesla." | absurdo 0–3 · NE 3–11 · "você pode estar se perguntando…" 11–15 · resposta 15–17 · possibilidades · FOMO | objeção antecipada, FOMO | "me manda uma mensagem agora" | 3,0 | 3,9 mil coment. |
| tapewarp | DeXKaEXNm1Y | 41 | L | R · "This Vox style animation, I made it entirely with Claude. But here's the part that actually surprised me." | resultado · VA · passos · pares pergunta-resposta ("Don't like the text? Change it.") · usos · CTA | VA, pares curtos | "comment…" | 3,8 | |
| Gabriel Adamuchi | DfPosIRAut_ | 62 | L | D+R · "Você agora consegue gravar com uma câmera parada e o Claude transforma isso numa produção de cinema." | gancho 0–5 · prova 5–20 · "não para por aí" (luz) 20–32 · "agora vem a parte que mais impressiona" (cenário) 32–44 · contraste "antes era preciso uma equipe" 44–51 · benefício "grava uma vez, sai com dez" · CTA | escalada em 3 degraus, AD, HU ("opa, tá azul demais") | "comenta ADAMUCHI" | 4,1 | modelo de escalada: cada bloco maior que o anterior |
| EarnEdits | Ddn42dGOwnB | 31 | V | P · "Stripe just made the biggest AI deal this year." | notícia 0–3 · NE em série (1,3 bi → 8 bi em 82 dias) 3–21 · tese "não é avaliação, é aposta" · ponte "a IA anda rápido; esta edição também" · CTA | NE, antítese | site | 2,3 | notícia → **uma frase-ponte** → produto |
| EarnEdits | DfPbRFWu-JU | 44 | V | H · "He hijacked a plane, collected $200,000, jumped into a stormy night, and vanished forever." | resumo-gancho 0–8 · fatos com data 8–28 · pista 28–33 · fecho em trinca 33–38 · ponte 38–44 | tricolon, mistério | site | 2,3 | série: mesma fórmula nos 3 |
| EarnEdits | DfZoBRQuHwq | 37 | V | H+CI · "A glacier revealed a death scene older than almost anything humans had ever investigated." | idem | idem | site | 2,4 | idem |
| Emerson e Rebeca | DfTO5--RYWl | 37 | V | sem gancho ("e quando a gente fala em criação de conteúdo…") | institucional corrido | — | "veja como ela trabalha" | 2,7 | **o que não fazer**: sem gancho, sem prova, adjetivo vago ("empresa camaleão") |

### 1.3 `_salvos/profissionais` (11 com fala)
| autor | id | dur | obj | gancho | estrutura | retenção | fecho/CTA | w/s | bom ou fraco porquê |
|---|---|---|---|---|---|---|---|---|---|
| Kagome (Curious Refuge) | DfYEatNhvli | 164 | Em | H (noticiário) · "Uma menina de 5 anos está desaparecida." | notícia 0–50 · cena doméstica feliz 50–111 · polícia à porta 111–125 · revelação 125–158 | RA, dissonância (rotina feliz × notícia), o público sabe mais que o personagem | moldura "worth studying" | 0,15 | a tensão vem do que o público sabe e a cena nega |
| Jon Finger | DfBh7TVMPfo | 19 | A | R · "This guy's responding to my last message" | demo crua | — | — | 2,5 | |
| Justin Odisho | Dem0ANNI62t | 34 | E | D condicional · "If you want to create a vertical sequence in Premiere, just go to…" | passos | — | "Follow for more tips" | 3,1 | tutorial seco |
| Erik Marreiro | DfcXJtdxNz0 | 127 | Em/P | CI (contraste de época) · "Hoje a gente aperta um botão e assiste qualquer filme no celular. Mas teve um tempo…" | presente × passado 13–22 · "Volta comigo!" · a época (roupa, perfume) 23–36 · data + NE (1934, mil lugares) 37–75 · "E aí veio o drama" 76–86 · "décadas de silêncio" · "até o plot twist" 88–107 · rima-manifesto 112–124 | 3 atos nomeados em voz alta, regionalismo ("Rapaz"), NE, convite | grito-assinatura "VIVA CAMPINA!" | 1,46 | **modelo** para Disalp/Natália (história de lugar). Fala lenta com respiros de música |
| Kavan Cardoza | DfXhMzSBY_m | 893 | En | H in medias res (náufragos brigando) | crise → linha do antagonista → … | duas linhas paralelas, cliffhanger | "comente HOOK para o episódio completo" | 0,9 | série: o episódio inteiro é o gancho do próximo |
| Hashem Al-Ghaili | DfcZri3Am0J | 74 | E/En | C · "Your brain has a storage limit. So what happens when it fills up?" | pergunta 0–4 · contraste (supercomputador) 4–19 · 2ª pergunta 19–22 · conta em passos 22–40 · tradução (filmar a vida inteira em HD por 13 anos) 40–48 · virada "mas ele nunca enche" 48–63 · número final (20 W, menos que uma lâmpada) · tese circular | NE traduzido em imagem do dia a dia, fecho circular | "The most powerful computer on earth isn't in a lab. It's in your head." | 3,0 | modelo de explicador: todo número ganha uma comparação concreta |
| Leonardo Ferreira | DbwMxQWJRt3 | 89 | V | P+PE · "Postei um vídeo que já passou de 170 milhões de visualizações." | prova 0–17 · ferramenta · uso 1 22–56 · uso 2 56–82 · CTA | NE | "link na bio" | 3,0 | autoridade pelo próprio número; publi diluída |
| André Nunes | DelBjZ_t7tK | 89 | V | P (tendência) · "Esse é o formato que vai dominar o seu feed em 2027." | tese 0–7 · 4 personas ("se você é chef… personal… corretor… professor") com demonstração 7–53 · MR 53–60 · objeção "não é só abrir o chat" · custo · CTA | lista por público, MR | "comenta EDIT IA ou toque em Saiba Mais" | 3,2 | cada espectador se acha numa persona |
| André Nunes | DfA7GoZTUo7 | 58 | V | Cf · "Eu estou com um pouco de medo de mostrar isso…" | confissão 0–18 · passos 18–43 · "o mais louco" · "provavelmente vou me arrepender" · CTA | segredo relutante, teatralidade | "comenta EDIT IA" | 3,5 | 949 coment. |
| André Nunes | DfWQjPpTDt- | 127 | En/V | CI · "Esse é o PT do Brasil. E esse é o PT do Texas. Não é montagem." | comparação 0–7 · cronologia 7–58 · "Agora, a pergunta: existe mesmo? Não." 58–62 · cadeia de perguntas ("E a estrela?", "Mas e o Talarico?", "E o Eduardo?") 62–116 · pergunta binária 116–120 · MR + CTA | perguntas encadeadas, frases de 2–6 palavras, NE, HU | "Coincidência ou célula? Comenta aí." + "comenta EDIT IA" | 3,1 | 18 mil curtidas: "checagem de meme" com pergunta binária no fim |
| (Leonardo Ferreira / Robert Lucas / Gabriela / outros sem fala) | — | — | — | — | ver §7 | — | — | — | — |

### 1.4 `_perfis/giubeckers` (17 com fala; os 3 virais "Você sabe por quê" já estão no M1)
| id | dur | obj | gancho | estrutura | retenção | fecho/CTA | w/s | bom ou fraco porquê |
|---|---|---|---|---|---|---|---|---|
| Db3TIw4xcRS | 100 | P/En | PR · "Olha isso aqui: fulana finge que é rica… Quer saber a minha opinião?" | resposta a fofoca 0–5 · ficção (algoritmo-assistente) 5–60 · amiga que "parou de alimentar isso" 60–77 · tese 87–94 | DI (voz robótica × ela), bordão repetido ("percepção de valor"), escalada | tese, sem CTA ("Deseja—" corta) | 2,4 | 10,6 mi views |
| DblQzQHRtaP | 79 | E | L · "Três coisas que eu faço antes de gravar pra falar com mais naturalidade, vem cá." | promessa 0–10 · 1 · 2 · bônus · "a última" 41–57 · desmistifica 57–71 · pergunta | LN, BT ("gravo o gancho no fim") | "O que é mais difícil pra você: gravar ou roteiro?" | 4,4 | |
| Dbs_BFpRR-Y | 141 | A/P | PR · "Nova moda do Instagram é fazer conteúdo em massa? Funciona ou é todo mundo bando de louco?" | polêmica 0–5 · contexto · prós 1-2-3 · contras 1-2-3 · autoridade citada (Mosseri) · opinião + exemplo · tese "nem toda onda é pra você" · pergunta | LN (prós × contras), citação | "qual é a sua opinião?" | 3,7 | |
| DcJcoxMRu7z | 59 | L | D+condição · "Como se gravar sozinho em 15 minutos? Sem falar nenhuma palavra." | promessa · empatia (culpa) · objeção dramatizada ("Ai, Giu, mas…") · 3 etapas · objeção 2 + truque (almofada AD) · CTA | objeções na voz do público, AD | "comenta EU QUERO" | 4,2 | |
| DcPNmz_x8tH | 99 | P/A | H+PR · "Abri uma vaga… e percebi uma coisa: as pessoas são preguiçosas." | história 0–20 · "Vai vendo!" · descoberta 20–43 · julgamento · 2º caso · lição dura · pergunta polêmica | prova ("esqueceu de apagar o comando"), "vai vendo" | "Você contrataria…?" | 4,1 | |
| DcjD8-9xV53 | 98 | V (publi Stone) | H · "Desde criança eu tinha certeza: a minha vida ia parecer um filme." | sonho 0–18 · realidade ("cenas deletadas") 18–48 · mentor (amiga confeiteira) 51–60 · produto 60–77 · resolução · CTA | metáfora de filme sustentada, HU, personagem secundário | "Abra sua conta na Stone" | 3,8 | publi com 3 atos: o produto entra como o conselho do mentor |
| DeKDmV6R69N | 72 | V (teaser) | Dl · "Eu tava ficando tão boa em fugir da criação de conteúdo que até pensei em entrar pra CIA." | esquete 0–30 · refrão "Achou que eu tava brincando? / Quando você…, eu estarei lá" ×4 30–55 · data | refrão, paródia | "Guarde essa data" | 3,4 | |
| DePNLckxSha | 39 | V | Dl (quiz) · "Eu tenho 99 posts salvos e não posto?" — "Sim." | sim · sim · sim · **não** · produto | padrão quebrado | "Seja lembrada pra sempre com a Black Magnética" | 2,5 | |
| DeUW7htRxyx · DeuGxOgxc9- · DfCtHB1Rrsl | 68 · 64 · 68 | P | C · "Você sabe por que…?" | M1 | NT, PE, PG | "Ocupe seu lugar." | 4,0 · 4,7 · 4,65 | M1 (14,2 mi) |
| DecE-WsxmJ9 | 80 | V | Ds+PE · "Como fazer uma pessoa travadona gravar? Esse é o Esteve…" | desafio 0–8 · tarefas 1-2-3 · gravação frase a frase · resultado · CTA | personagem real, transformação ao vivo, frase-mantra ("Tudo na vida é treinável") | "comenta EU QUERO" | 4,6 | |
| Deo9FIKRJSG | 84 | E/V | D · "Como fazer fotos da sua namorada que a gente finalmente goste" | 4 fundamentos · "o último e mais importante" · CTA · erro de gravação | LN, UI, BT | "comenta BLACK" | 3,8 | |
| DfPlHBIxV4S | 74 | V | D+condição · "Como se gravar sozinho? Só que sem tripé!" | takes 1-2-3 · "dica pra escritório" 1-2-3 com "o último é o mais difícil" · CTA ao vivo | HU ("técnica milenar chinesa: fita no teto"), UI | "link na bio, é amanhã" | 4,2 | |
| DfQWFoWhxDP | 231 | E/V | P (autoridade) · "Fiz uma análise das 3 publicidades mais famosas do Brasil e descobri 3 estratégias pra você vender mais" | promessa 0–8 · caso 1: o que fez → NT → "como aplicar na sua Black Friday" 8–73 · caso 2 73–121 · caso 3 121–183 · comparação dos 3 183–206 · CTA | trinca caso → NT → aplicação, nostalgia | "comenta PÔNEI… senão a maldição do pônei te acompanha 10 anos" + "qual publicidade marcou a tua infância?" | 3,75 | |
| DfUu5xxte9Q | 54 | V | Dl/oferta · "Ah, eu vou esperar só um pouquinho…" | empilhamento "e tem mais" | infomercial | "comenta BLACK" | 3,5 | oferta pura: 1 mil curtidas |
| DfcgCGiBxCQ | 118 | E/V | CI+prova · "Vou te provar agora por que seu perfil é rejeitado mesmo você sendo excelente." | teste com o espectador ("2 segundos pra escolher") 0–13 · 5 itens · trilha de 3 posts fixados · CTA | AD, LN, "o quinto que quase ninguém faz" | "comenta BLACK… já passou da hora de deixar seu conteúdo à altura do seu conhecimento" | 4,1 | |

### 1.5 `_estilos` (6 com fala) e `_tutoriais` (16 com fala)
| autor | id | dur | obj | gancho | estrutura | retenção | fecho/CTA | w/s | bom ou fraco porquê |
|---|---|---|---|---|---|---|---|---|---|
| Helal | DZLdW-ktytx | 29 | P | CI · "Se ninguém te conhece, ninguém te escolhe." (árabe) | sentença · dor · tese "negócio é atenção" · ordem "apareça" | antítese | "DM edit" | 2,2 | manifesto de serviço |
| Helal | DZPtuwvtwrs | 43 | V | AD (problema da opção comum) · "A porta de madeira comum…" | defeitos da opção comum 0–16 · "qual a melhor opção?" · produto + 4 benefícios + garantia 15 anos 18–35 · slogan | NE, comparação | "Portas que vivem com você" | 1,9 | **anúncio "comum × o nosso"** — direto para MF |
| Helal | DZUqoqUNOqk | 12 | Em | H · "In 2021, Sabrina Carpenter lived it all…" | crise → "her voice" | — | — | 2,5 | arco de 2 frases |
| João Pedro Amorim | DfTIAPVRKX- | 36 | L | P+D · "Isso aqui vai te fazer economizar mais de R$ 1.400 por mês…" | o mesmo roteiro do Juan em **metade do tempo** + MR ("essa voz é um clone") | LN, MR | "comenta REPO" + segue | 4,0 | prova de que dá para cortar 50% |
| eslam sayed | DaHkdemNr5S | 48 | V | H (origem) · "Do coração do Egito…" | origem 0–16 · produto 16–26 · expansão 26–33 · preço riscado 33–42 · marca + telefone | NE | telefone | 2,0 | locução de comercial, sem música |
| Andreia Schneider | DfXLk9dlHgR | 32 | L | CI · "Esse filme de 6 minutos não tem uma única câmera." | gancho · o que é · prova · CTA | — | "link na legenda" | 2,8 | |
| Cauhi Jr | DeoZD--iATa | 87 | L | P · "Esse é o futuro do vídeo com IA. Mais de 700 prompts…" | promessa · uso · "a parte mais louca" · lista de 7 negócios · RS ("marquei QUASE") · CTA | lista por nicho, RS | "comenta VÍDEO" | 3,5 | |
| Naomie Davinci | DehYzuWg3bn | 74 | E/L | promessa · "Um guia para melhorar seus ganchos escritos." | problema · o que escrever (3 ângulos, vago × preciso) · como exibir · ponte | exemplos ruim × bom | "comenta TEXTE" (ficha) | 3,6 | |
| Melika Zaghari | De6W6_hRjEP | 23 | L | promessa · "How to create this cinematic transition effect?" | passos de 2–3 palavras | — | CTA embutido aos 9 s | 2,7 | |
| Igor Henrique | DfcZQtkt599 | 52 | L | D · "Como responder todos os leads esquecidos no seu WhatsApp usando o Claude?" | + objeção removida · passos · VA · segurança ("eu reviso") · CTA | VA | "comenta WHATSAPP" | 3,45 | 91 coment. |
| Igor Henrique | Dfdf1VPtz6i | 54 | L/V | D (dinheiro) · "Você pode vender essa automação para uma clínica odontológica por até 3 mil reais." | gancho 0–4 · cena com relógio ("11h47 da noite… manda um áudio") 4–15 · o agente agindo 15–36 · NE "41 segundos" · "sabe o que é mais interessante?" · bônus · CTA | cena, NE, PE (paciente) | "comenta AGENDA" | 3,35 | **2.791 coment.** contra 91 do anterior (mesmo autor e estrutura): gancho de dinheiro + cena concreta |
| Kairoz Mind | DfSKE9JAIGe | 105 | L | Dl/dor · "Kairo, como o Claude de todo mundo roda o dia inteiro e o meu pede arrego em 10 minutos?" | diálogo aluno × mestre · 5 itens, cada um seguido da reação do aluno ("Então o meu Claude finalmente…") | DI, LN | "canal de transmissão/Telegram" | 3,0 | o leigo traduz o benefício (11 mil curtidas) |
| Gabriel Spricigo | Del82x1DVA1 | 37 | L | P social · "Muita gente está dizendo que ela pode ser a melhor skill já criada." | | | "comenta ANATOMY" | 3,4 | |
| Bruno Moreira | DfZyB-lKUqY | 36 | L | N · "Get B-rolls 2.6 chegou. 61 novidades." | uma frase de 2–5 palavras por novidade | staccato, NE | "comenta B-ROLLS" | 3,0 | changelog narrado como trailer |
| Victor Cardoso | DfdACgbqey_ | 64 | P/L | CI · "Você já reparou como todos estão ficando cada vez mais parecidos?" | observação · problema · causa · "ninguém te ensina" · benefício | contra a corrente | "dá uma olhada na legenda" | 2,5 | posicionamento contra a onda |
| Leonam Alves | DfNpbO7hfPt | 45 | L | D+dor · "Seu limite do Claude acaba no meio do dia? Instala esses 3 plugins." | dor-pergunta · define token · 3 itens com NE | LN, NE | "comenta TOKEN" | 2,8 | |
| Robson Oliveira | DfcYkpTMZyK | 24 | L | P · "Alguém liberou de graça mais de 400 prompts…" | | | "comenta seu emoji favorito" | 3,4 | CTA de atrito mínimo |
| Sky Tan | DexJ-qWiWdY | 56 | E | P · "This is the ultimate storytelling caption for Instagram." | por quê (50% não seguidores) · prova (1.000 coment. → 100 pedidos) · 7 partes | LN, NE | (legenda) | 4,1 | estrutura de **legenda-história** (ver §9) |
| Kallaway | Dfc59rPsETD | 76 | E/L | D · "Here's how to write a hook so good it's basically unskippable." | M2 | exemplo ruim × bom | "comment DESIRE" | 3,85 | |
| Allyson | DfUwzbcR1D5 | 59 | L | CI+NE · "O Claude tem mais de 100 mil skills, mas você só precisa de 5." | M7 | LN | "comenta SKILLS" | 3,2 | |
| Prath | DfMzGyNBdUH | 13 | P | CI (manifesto) · "Anyone can generate an image now. Nobody can generate taste." | M3 | antítese | "Stay irreplaceable." | 2,7 | |

---

## 2. Taxonomia de ganchos (contagem aproximada nos 104; um vídeo pode somar dois tipos)

| # | Tipo | Fórmula | Freq. | Serve para | Exemplos reais |
|---|---|---|---|---|---|
| G1 | **Desejo** | "Como [personagem] [resultado] em [prazo]" ou "Como [resultado] sem [esforço/objeção]" | ≈15 | vender, lead | "Como eu coloquei a minha empresa no top 1 do Google em 5 dias?" |
| G2 | **Demonstração / resultado primeiro** | [mostra o resultado] + "Olha isso" / "Esse vídeo foi feito com…" / "Looks cinematic, right?" | ≈15 | lead, autoridade técnica | "Eu não editei e nem gravei um segundo desse vídeo." |
| G3 | **Novidade** | "Agora [ferramenta/marca] faz [resultado]" / "Acabou de sair…" | ≈14 | lead, notícia | "Agora você consegue dar um número de WhatsApp pro Claude…" |
| G4 | **Prova/número** | "[número específico] + [o que] + [prazo]" | ≈12 | autoridade, lead | "60 vídeos em 3 dias, e eu fiz sozinho." |
| G5 | **Contraintuitivo / sentença** | "[crença comum] — [não é assim]" ou máxima de uma linha | ≈10 | posicionar, autoridade | "If there's no video, your event never happened." |
| G6 | **História / in medias res** | começa no meio da ação ou da frase; ou "[personagem] fez [ato estranho]" | ≈10 | emocionar, entreter, explicar | "Um cara fez engenharia reversa no OpusClip e escreveu isso…" |
| G7 | **Curiosidade / pergunta** | "Você sabe por que [coisa que todos veem]?" / "O que acontece quando…?" | ≈9 | educar, autoridade | "Your brain has a storage limit. So what happens when it fills up?" |
| G8 | **Polêmica / resposta** | "[fofoca/tendência/comentário]. Quer saber a minha opinião?" | ≈4 | posicionar, comentário | "Nova moda é conteúdo em massa? Funciona ou é bando de louco?" |
| G9 | **Inimigo / substituição** | "[caro/grande] cobra X. Aí [pequeno] fez de graça/melhor" | ≈4 | lead, vender | "O Google cobra caro… aí a China soltou um melhor, de graça." |
| G10 | **Diálogo / esquete** | uma fala de personagem em conflito, sem apresentação | ≈3 | entreter, vender (lançamento) | "Kairo, por que o meu pede arrego em 10 minutos?" |
| G11 | **Confissão / segredo relutante** | "Tenho medo de mostrar isso…" / "Ninguém te conta" | 1 de abertura (mas "ninguém te conta" aparece no MEIO de ≈8) | lead | "Estou com um pouco de medo de mostrar isso…" |
| G12 | **Desafio / transformação ao vivo** | "Meu desafio hoje é [transformar personagem] em [tempo]" | 1 | vender curso/serviço | "Esse é o Esteve… meu desafio é fazer esse homem gravar." |
| — | POV | "POV: um(a) ___ em ___" | 0 aqui (está em M4) | educar, entreter | — |

**O que os números dizem**
- Os ganchos com mais comentários combinam **dois tipos**: novidade + superlativo + FOMO (Felipe, 5,1 mil), prova
  + revelação adiada (Pedro Augusto), pergunta + resultado em 9 s (Shaan, 16,5 mil), dinheiro + cena (Igor, 2,8 mil).
- O mesmo autor com a mesma estrutura variou **30×** só trocando o gancho para dinheiro/cena concreta
  (Igor Henrique: 91 → 2.791 coment.). O gancho é a variável mais barata de testar.
- Gancho sem promessa (começar no passo 1, "e quando a gente fala…") é o padrão dos vídeos fracos.

**Reescritos para os clientes** (Natália: sem voto, número ou partido)
| Tipo | Disalp | MF Máquinas | 3LM | Natália de Menudo |
|---|---|---|---|---|
| G1 Desejo | "Como a pizzaria do Seu Zé passou a tirar 30 pizzas a mais da mesma lata em 1 mês" | "Como o Carlos terminou a laje 1 semana antes com uma máquina alugada" | "Como uma formatura de 300 pessoas saiu sem 1 minuto de atraso" | "Como a Rua X deixou de alagar na primeira chuva do ano" |
| G2 Resultado primeiro | (molho caindo em câmera lenta) "Olha a textura. Agora olha a de mercado." | (corte perfeito na peça) "Isso aqui levou 4 segundos." | (pista lotada) "Isso aqui era um galpão vazio às 14h." | (praça reformada cheia de crianças) "Esse lugar era um terreno baldio." |
| G3 Novidade | "Agora a Disalp entrega molho pronto em balde de 3 kg para restaurante" | "Chegou em Recife a serra que corta porcelanato sem lascar" | "Agora a 3LM monta o evento inteiro, do palco ao vídeo do dia seguinte" | "A partir de segunda, o posto do bairro atende até as 20h" |
| G4 Prova/número | "38 toneladas de tomate por dia, e nenhuma lata sai sem prova" | "2.400 máquinas revisadas este ano. Essa aqui voltou nova." | "47 eventos em 2026. Nenhum sem plano B." | "312 pedidos ouvidos no bairro. Este foi o primeiro resolvido." |
| G5 Contraintuitivo | "Molho bom não começa na panela. Começa no pé." | "A ferramenta mais cara é a que quebra no meio da obra." | "Se não tem vídeo, o seu evento não aconteceu." | "O problema da rua não começa na rua." |
| G6 História | "Em 19XX, um caminhão de tomate parou em [cidade] e…" (origem) | "Às 6h da manhã de sexta, a betoneira do Seu João parou…" | "Faltavam 20 minutos para a entrada da noiva quando a luz caiu." | "A Dona Maria esperou 11 anos por esse corrimão." |
| G7 Curiosidade | "Você sabe por que esse molho é mais vermelho?" | "Você sabe por que essa serra custa o dobro?" | "Você sabe por que a pista lota sempre na mesma música?" | "Você sabe por que essa rua alaga e a de trás não?" |
| G8 Polêmica/resposta | "Me perguntaram se molho pronto é pior que o caseiro. Minha resposta:" | "Comprar ou alugar máquina? Vou ser sincero." | "Evento barato sai caro? Depende de uma coisa." | "Disseram que obra no bairro é só em ano de eleição. Olha a data dessa placa." (sem pedir voto) |
| G9 Inimigo | "O molho importado custa o triplo. O nosso nasce a 80 km daqui." | "A loja grande te vende e some. A gente vai até a obra." | — (evitar atacar concorrente de evento) | — (evitar inimigo político) |
| G10 Diálogo | Pizzaiolo: "Chef, por que o molho de vocês não talha?" | Pedreiro: "Ô, essa aí aguenta o dia todo?" | Noiva: "E se chover?" | Moradora: "Vereadora, e o posto?" (tom de conversa, sem campanha) |
| G11 Segredo | "Vou mostrar o que nenhuma fábrica de molho mostra: o descarte." | "O erro que faz a sua furadeira durar metade do tempo." | "O que a gente faz 2 horas antes que ninguém vê." | — |
| G12 Desafio | "Desafio: fazer um molho de restaurante em 15 minutos com 3 ingredientes" | "Desafio: furar concreto armado com a menor broca da loja" | "Desafio: montar uma festa de 100 pessoas em 6 horas" | "Desafio: passar um dia inteiro no posto do bairro" |

---

## 3. Estruturas recorrentes (esqueletos) — comparação com M1–M8 e modelos novos

### 3.1 O que já está coberto (M1–M8) e foi confirmado
- **M1** "Você sabe por quê?" — confirmado (Giullya ×3, 4,0–4,7 w/s).
- **M2** Desejo + método — confirmado (Marina Braz, Igor, Bortolazzi).
- **M3** Manifesto — confirmado (Prath, Helal, Barsol).
- **M7** Lista com progresso — confirmado e é o **esqueleto dominante** do nicho de IA (Juan, Allyson, Ghost Lab,
  Leonam, Kairoz).
- **M8** Abertura documental — confirmado no YouTube (§7).

### 3.2 Modelos novos
**M9. Novidade → mecanismo → ressalva → isca (lead · 30–65 s)** — o esqueleto mais repetido do nicho de IA
(Copfy, Igor Henrique, Gabriel Gouvea, Henrique, Felipe). Difere do M2 porque o gancho é a **novidade**, não o
resultado de um personagem, e tem **ressalva honesta** obrigatória.
1. Gancho N/R (0–5 s): "Agora [X] faz [resultado]" ou o resultado na tela.
2. Nome + uma prova (5–12 s): número, estrelas, ranking, quem criou.
3. Mini-cena ou mecanismo (12–30 s): "Imagina, 2 da manhã…" ou "o problema é… o que ele faz é…".
4. Passos (1-2-3) ou "olha o que entrega" (30–45 s).
5. Virada anunciada (45–52 s): "mas a parte mais interessante / o pulo do gato".
6. Ressalva honesta (52–58 s): "mas pera: isso não faz X / só não exagera".
7. Compartilhar com alvo + CTA de palavra (58–65 s): "Manda pra aquele amigo que [dor]. Comenta [PALAVRA]."
Exemplo MF: "Agora a MF faz a revisão da sua máquina no mesmo dia" → "47 revisões em outubro" → cena
"sexta, 7h, a betoneira para" → 3 passos → "o pulo do gato: a gente leva a reserva" → ressalva "peça importada
demora 5 dias" → "Manda pro mestre de obras que vive com máquina parada. Comenta REVISÃO."

**M10. Ranking com revelação adiada (lead/autoridade · 45–65 s)** — Pedro Augusto (`DfDWbpugC2T`).
1. Gancho P+CI (0–6): "O [mais X] … não é o que você imagina."
2. Contexto de autoridade (6–9): "fui no maior ranking / visitei / medi".
3. Contagem regressiva 4º → 3º → 2º (9–24), cada um com 1 frase e 1 número.
4. Revelação do 1º (24–38).
5. "Mas ninguém te conta" — alerta com número (38–52).
6. Regra prática (52–58) · CTA com material maior que o vídeo ("o top 10 + minha lista").
Exemplo Disalp: "O molho mais pedido pelas pizzarias de Recife não é o que você imagina" → 4º…1º → "o que ninguém
te conta: rendimento por lata muda 30%" → "comenta RENDIMENTO que eu te mando a tabela".

**M11. Cena com relógio (lead/vender serviço · 45–60 s)** — Igor `Dfdf1VPtz6i`, Copfy, Manoel Thiago.
1. Gancho de dinheiro/benefício (0–4): "Você pode [ganhar/economizar] [valor] com isso."
2. Cena com hora exata e personagem-cliente (4–15): "São 11h47 da noite e uma paciente manda um áudio."
3. "Normalmente…" (o que daria errado) (15–20).
4. O sistema/serviço agindo, passo a passo, em tempo real (20–36), com um número de tempo ("41 segundos").
5. "Sabe o que é mais interessante?" — resultado acumulado ("quando ela acorda, 3 pacientes agendadas").
6. Bônus (1 frase) · CTA.
Exemplo 3LM: "Faltavam 20 minutos para a entrada da noiva quando a luz caiu" → normalmente: festa parada → o que a
equipe fez em 4 minutos → "o mais interessante: os convidados nem perceberam" → CTA orçamento.
Exemplo MF: "Sexta, 6h40. A betoneira do Seu João parou com a laje marcada para as 8h." → troca em 50 min.

**M12. História-âncora / caso famoso → princípio → aplicação (educar/autoridade · 90–230 s)** — Giullya
`De9lNMuRYmy` (Clube da Luta) e `DfQWFoWhxDP` (3 comerciais).
1. Gancho CI in medias res (0–7). 2. Promessa numerada ("3 camadas", "3 estratégias").
3. Para cada item: caso conhecido (o que aconteceu) → **nome técnico** → "como você aplica isso em [contexto do
espectador]" com um exemplo de outro nicho. Ponte entre itens: "só que tem um detalhe…".
4. Síntese comparando os itens em 1 frase cada. 5. Perguntas para o espectador aplicar. 6. CTA que retoma a
história-âncora (fecho circular).
Exemplo Disalp (B2B): "Três comerciais de comida que mudaram o Brasil e o que a sua pizzaria aprende com eles."

**M13. Explicador em perguntas encadeadas (educar/entreter · 60–130 s)** — Hashem `DfcZri3Am0J`, André Nunes
`DfWQjPpTDt-`.
1. Pergunta (0–4). 2. Contraste com algo grande (4–19). 3. Números em passos, cada um traduzido numa imagem do dia a
dia ("filmar a vida em HD por 13 anos"). 4. "Agora, a pergunta:" → respostas de 2–6 palavras em cadeia ("E a
estrela?" "Olha a bandeira."). 5. Virada ("mas ele nunca enche"). 6. Tese circular ou **pergunta binária ao
público** ("Coincidência ou célula?").
Exemplo Disalp: "Quanto tomate cabe numa lata de 3 kg?" → números traduzidos ("um caminhão por dia = …") →
"então por que o molho de mercado rende menos?" → resposta.
Exemplo Natália (prestação de contas): "Quanto custa uma rua sem alagamento?" → números traduzidos → "e quem
paga?" → resposta factual. Fecho: pergunta ao bairro, nunca pedido de voto.

**M14. História de lugar em 3 atos (emocionar/posicionar · 60–130 s)** — Erik Marreiro `DfcXJtdxNz0`
(VIVA CAMPINA), Kanishya `DeEoDBASC5R` (banana).
1. Contraste presente × passado (0–20): "Hoje a gente… Mas teve um tempo…" · convite "Volta comigo!".
2. Era de ouro (20–75): detalhes sensoriais (roupa, perfume) + data + número.
3. "E aí veio o drama" (75–88): a queda em 1–2 frases + "décadas de silêncio" (respiro musical).
4. "Até o plot twist" (88–107): o renascimento, com número de quem é beneficiado.
5. Manifesto rimado/sentença (107–120) + **grito-assinatura**.
Ritmo: 1,5 w/s — metade do tempo é imagem e música.
Exemplo Disalp: "Hoje você abre uma lata. Mas teve um tempo em que o molho levava o domingo inteiro…" → a fábrica
→ o desafio → como chegou às pizzarias → "Disalp". Exemplo Natália: a história de uma praça do bairro (sem campanha).

**M15. Anúncio "comum × o nosso" (vender/tráfego pago · 25–45 s)** — Helal `DZPtuwvtwrs` (portas), Barsol
`Dbvg-nZT6XL`, Vaisakh.
1. A opção comum e seus 2–3 defeitos concretos (0–15) — ou a pergunta que qualifica o público.
2. "Qual a melhor opção?" (1 frase).
3. Produto + 3–4 benefícios curtos + 1 número de garantia/prazo (15–35).
4. Slogan/assinatura que repete a tese (35–45).
Exemplo MF: "Disco comum lasca o porcelanato, esquenta e dura uma obra. / Qual a melhor opção? / Disco
diamantado X: corte limpo, não esquenta, dura 4 obras, garantia de 6 meses. / MF Máquinas: ferramenta que
termina a obra." Exemplo 3LM (versão Barsol): "Se não tem vídeo, o seu evento não aconteceu…"

**M16. Publi/esquete em 3 atos com o produto como mentor (vender marca · 60–100 s)** — Giullya Stone
`DcjD8-9xV53`, "Criadores em 2030" `Db3TIw4xcRS`, Kagome.
1. Sonho/expectativa (0–18). 2. Realidade ("as cenas deletadas", o sistema absurdo) com humor e personagens
secundários (18–50). 3. Um mentor (amiga, colega) mostra a saída (50–60). 4. Produto como ferramenta do mentor,
não como herói (60–77). 5. Vida resolvida + tese (77–92). 6. CTA da marca.
Exemplo Disalp: dono de pizzaria que "sonhava com a pizzaria de filme" → a realidade (molho que talha, desperdício)
→ o pizzaiolo veterano mostra o balde Disalp → "sobrou tempo pra parte boa".

**M17. Tese em palavras (texto-motion, sem fala · 7–12 s)** — Milad Aslani `DfWvqYMM7uA` e `DfZivEts0Fz`.
Ver §7. Pergunta-dor palavra por palavra → resposta curta → assinatura.

**M18. Diálogo leigo × especialista (educar/lead · 60–105 s)** — Kairoz `DfSKE9JAIGe`, Giullya (objeções na voz
do público "Ai, Giu, mas…").
1. O leigo faz a pergunta-dor (0–8). 2. O especialista dá o diagnóstico em 1 frase e promete N itens.
3. Para cada item: especialista explica (6–8 s) → **leigo traduz o benefício na língua dele** ("então a minha
betoneira finalmente para de…") → "Exatamente." 4. Leigo: "Tá, e como eu faço?" → CTA.
Exemplo MF: pedreiro × técnico da loja, "5 coisas que fazem a sua furadeira durar o dobro".

**Variante (sem número próprio): Desafio/transformação ao vivo** — Giullya `DecE-WsxmJ9`: personagem real com a
dor → 3 tarefas numeradas → resultado na frente da câmera → frase-mantra repetida → CTA. Serve para 3LM
("montar uma festa em 6 horas") e MF ("o aprendiz que nunca usou uma serra").

---

## 4. Técnicas de retenção e onde ficam na linha do tempo (vídeos de 30–90 s)
| Momento | Técnica | Frase-tipo | Fonte |
|---|---|---|---|
| 0–3 s | promessa com número/prazo; ou resultado na tela | "60 vídeos em 3 dias" | Ciarevit, Marina |
| 0–5 s | **loop aberto** declarado | "e eu vou te explicar o porquê" / "e não é o que você imagina" | Igor, Pedro |
| 0–8 s | objeção removida no próprio gancho | "sem tripé", "sem animar um frame", "sem falar nenhuma palavra" | Giullya, Ashok |
| 3–10 s | pergunta de concordância | "It feels cinematic, right?" / "Você acreditaria? Não, né?" | Sanjar, Andrhé |
| 5–15 s | personagem ou cena concreta (hora, nome, cidade) | "São 11h47 da noite…" | Igor, Copfy |
| ~1/3 | objeção respondida em 2 batidas curtas | "Não tem tempo? Tá, ninguém tem." | Gobatto |
| meio | **lista numerada com progresso** + escalada | "o terceiro é brutal", "o último e mais importante" | Ghost Lab, Giullya |
| meio | contagem regressiva / ranking | "Em quarto… em terceiro…" | Pedro |
| meio | ponte de virada | "só que tem um detalhe", "mas pera", "não para por aí", "e tem mais" | Giullya, Copfy, Adamuchi |
| 60–80% | **virada anunciada** | "a parte mais interessante", "o pulo do gato", "agora vem a parte que mais impressiona" | ≈20 vídeos |
| 70–85% | **ressalva honesta / "ninguém te conta"** | "Só que presta atenção, porque ninguém te conta isso" | Juan, Pedro, Copfy |
| 80–90% | meta-revelação | "Esse vídeo saiu assim", "essa voz é um clone" | Gobatto, João Pedro, André |
| 85–95% | virada para o espectador | "E quantos conteúdos você já gravou com tudo que você sabe?" | Giullya (M1) |
| final | bastidor/erro depois do CTA | "Amor, eu amei. Mas vamos fazer só mais um." | Giullya |
| todo o vídeo | frase-mantra/refrão repetido | "Achou que eu tava brincando?", "Tudo na vida é treinável", "percepção de valor" | Giullya |

Regras observadas:
- **Uma virada anunciada a cada 15–20 s** em vídeos de 60 s ("mas", "só que", "e tem mais"). Sem isso o meio cai.
- **Números traduzidos** ("1 petabyte = filmar a vida em HD por 13 anos") seguram mais que números soltos.
- **Escalada**: cada item maior que o anterior (Adamuchi: ângulo → luz → cenário inteiro).
- **CTA no meio do vídeo derruba** (Jammal, Igor Miranda, Vini): o CTA mora no fim, ou embutido em 2 s na
  legenda/texto (Melika).

## 5. Fechos e CTAs
| Tipo | Frase-modelo | Frequência | O que gera |
|---|---|---|---|
| **Palavra-chave no comentário + "te mando no direct"** | "Comenta [PALAVRA] que eu te mando [material] no direct." | ≈65% | o maior volume de comentários (milhares). Funciona melhor quando o material promete **mais que o vídeo** ("o top 10 + minha lista de segurança", "checklist item por item", "os 4 prompts") |
| Pergunta de opinião | "Qual dessas você cancelaria primeiro?" / "Gravar ou roteiro?" / "Você contrataria…?" | ≈8% | comentário de baixo atrito; melhor ainda **binária** ("Coincidência ou célula?") |
| Compartilhar com alvo | "Manda pra aquele amigo que [dor específica]" / legenda "Envia pra pessoa que sabe muito mas…" | ≈6% | envio por DM (alcance de não seguidores) |
| Frase-assinatura | "Ocupe seu lugar." · "VIVA CAMPINA!" · "Stay irreplaceable." · "We make sure everyone knows it happened." | ≈10% | marca/lembrança; quase sempre repete a tese do gancho |
| Link na bio / site | "Clica no link da bio" | ≈8% | o mais fraco em comentários |
| Data/lançamento | "Guarde essa data", "é amanhã" | 3 | urgência |
| Série | "Amanhã tem mais", "mais um episódio de…", "Eu sou Henrique e aqui…" | 4 | hábito/seguir |

O que mais gera comentário:
1. Palavra curta e **ligada ao assunto** (CORTE, AGENDA, FUTURO), não genérica.
2. Promessa de material **exclusivo e maior** que o vídeo.
3. Atrito mínimo ("comenta seu emoji favorito").
4. Humor no próprio CTA ("se não comentar, a maldição do pônei te acompanha 10 anos"; "primeira regra da Black
   Magnética: sempre comente Black Magnética").
5. Pergunta binária ou de escolha numa lista mostrada no vídeo.
6. CTA-ultimato que devolve a dor ("…ou continuar editando de madrugada. Você que sabe.").
Para **Natália**: só pergunta ao bairro, compartilhar com vizinho e frase-assinatura; nunca voto, número ou partido.

## 6. Narração e locução
**Ritmo (w/s = palavras ÷ duração)**
| Tipo de vídeo | w/s típico | Exemplos |
|---|---|---|
| Lista/dica falada rápida (Giullya, IA "comenta X") | **3,8–4,7** | Giullya 4,0–4,7; Gobatto 4,3; Mateo 4,3 |
| Tutorial/novidade padrão | **3,0–3,6** | mediana do português: 3,43 |
| Demonstração em que a imagem carrega | **0,8–2,2** | Altra 0,8; Bortolazzi 1,7; Melika 2,2 |
| Explicador/notícia com locução de documentário | **2,3–3,3** | EarnEdits 2,3; Hashem 3,0; Kanishya 3,3 |
| Manifesto/anúncio de marca | **1,9–2,7** | Helal 1,9; Barsol 2,2; Prath 2,7 |
| Ficção/história de lugar/emocional | **0,15–1,5** | Erik 1,46; Kagome 0,15 |

> Atenção: a skill hoje estima **2,5 palavras/s**. As referências faladas rodam a **3,3–3,5** (e 4+ nas listas
> rápidas). Para estimar a duração de roteiro falado de Reels, usar **3,3 w/s**; usar 2,5 só para institucional,
> manifesto e vídeo com respiros de imagem; 1,5 para documentário/emocional.

**Tamanho de frase**
- Nos melhores: **3–9 palavras por frase**, uma ideia por frase, frases de 2 palavras como pancada ("Não é
  montagem." "Vira noite." "Ninguém tem."). Gobatto e André Nunes: média abaixo de 6.
- Frases longas (15+ palavras) aparecem nos vídeos fracos (Emerson e Rebeca, Manoel Thiago, Vini Parizotto).
- **Pares pergunta-resposta curtos** são o motor do ritmo: "Don't like the text? Change it." / "Tem mascote?
  O Rubab mexe a boca."

**Tom e voz**
- **1ª pessoa com prova** ("eu fiz", "eu coloquei", "meu Claude acorda") domina o lead: o narrador é personagem.
- **2ª pessoa imperativa** ("abra", "cola", "pede") nos passos.
- **Diálogo** (Kairoz, Giullya) quando há objeções: o leigo dá voz à dúvida do público.
- **Voz off de documentário** (EarnEdits, Hashem, Erik): 3ª pessoa, datas e números, tricolon no fecho ("One man,
  one daring escape, and a mystery…").
- Regionalismo dá verdade ("Rapaz, mil lugares em 1934", "Se embora meu povo", "Caraca!").
- Humor por autocorreção ("um clique… ou melhor, um prompt"; "opa, tá azul demais").

**Silêncio e respiro**
- Nos vídeos de lead quase não há silêncio (fala contínua do 0 ao fim).
- Nos emocionais o silêncio é estrutural: Erik deixa 4–6 s de música depois de "E aí veio o drama" e de "décadas de
  silêncio"; Kagome deixa a cena feliz respirar 20 s antes da revelação.
- Regra: **lead = fala contínua, uma virada a cada 15 s; emoção = 30–50% do tempo sem fala**.

## 7. Narrativa sem fala (9 vídeos)
| id | Como conta | Lição |
|---|---|---|
| Milad `DfWvqYMM7uA` (7 s) | "Why / spend hours / on work / that should take minutes?" → tela preta → "Focus / on what / matters." → "Let Claude / Handle the rest." | **uma palavra por batida**; pergunta-dor → ordem → solução/marca; o vazio (tela preta) é a pausa |
| Milad `DfZivEts0Fz` (9 s) | "Congrats! You built a product." → "But: Competitor's ♡ / Yours ♥" → "? does anyone understand its value / difference / advantage / uniqueness" → "let's show the world why it matters" → assinatura | conquista → conflito → pergunta → solução → marca; a lista que rola (value → uniqueness) faz o papel do "mas" |
| motionnikhil `DfCs7OyCasp` (10 s) | pares de palavra-metáfora: "too many TOOLS → CHAOS", "Time WAITS → RETURNS" | **troca de uma palavra no mesmo lugar** = virada sem fala |
| Paul Trillo `DefHdmSvaqw` (80 s) | menina e gato ao longo dos anos; o tempo passa pela idade dela; cama vazia com o gato esperando; reencontro | passagem de tempo por um **objeto/personagem constante** (o gato); emoção pela ausência |
| Giullya `DeHe0l9R6Of` (39 s, teaser) | pessoas passam por uma vitrine com a camiseta da marca → logo | teaser = o símbolo da marca num mundo real, sem explicação |
| Gabriela `DfVJliVJ3T9` (111 s, aniversário) | editorial → ambiente → detalhes → pessoas → emoção do parabéns | confirma M6; falta gancho nos 3 s e é longo |
| Robert Lucas `DfUcaUrhTK4` (52 s, tênis) | textura → ação → detalhe → atitude → **frase final em texto** ("Eu nasci para ganhar. Eu odeio perder.") | a frase do fim dá sentido a tudo; sem ela é só um clipe |
| Leonardo Ferreira `DfagfrQJRn6` (10 s, esquete) | título fixo "Isso aqui é ostentação!" + corte no gesto (isqueiro) para o quarto do bebê pronto | **título fixo + transformação** num corte só |
| Justin Odisho `DefWg8XoXye` (12 s) | uma frase que o nicho reconhece, estática | identificação pura: o tempo de tela é o tempo de leitura |

Regras de narrativa sem fala:
1. **Tese em 3–7 batidas**: problema/pergunta → "mas" (conflito) → solução → assinatura.
2. **Uma palavra ou expressão por batida**, no ritmo da música; a palavra-chave ganha tamanho, cor ou glitch.
3. A virada é feita por **troca de palavra no mesmo lugar** ou por **tela vazia** (a pausa visual).
4. Um elemento constante (personagem, objeto, cor) carrega a passagem do tempo.
5. Termina numa frase-sentença ou na marca; se a mensagem só está na legenda do post, o vídeo falhou (tênis).

## 8. Narrativa longa (YouTube/documentário)
**Abertura**
- Reter informação: pistas em ordem crescente, planos de 3–5 s, som em camadas, primeira fala poética, a fala que
  confirma entra depois da imagem (Inside the Edit, já em `estudo_youtube.md` §2.2).
- **Gancho por contraste de tom** (James Jani): começar otimista demais ("o mais rico com menos de 30 anos") e
  virar explicitamente ("esta não é uma dessas histórias") com um único elemento seco na tela.
- **História escolhida por um mistério com uma comunidade em volta** ("algo não está certo") — a pergunta do
  vídeo precisa existir antes do título.
- MAESTROS (PT): abrem com **confissão de obsessão + promessa de caso real** ("nas últimas semanas fiquei
  completamente obcecado… hoje quero te mostrar um caso de uso") ou com **analogia** ("se você pudesse escolher três
  livros de toda a história…"). Funciona, mas leva 60–90 s para chegar ao ponto.

**Capítulos e retenção**
- Cenas de 2–3 min: cada micro-história precisa prender sozinha (Mark Johansson).
- **Motivo visual recorrente** que marca cada virada (quebra-cabeça que se monta) = sensação de progresso.
- **Contagem regressiva** ("faltam 10 meses") quando a ordem é não linear: lembra o público para onde tudo vai.
- Não linear = o público refaz a investigação do autor.
- Perguntar **"por quê"** (motivação, sacrifício, medo), não só "o quê".
- Ficção serializada (Chronicles of Bone): duas linhas de ação paralelas + cliffhanger; o curta Kagome mostra que
  **o público saber mais que o personagem** gera tensão sem nenhum efeito.

**Fecho**
- Documentário: fechar **na pessoa** (a vítima, o personagem), não no tema nem no vilão.
- Curta/institucional emocional: manifesto + assinatura gritada (VIVA CAMPINA).
- MAESTROS fecham com CTA de comunidade + "hype, like, inscreva-se" — **genérico, igual em todos**: é o fecho a
  evitar em peça de marca.

## 9. Como criar o ESCOPO de um vídeo (o documento antes do roteiro)
Ordem tirada do que os bons vídeos têm resolvido antes da primeira palavra:
1. **Objetivo único** (vender, lead, educar, autoridade, posicionar, emocionar, entreter) e **ação final**
   (comentar PALAVRA, mandar para alguém, chamar no WhatsApp, lembrar da marca).
2. **Público e a dor/desejo nas palavras dele** ("perde venda porque demora pra responder", "o Claude pede arrego").
3. **Promessa em 1 frase com número/prazo/personagem** (o que a pessoa ganha por assistir). Se não cabe em 1 frase,
   o vídeo não tem foco.
4. **Prova disponível**: o que se pode MOSTRAR (resultado na tela, antes × depois, número datado, cliente real,
   lugar real). Sem prova, troque o assunto ou o formato.
5. **Frase-alma** ("depois de ver, a pessoa deve SENTIR ___ e ACREDITAR que ___").
6. **Tipo de gancho** (G1–G12) + **3 versões escritas** para testar; conferir sem som.
7. **Modelo de estrutura** (M1–M18) e **duração-alvo** — estimar pela velocidade certa: palavras ÷ 3,3 (Reels
   falado), ÷ 2,5 (institucional), ÷ 1,5 (emocional).
8. **Batidas com tempos**, incluindo onde ficam: a virada anunciada (a cada 15–20 s), a ressalva honesta, a virada
   para o espectador.
9. **Fecho**: frase-assinatura do cliente + tipo de CTA (e a PALAVRA) + **material prometido** (o que vai no direct
   e se ele é maior que o vídeo).
10. **Legenda do post** (Sky Tan): apresentação de quem fala → a luta → a virada de crença → prova → mecanismo
    único → o que a pessoa ganha seguindo → CTA de duas portas (material grátis ou conversa direta). Gatilho de
    compartilhamento ("Envia pra…").
11. **Série**: é episódio de uma série? (título fixo, bordão, assinatura, "amanhã tem mais").
12. **Restrições**: o que o cliente não pode dizer (Natália: sem voto/número/partido; crianças só com
    autorização), datas que envelhecem, preço falado ou não.
13. **Formato de produção**: quem fala (1ª pessoa, diálogo, voz off), onde se grava (cenário real que prova),
    planos de prova necessários, texto na tela.

Ficha curta para colar no `intencao.md`:
```
Objetivo:            Ação final (+ PALAVRA):          Material prometido:
Público / dor nas palavras dele:
Promessa (1 frase c/ número, prazo ou personagem):
Prova que vamos MOSTRAR:
Frase-alma: SENTIR ___ / ACREDITAR ___
Gancho tipo G__ · versões: 1)  2)  3)
Modelo M__ · duração alvo __ s · palavras ≈ __ (÷3,3 | ÷2,5 | ÷1,5)
Batidas: gancho __ · tensão __ · itens __ · virada anunciada __ · ressalva __ · virada p/ espectador __ · CTA __
Fecho-assinatura:            Legenda (6 partes + compartilhar):
Série? título fixo/bordão:   Restrições:
```

## 10. Erros e fraquezas observados (evitar)
1. **Começar sem promessa** ("Abra esse site…", "e quando a gente fala em criação de conteúdo…").
2. **CTA no meio** do vídeo (Jammal, Igor Miranda, Vini) — e **fala depois do CTA** (Vini repete tudo).
3. **Lista sem benefício**: 35 nomes em rajada (Dev em dobro).
4. **Tema de baixo desejo com fórmula boa**: a estrutura não salva assunto que o público não quer (Copfy Maps: 42
   curtidas).
5. **Clickbait que o vídeo não sustenta** ("acabou de vez com o Claude") — funciona uma vez, desgasta o perfil.
6. **Adjetivo no lugar de prova** ("empresa camaleão", "ferramenta incrível").
7. **Preço falado e fim arrastado** em oferta (Manoel Thiago, 86 s; Giullya oferta pura, 1 mil curtidas).
8. **Mensagem só na legenda do post** (tênis): o vídeo precisa conter a tese.
9. **Duração inflada**: o mesmo roteiro coube em metade (Juan 72 s → João Pedro 36 s; Shaan 33 s → 9 s com
   100× mais comentários).
10. **CTA genérico** ("curte, comenta e compartilha", "me segue", "hype, like, inscreva-se") no lugar de uma ação
    específica.
11. **Fecho que não volta à tese** do gancho (os bons fecham em círculo: Barsol, Hashem, Giullya, Erik).
12. **Ressalva ausente** em promessa grande: os melhores admitem o limite ("o número é americano", "só não
    exagera") e ganham confiança.

## 11. As 10 descobertas mais valiosas
1. **O gancho é a variável mais barata e mais forte**: mesmo autor, mesma estrutura, 91 → 2.791 comentários ao
   trocar para dinheiro + cena com relógio.
2. **Mais curto vence**: o mesmo conteúdo em 9 s (16,5 mil coment.) contra 33 s (166); 36 s contra 72 s com
   resultado parecido. Cortar até sobrar gancho + resposta + CTA.
3. **A velocidade real das referências é 3,3–3,5 w/s** (4+ nas listas); estimar roteiro de Reels a 2,5 w/s gera
   vídeo longo demais.
4. **"Comenta PALAVRA que eu te mando" é o CTA dominante (≈65%)** e rende mais quando o material prometido é maior
   que o vídeo e a palavra é ligada ao assunto.
5. **Virada anunciada a cada 15–20 s** ("a parte mais interessante", "o pulo do gato", "só que tem um detalhe") é o
   que segura o meio.
6. **Ressalva honesta** ("ninguém te conta…", "mas pera…") aparece nos vídeos de maior autoridade e aumenta a
   confiança.
7. **Cena com hora, nome e lugar** transforma serviço abstrato em história (M11): "São 11h47 da noite…".
8. **O vídeo-prova** (meta-revelação: "esse vídeo foi feito com…", "esse lugar era um terreno baldio") resolve
   gancho e prova ao mesmo tempo.
9. **Fecho circular**: a frase final repete ou responde a tese do gancho, e a assinatura fixa vira marca ("Ocupe
   seu lugar", "VIVA CAMPINA!").
10. **Sem fala, a narrativa é uma tese em 3–7 palavras-batida** (pergunta → mas → solução → marca), com a virada
    feita por troca de palavra no mesmo lugar ou por tela vazia.
