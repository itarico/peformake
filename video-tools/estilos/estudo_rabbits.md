# Estudo — @rabbits (Guilherme Coelho · Rabbits / Rabbit Nation · 438 mil) — 10/11/2026

Pedido do Italo: "referência no audiovisual — aprenda como ele faz os vídeos, roteiro, o que ele tem a ensinar, edição,
exatamente tudo". Regras seguidas: (a) extrair **gramática transferível** (regras com parâmetros), não o assunto (carros);
(b) estudar os **dois lados**: o que ele ENSINA (conteúdo aplicável) e como o vídeo é EDITADO/ROTEIRIZADO.

Base: 45 vídeos em `D:\PEFORMAKE\REFERENCIAS\_perfis\rabbits\Instagram\*\<id>\` (42 do perfil + 3 posts em colaboração:
`DZxjIdCxIno` Autódromo FuelTech, `Dbf0JgqOLBR` FuelTech, `Dbg6dbfNzMz` Anderson Dick). Todas as transcrições e legendas
lidas; `sequencia_densa.jpg` (1 quadro/s) aberta em **19 vídeos sem fala + 12 com fala** (31). Medições extras com FFmpeg
(detecção de cena a 0,18 — o `cortes.csv` original subestima muito: marca "1 plano" em vídeos com dezenas de cortes) e
`onsets.py` em 4 vídeos-chave. Vocabulário: E1–E26 (`catalogo_estilos.md`), G1–G12 (`estudo_narrativas.md`), T1–T30
(`estudo_aslaniedits.md`), M1–M38 (`MODELOS.md`). **Novos aqui: E27–E31, R1–R26, M39–M44.** O estudo do @omarcosvianna
(`estudo_omarcosvianna.md`) continua a numeração (E32+, V1+, M45+) e reaproveita E28/M39, que os dois perfis usam.

---

## 1. Visão geral

| Item | Valor |
|---|---|
| Período | 01/09/2025 (1 vídeo antigo, o maior) e 18/05 → 30/10/2026 |
| Duração | 4–110 s · **média 48,7 s** · mediana ≈ 47 s |
| Formato | 40 verticais 1080×1920; 2 em 720p; **2 horizontais** (`DZ8R72uv1Pn` 1620×1080, `DdZYfpgviBP` 1540×1078) postados assim mesmo |
| Com fala (PT, >30 palavras) | **27 de 45 (60 %)**; 18 só música (alguns com 1 frase de reação) |
| Loudness | todos entre −13,8 e −14,8 LUFS (padrão Instagram); picos até **+3,6 dBTP** (clipando — não copiar) |
| Temas | carros (drift, arrancada, JDM) ≈ 20 · equipamento/review/publi ≈ 12 · venda dos cursos (Lendário, Projeto Filmmaker, Colapso/IA) ≈ 10 · IA ≈ 5 · locadora Rabbit Nation 3 · tutoriais de anúncio Meta 2 |

**O dado mais importante (curtidas):** os 4 maiores são **peças de ofício sem fala** — Tokyo edit `DOERCXTjaRg`
(144 mil), camcorder 1996 `Dbg6dbfNzMz` (96 mil), bastidor × resultado em moldura de filme `DaSz7w0vL52` (48 mil), filme
do Eclipse `DdZYfpgviBP` (18,8 mil). Os talking heads de venda ficam em 0,4–5 mil curtidas, mas são os que mais **comentam**
por causa da palavra-chave: `DcRiirmvUYn` "comenta DRONE" (2.464 com.), `DesE3R_v4o0` "COLAPSO" (2.135), `DZDSeIYPHqi`
link secreto (1.139). **Regra do perfil: o ofício traz alcance; a fala traz comentário/lead.** Ele alterna os dois.

Ritmo medido (cortes reais, limiar 0,18):
| Vídeo | Cortes | Mediana do plano | Observação |
|---|---|---|---|
| `DOERCXTjaRg` Tokyo (90 s) | 103 | 0,58 s | 32 cortes nos primeiros 10 s (3,2/s), depois ≈1/s; música ≈ **144 BPM** (período 0,418 s) |
| `DZxjIdCxIno` aftermovie (61 s) | 97 | 0,38 s | abertura em rajada: **troca a cada 0,167 s (6 fps) por ~9 s**, depois 1,2–1,4 cortes/s |
| `DaNmfvGPuc9` arrancada (110 s) | 63 | 1,29 s | música ≈ 67/134 BPM; cortes acompanham a meia-batida |
| `DZVJ-o0PykG` hyperedit (60 s) | 20 | 0,78 s | poucos cortes: o ritmo vem do **motion** (texto, 3D, câmera), não do corte |

---

## 2. O que ele ENSINA (conteúdo aplicável) → como aplicar na Ellcazo

### 2.1 Captação / direção de câmera
1. **Gravar a transição dentro do take** (`DaSz7w0vL52`): no fim e no começo de cada plano em movimento, o operador
   "chicoteia" a câmera saindo do objeto (whip) e treme de propósito em alta velocidade — "dá para brincar muito com os
   wipes, com os chicotes… olha pro carro e sai". → **Ellcazo:** em toda diária com gimbal (MF na obra, 3LM no salão),
   gravar 1 s de chicote no início e no fim de cada take. Na edição, o corte cai no meio do borrão (T15/R19 abaixo).
2. **Câmera presa no objeto e rig de carro** (`DZGTpU5vjUu`, Tilta Hydra + Nucleus M2): braço com ventosa no carro + follow
   focus motorizado com torque para lente pesada. → MF Máquinas: câmera presa na máquina (ventosa/braço mágico) dá o POV
   do equipamento trabalhando — plano que concorrente não tem.
3. **Lente com caráter** (`Db3v2vWPcpw`, DZO Arcana): ele vende o **look** da lente, não a especificação; mostra o set
   (câmera, tripé, modelo), depois o resultado. → em vídeo de produto, sempre o par "como foi filmado → o que saiu".
4. **Filtros magnéticos** (`Dc6Tsl6PdmW`): o argumento é tempo de set ("antes era assim… [espera de minutos]… agora é
   assim"). → ND variável/magnético nas diárias externas (Disalp entrega, MF obra ao sol) para manter 180° de obturador.
5. **Cobertura de evento multicâmera** (`DaLrqniPfK2`): casamento com **8 câmeras**, incluindo **bodycam no peito dos
   videomakers** e 360; vlog de todo o evento (welcome, festa, making of, drone). → 3LM: 1 bodycam (GoPro no peito) no
   cinegrafista principal + 1 câmera 360 parada na pista = planos "impossíveis" a custo baixo.
6. **Live com linguagem de cinema** (`DbedX9mtrQ6`, FT TV): transmissão de evento com lente de cinema, fisheye e
   enquadramentos "doidos", operadores com gimbal na pista. → 3LM: oferecer transmissão/telão com 1 câmera de cinema
   (lente clara) além da câmera de cobertura.
7. **Fotografia de cardápio** (`Dez525RPVqz`, Kampeki Sushi): fundo escuro texturizado ou papel colorido, **luz lateral
   dura com recorte**, ação no prato (molho escorrendo, fumaça saindo da cloche, mão segurando o taco). → **Disalp**:
   exatamente o padrão para fotografar prato dos clientes de food service usando o insumo Disalp.

### 2.2 Som (o que ele mais insiste)
8. **Ritmo = SFX + música, separados** (`DdHVLxhTzas`): "o que elevou foi a palavra ritmo… separar entre sound effects e
   música". Ele **regravou os SFX à mão** (foley autoral, "só a gente tem") e criou um app que ensina a **ler o BPM e
   remixar** a música para caber no corte. Demonstra com "esse som é de mentira" (carro com som desenhado) × "esse é o
   real". → Ellcazo: no pacote de motion, música recortada no BPM + uma camada de SFX gravados por nós (porta de
   caminhão, caixa de tomate caindo, motor da serra), nunca só biblioteca. Ver `sound_design.md`.
9. **Gravar em 32-bit float** (`DZDSeIYPHqi`): para barulho forte (escape, máquina) não estourar. → MF Máquinas: gravar
   o som da máquina em 32-bit float (Zoom/Lark Max) e usar como SFX "real" do vídeo.
10. **Retorno em tempo real e dois canais** (`Db8i2RGvhIP`): receptor em estéreo — canal E = entrevistado, canal D =
    você; separa na edição. E **dá um fone ao entrevistado** para corrigir postura/enquadramento sem parar a gravação. →
    depoimentos Disalp/3LM: 2 lapelas em canais separados + retorno para dirigir o cliente.
11. **Microfone na mão é legítimo** (`DaDm4BpPrpi`): perto da boca sem soprar → melhor entonação, isola a voz do
    ambiente, o fabricante recomenda; serve para captar SFX. → em evento barulhento (3LM), entrevista com mic de mão é
    escolha técnica, não amadorismo.

### 2.3 Edição / pós
12. **Hyperedit = roteiro + planejamento + montagem + soundmix + cor + motion, tudo junto** (`DZVJ-o0PykG`) — "não é
    simples, não é fácil e não é prático… de nota 7 tá cheio". É o nome dele para o E27 (seção 4). → planejar o motion
    no roteiro (coluna "metáfora/objeto" por frase), não "decorar" depois.
13. **Planilha de produção para IA** (`DZX3gkNP2GE`, `DZTQcC8PHCL`): criou um personagem a partir de uma foto dele
    (traços, relógio, roupa, o próprio carro), fez um filme de ação com **Seedance** e **remixou a música e fez os SFX
    à mão** por cima ("o remix e sound effects foi todo feito manual"). → IA para a imagem, humano no som e no corte.
14. **Real + IA no mesmo plano** (`DYfMe6zvm12`, `Dashs5ZPN3N`): timelapse real (ele montando o carro) e depois a IA
    transforma o carro em robô no mesmo cenário. → peça-gancho para MF (a máquina "ganha vida") — usar com parcimônia.

### 2.4 Negócio, marketing e carreira
15. **Anúncio em parceria com criador** (`DfDWRbKpvH_`): Meta Creator Marketing Hub → busca criador da região → briefing
    pela plataforma → criador posta e envia o **código do anúncio** → Gerenciador: campanha com objetivo/orçamento/público
    → "anúncio em parceria" → cola o código → destino **WhatsApp** (onde fecha). Rótulo "parceria paga". Fazer **antes do
    pico** (Black Friday/Natal). → Disalp/MF: impulsionar o post de um chef/pedreiro que usa o produto, com o perfil do
    criador + o da marca no mesmo anúncio.
16. **Advantage+ com 3 criativos de uma diária** (`DfIf3L4ph1F`): **meia diária = 3 vídeos com funções diferentes**:
    (1) mostra o espaço, (2) a especialista explica o primeiro atendimento, (3) responde **a dúvida que mais chega no
    WhatsApp**. A IA da Meta descobre qual funciona para cada pessoa; **variar formato** (imagem, vídeo, vertical com
    áudio) reduziu o custo de aquisição em 9,1 % (dado da Meta citado); **não mexer na campanha todo dia**; "a IA não
    substitui estratégia nem criativo bom". → é o nosso padrão de diária para tráfego: 3 criativos por função, não 3
    versões do mesmo.
17. **Locadora como segundo negócio** (`Da3ZhZTPp8B`, `DZcgkRzNEka`): nasceu de uma dor do mercado ("a galera tava
    cobrando R$ 164 a diária"), promete preço competitivo + desconto por mais diárias + "equipe que vive de foto e vídeo".
    → o equipamento ocioso da Ellcazo pode virar receita (locação em Recife) com o mesmo argumento.
18. **Lançamento de curso** (`DZ5g3mePTDx`, `DZVJ-o0PykG`, `DadejcpvzZJ`, `Dashs5ZPN3N`): turma única do ano com data
    ("dia 6 de julho"), bônus empilhados (drone, Premiere/DaVinci de iniciação, playlist exclusiva), hotsite, palavra
    FILMAR, "encerra hoje 22h", prova social pedindo comentário de alunos ("volta nesse post"). Black Friday: entrada a
    R$ 50 para "criar a maior comunidade de IA do Brasil" (`DehmXhwv2ax`).
19. **Credibilidade na publi**: "hoje não tem link nenhum aqui… na sinceridade" (`Dc6Tsl6PdmW`); "ninguém me pagou pra
    falar de elétrico" (`Dcr0Lh6ticz`); "um semi pedido de desculpas" à Jaguar (`Dej_Ef7v-5J`) — rever uma crítica em
    público. → Ellcazo/clientes: dizer o que **não** é patrocinado aumenta a confiança no que é.
20. **Posicionamento por causa** (`DcRiirmvUYn`): convoca a comunidade de drone contra uma regra mal feita, concede ("é
    importante ter cadastro") e ataca a **forma**; CTA "comenta DRONE que o bot manda a petição" → 2.464 comentários com
    uma câmera parada e sem legenda. **O CTA certo vale mais que a edição.**
21. **Mentalidade/carreira**: a logo é "o carinha com a câmera" — "no set não importa o mega contrato de 500 pessoas;
    quem resolve é ele" (`DaVddXpPxrq`): **o executor é o herói**; bolinha vermelha = botão REC e fonte de luz. "A gente
    não decide o futuro, decide o que faz diariamente" + **diário do mês em números** (`DaOrK7rN3b7`: "Junho: 186 vídeos,
    13 clientes…"). → Ellcazo pode publicar o "log do mês" (vídeos entregues, clientes, horas de diária).

---

## 3. Roteiro

### 3.1 Ganchos (tipo G + frase real)
| G | Frase / recurso | Vídeo |
|---|---|---|
| G2 resultado | "RESULTADO EM 3·2·1" sobre o bastidor (texto, sem fala) | `DalKeBhPTSx`, `Db3v2vWPcpw`, `DaNmfvGPuc9` |
| G2 resultado | "Muita gente conhece a Rabbits por causa desses filmes aqui." | `DaLrqniPfK2` |
| G2 + G11 | "Eu estou realmente em choque, dá uma olhada nisso aqui." | `DesE3R_v4o0` |
| G3 novidade | "Esse daqui é o Hollyland Lark Max 2 e nesse vídeo eu vou mostrar por que ele é bom." | `DZDSeIYPHqi` |
| G3 novidade | "Sabiam que agora em Porto Alegre tem uma locadora…" | `Da3ZhZTPp8B` |
| G5 sentença | "Esse som aqui é de mentira, tá?" | `DdHVLxhTzas` |
| G5 sentença | "Os caras zeraram o game dos filtros." | `Dc6Tsl6PdmW` |
| G6 história | "Sabe o cara que tu diz assim: eu duvido. E esse cara se transforma." | `DbedX9mtrQ6` |
| G6 + relógio (M11) | "Dezembro está chegando e a agenda da clínica ainda tem horário vago." | `DfIf3L4ph1F` |
| G7 curiosidade | "O que é o HyperEdit?" / texto "O Kampeki contratou um fotógrafo novo. Será que as fotos ficaram boas?" | `DZVJ-o0PykG`, `Dez525RPVqz` |
| G7 binária | "Você quer aprender a filmar ou editar?" | `DadejcpvzZJ` |
| G8 causa | "Comunidade de drone do Brasil precisa se unir, galera." | `DcRiirmvUYn` |
| G8 prova social | prints de comentários "o cara é um drone" antes do take | `DZ-w5fCPwUP` |
| G9 inimigo | "As marcas chinesas estão vindo e destroçando tudo." | `Dcr0Lh6ticz` |
| G11 confissão | "Cara, eu tenho de certa forma que me redimir aqui." / "Essa logo não é uma supremacia do design." | `Dej_Ef7v-5J`, `DaVddXpPxrq` |
| G12 desafio | "REAL VS IA" + "começa em 8…0" | `DYfMe6zvm12` |

Padrões: (1) o gancho é **dito olhando para a câmera, já com o objeto na mão** (mic, filtro, celular); (2) nos vídeos de
ofício o gancho é **só texto + imagem** (contagem, pergunta, comentário); (3) metade dos ganchos falados tem uma
**autodepreciação** ("não é supremacia do design", "dá pra notar que preciso dar um jeito na vida") que baixa a guarda.

### 3.2 Estruturas em batidas (com tempos reais)
**A. Bastidor → contagem → resultado (`DalKeBhPTSx`, 17,7 s)** — vira M39.
0–7 s operador com gimbal + HUD de configurações rastreado no chão (R2) → 7–10 s "RESULTADO EM" + 3·2·1 (R1), a janela
de prévia já aparece → 10–17,7 s resultado em cortes no beat, último plano em macro do carro. Variantes: `Db3v2vWPcpw`
(título do produto 0–4 s → "VIRE O CELULAR" 4–6 → contagem 6–8 → resultado 16:9 girado 8–19); `DaSz7w0vL52` (0–15 s
bastidor e resultado **simultâneos** em moldura de filme R3 → 15–24 resultado cheio → 24–31,8 fecho-pôster de venda R24).

**B. Lançamento de curso (`DadejcpvzZJ`, 61 s, 2,97 w/s)**
0–3 pergunta binária → 3–16 "agora aqui na Rabbits você vai poder aprender…" + nome do produto + "10/10, avançado
máximo" → 16–29 diferencial **repetido 3×** ("cenário e prática. Cenário e prática. Cenário e prática") com troca de
cenário a cada repetição → 29–47 o que tem dentro (hyperedit, filmes reais, "aqui é guerrilha") → 47–55 trunfo
("vlog completo de evento… isso ninguém fez ainda") → 55–61 CTA palavra. Vira M40.

**C. Publi sincera (`Dc6Tsl6PdmW`, 77 s)**
0–3 sentença elogiosa → 3–21 "antes era assim" (demonstra o jeito velho, com **cartão de tempo do Bob Esponja** "A few
moments later / Two hours later / One eternity later" — R14) → 21–33 "agora é assim" (1 gesto) → 33–47 entusiasmo
exagerado ("poderia pedir pra Tilta decorar minha casa" + render de casa) → 47–55 "hoje não tem link nenhum" → piada final.
Vira M41.

**D. Causa (`DcRiirmvUYn`, 100 s, 3,46 w/s, plano único)** — convocação → a regra explicada com número (drone de 50–200 g,
multa) → concessão ("é importante ter regulamentação") → o erro é a forma → cobra quem se omitiu (lojas) → suspeita
("será que é por isso?") → CTA palavra ×2. Vira M42.

**E. Tutorial de negócio com o caso da casa (`DfIf3L4ph1F`, `DfDWRbKpvH_`, ~60 s, 3,3–3,6 w/s)**
0–3 cena com relógio/sazonalidade → 3–10 "por exemplo, aqui…" (exemplo real, câmera no set) → 10–40 passo a passo em
**telas redesenhadas** claras (não print cru) com legenda → 40–50 dado + ressalva ("a IA não substitui estratégia") →
50–60 ordem com prazo ("sobe sua campanha hoje antes do pico"). Vira M43.

**F. Ofício sem fala (Tokyo, Eclipse, aftermovies)** — 0–10 s densidade máxima (3–6 cortes/s ou rajada 6 fps) → corpo
1–1,4 cortes/s no beat com 2–3 respiros (plano de 2–4 s) → clímax (o momento mais barulhento: burnout, largada, fogo) →
fecho em 1 plano lento ou logo de 1 s. Legenda do post faz o papel do roteiro ("Pega esse edit! Uma semana em Tokyo…").

### 3.3 Retenção
- **Repetição tripla** de uma ideia curta com troca de cenário a cada repetição ("cenário e prática" ×3; "Real" ×3).
- **Prova durante a fala**: "Se você não entendeu o que é o HyperEdit, você está dentro de um, nesse exato momento" —
  meta-revelação aos 22 s (≈37 % do vídeo, mais cedo que os 80–90 % do estudo de narrativas).
- **Humor de espera** no meio (cartão de tempo, meme de 0,5–1 s: Majin Boo, Haaland rindo, Brad Pitt de F1 em
  `DanY4EWvchJ`/`DZGTpU5vjUu`) para atravessar a parte "manual".
- **Troca de lugar por frase** nos talking heads (loja de conveniência → carro → estúdio vermelho em `DdHVLxhTzas`;
  posto 7-Eleven → carro → mercado → estúdio em `DZDSeIYPHqi`): o cenário muda a cada 3–6 s.
- **Contagem regressiva visível** (3·2·1, 8…0) como loop aberto de 3–9 s.

### 3.4 Fechos e CTAs
- **Palavra no comentário + robô/direct**: FILMAR, DRONE, COLAPSO, SOUND, SIM, LOCAL, "link de desconto secreto" — em
  ≈ 15 dos 27 falados. Variante de prova: "vou pedir pros alunos comentarem… volta nesse post".
- **"Valeu!"** seco como assinatura (≈ 12 vídeos) — o fecho é 0,5 s, sem despedida longa.
- **Assinatura de marca falada**: "Com estilo, Rabbits." / "Bem-vindos à Rabbit Nation… em Porto Alegre" + endereço
  digitado num campo de busca roxo (`Da3ZhZTPp8B`).
- Fecho-pôster gerado por IA com a data da turma (R24) nos vídeos de ofício que vendem.
- Fecho de opinião: "Opinião aberta aqui pra vocês" / "E olha que eu gosto de carro velho" (volta ao gancho).

### 3.5 Palavras por segundo
Talking head de venda/review: **3,0–3,6 w/s** (mediana ≈ 3,4; `DZ5g3mePTDx` chega a 4,1). Hyperedit com mais motion:
3,5. Narração sobre a imagem do take: 2,0–2,2 (`DaSz7w0vL52`, `DdHVLxhTzas`, `Da3ZhZTPp8B`). Publi com humor: 1,1–2,0
(muito tempo de demonstração sem fala). Frases de 4–10 palavras, muito "tá?", "né?", "beleza?", "olha só" — oralidade
gaúcha mantida (não limpar demais na legenda).

---

## 4. Edição / estilo — o sistema que se repete

### 4.1 Constantes
- **Câmera:** grande-angular perto do rosto (≈ 24–28 mm equivalente, ligeiramente de baixo), na mão ou no gimbal com
  leve flutuação; fundo **sempre desfocado e cheio de luz prática** (letreiro neon "RABBITS", luminária-estrela de LED,
  monitores, prateleiras de equipamento). Nos carros: gimbal a 20–50 cm do chão, fisheye no POV, drone FPV.
- **Cor:** estúdio em **vermelho/laranja + azul/magenta** (luz de cor no fundo, pele neutra); externas em **verde-cinza
  frio dessaturado** (dia nublado) ou **teal-laranja** ao entardecer; pretos densos, contraste alto, sem grão pesado.
- **Tipografia:** não há uma só — há **4 sistemas por tipo de vídeo** (R6, R12, R13, R15 abaixo). O que se repete:
  **glow/bloom** no texto de destaque, cor de destaque amarela (#FFE600) ou da marca, palavra-chave sempre maior que a
  frase de apoio (2 vozes, como T5).
- **Transição:** corte seco no beat + chicote gravado na câmera (R19); flash monocromático de 2–4 quadros (R20); quase
  nunca transição de software "pronta".
- **Som:** música com voz (phonk/trap/eletrônica, 130–145 BPM nos edits; épico/meia batida nos aftermovies), SFX de
  foley próprio, áudio direto do motor em primeiro plano nos clímax.
- **Logo:** quase nunca há vinheta; a marca é o set (letreiro no fundo), a placa "RABBITS" no carro e o mascote coelho.

### 4.2 Variações (famílias)
| Código | Nome | Vídeos | Gramática curta |
|---|---|---|---|
| **E27 (novo)** | **Hyperedit — talking head composto em 3D** | `DZVJ-o0PykG`, `DdHVLxhTzas`, `Da3ZhZTPp8B`, `DadejcpvzZJ`, `DanY4EWvchJ`, `DfDWRbKpvH_` | apresentador em set neon; palavras **rastreadas no espaço** (paredes, chão, fachada) em 3 famílias tipográficas com glow; 1 metáfora física/3D por ideia (liquidificador, clones, timeline 3D, cards de comentário flutuando); troca de cenário por frase; ≈ 0,8 s de mediana entre eventos, mas poucos cortes — o motion faz o ritmo. É E1 levado ao 3D + E16 + E17 |
| **E28 (novo)** | **Bastidor → contagem → resultado** | `DalKeBhPTSx`, `Db3v2vWPcpw`, `DaNmfvGPuc9`, `DaSz7w0vL52`, `Dez525RPVqz`, `DYfMe6zvm12` (e 6 do Vianna) | 1º terço = como foi filmado (celular, plano aberto do set, HUD de configurações); "RESULTADO EM 3·2·1" a 1 s por número; corte seco no resultado no downbeat; resultado com cor e música cheias. 15–35 s. Primo do E8, mas o "antes" é o **processo**, não a imagem crua |
| **E29 (novo)** | **Edit de rolê no beat (colagem + flashes)** | `DOERCXTjaRg` (144 mil), `DZa3rM7NcA1` | POV fisheye andando, carros e cidade à noite; **cards de vídeo flutuando sobre preto** (2–3 ao mesmo tempo, 55–70 % da largura); flashes duotone laranja/verde de 2–4 quadros; reações em P&B com balão amarelo de fala (R21); 1–3 cortes/s em ≈ 144 BPM; legenda de 1 palavra vermelha no centro (`DZa3rM7NcA1`) |
| **E30 (novo)** | **Fita de camcorder (anos 90)** | `Dbg6dbfNzMz` (96 mil, collab) | quadro 4:3 centrado no 9:16 com barras pretas; cor lavada, flash de câmera na cara, zoom digital, entrevistas "que câmera é essa, meu?"; legenda caps pequena amarela em sans fina; premissa "imagina se em 1996 fosse assim" |
| **E31 (novo)** | **Aftermovie de energia** | `DaNmfvGPuc9`, `DZxjIdCxIno`, `Dbf0JgqOLBR` | abertura em **rajada 6 fps** (R23) ou "RESULTADO EM"; fisheye no chão, speed ramp, bandeiras e abraços; 1–1,4 cortes/s; clímax noturno (fogo, fumaça); fecho em logo branco sobre preto 1–2 s (`Dbf0JgqOLBR`: produto → ação macro → logo) |
| E19 | Curta cinematográfico | `DZ8R72uv1Pn`, `DdZYfpgviBP`, `DalKeBhPTSx` (parte final), `Db3v2vWPcpw` | horizontal ou letterbox; título de marca pintado (pincel vermelho "AKUMA" com kanji); travelling a 20–50 cm do chão, mão no volante, macro de farol |
| E24 | Quebra de realidade | `DYfMe6zvm12`, `DZTQcC8PHCL`, `DZX3gkNP2GE` | real → IA no mesmo cenário; planilha de produção exposta (R17) |
| E15 (variação clara) | Demo narrada em UI | `DfIf3L4ph1F`, `DfDWRbKpvH_` | telas redesenhadas **claras** (creme/branco, azul Meta), cards em perspectiva, legenda branca centrada + títulos condensados brancos com glow em perspectiva no talking head |
| E21 | Tela filmada / bastidor cru | `DesE3R_v4o0` (2.135 com.), `DZTQcC8PHCL`, `DaOrK7rN3b7` | celular na mão filmando o monitor, frase fixa no topo "Quer aprender? Comenta COLAPSO", legenda branca 2 linhas |
| E22 | Nativo de feed | `DcRiirmvUYn`, `Db8i2RGvhIP`, `DZ-OkMCPQWA` | 1 plano, sem legenda (ou mínima), câmera parada; serve para causa e bastidor |
| E8 | Antes e depois (som) | `DdHVLxhTzas` | "esse é de mentira" × "esse é o real" com o mesmo plano |

### 4.3 Técnicas novas (R) com parâmetros
**R1. Contagem "RESULTADO EM 3·2·1".** Texto "RESULTADO EM" em sans black caps branca, ≈ 6 % da altura, centrado no
terço superior (y ≈ 22–25 %); número logo abaixo, 2× maior, que troca **a cada 1,0 s** (24 quadros) com pop de escala
115 → 100 % em 3 quadros (às vezes em 3D vermelho com contorno, ou serifado). O bastidor **continua rodando** por baixo
com som ambiente; no "1" a música entra e o corte para o resultado cai **no downbeat**. Total de 3 s; variante "começa
em 8…0" (9 s) para timelapse. = T10 (troca no mesmo lugar) aplicada a um loop aberto.

**R2. HUD de configurações rastreado no chão.** Card com borda neon roxa (#7B4DFF, 4 px) e **cantos chanfrados**,
fundo preto 40 %, linhas em mono branca: CÂMERA / LENTE / GIMBAL / ISO / ABERTURA / VEL; preso por tracking ao chão
(paralelepípedo) na frente do operador; entra em 6–8 quadros com scramble (T8). Depois o card se transforma numa
**janela de prévia** (picture-in-picture com o resultado), também rastreada, na mesma borda. Dura 4–7 s.

**R3. Moldura de negativo empilhada.** Fundo preto; dois quadros 4:3 com borda de filme (texto "KODAK 400TX", "PROJECT
FILMMAKER", números de quadro) um sobre o outro: em cima o operador filmando, embaixo o plano que a câmera dele está
gerando, **no mesmo instante**. 12–15 s; depois o resultado ocupa a tela. (48 mil curtidas — a melhor forma de mostrar
captação.)

**R4. "Vire o celular".** Texto de 2 s ("VIRE O CELULAR") e o resultado 16:9 entra **girado 90°**, preenchendo o 9:16
sem barras. Permite postar o filme horizontal em tela cheia.

**R5. Gancho de comentários.** Prints de comentários reais (YouTube, tema escuro) entram empilhando sobre preto, 1 a cada
≈ 0,7 s, com leve inclinação; 3–4 s; depois corta para o take comentado. A legenda do post completa ("Tudo pelo take").

**R6. Tipografia rastreada no espaço (E27).** Cada palavra é ancorada numa superfície do set com perspectiva (plano 3D
seguindo a câmera). Três vozes: serif itálica fina (apoio, "é o *estilo*"), condensada black caps (conceito, "MONTAGEM",
"UM ZILHÃO DE EMPRESAS" em vermelho), sans bold amarela com glow (pico, "HYPER", "agora"). Glow/bloom 20–40 px na palavra
pico. Entrada palavra a palavra em 2–4 quadros; saída por opacidade. A palavra fica **ao lado** do rosto, nunca sobre ele.

**R7. Metáfora física com lista que empilha.** Objeto real no quadro (liquidificador) e, a cada batida (~0,6 s), uma
palavra empilha acima dele (ROTEIRO → PLANEJAMENTO → MONTAGEM → SOUNDMIX → COR), em condensada amarela; clímax: o objeto
"funciona" (o copo enche de laranja) quando ele diz "tudo junto aqui".

**R8. Multidão de clones em branco infinito.** O apresentador gravado em fundo branco e duplicado 15–25× (com mascotes),
câmera de cima; números vermelhos "7" sobre as cabeças da multidão e "10" dourado sobre o dele ("de nota 7 está cheio").
3–5 s. Contraste branco total depois de 40 s de set escuro = respiro visual.

**R9. Voo pela timeline 3D.** Os clipes da timeline viram blocos 3D coloridos (as cores das trilhas) e a câmera atravessa
o túnel em 2–3 s, com motion blur; usado na frase "esse mesmo [vídeo] vai ser a timeline que a gente vai ensinar".

**R10. Cards de comentário 3D no set.** Comentários do Instagram como cartões de vidro (T13) flutuando no espaço em volta
do apresentador, em profundidades diferentes, enquanto ele diz "a galera sempre comenta…". Prova social sem cortar para
print.

**R11. Fundo de desenho técnico para produto.** Fundo branco com a **vista explodida** do produto em linha cinza; por cima,
um card com foto real do detalhe e **seta manuscrita** com o nome ("LARK MAX 2", "proteção de microfone"). 1–2 s por
recurso, alternando com o rosto.

**R12. Legenda serif laranja de filme.** 1–3 palavras por vez, serif bold (Georgia/Tiempos) laranja (#F2A23A), sem
contorno, a ≈ 72 % da altura, troca por grupo de palavras; título do produto em condensada laranja **rastreado na
fachada** do lugar (R26). Look de "anúncio-filme".

**R13. Palavra-pico amarela com glow.** Legenda corrida pequena amarela (≈ 2 % da altura, caps) e só 1–2 palavras por
vídeo explodem em condensada amarela (#FFE600, 12–15 % da largura, glow 30 px): "EU DUVIDO", "MAGNITUDE". Reação de
terceiro em vermelho (#E53935) "MANO / CÉU".

**R14. Cartão de tempo de desenho + meme.** "A few moments later / Two hours later / One eternity later" (fundos coloridos
estampados, letra de desenho animado), 1 s cada, para pular a parte lenta da demonstração; memes de reação de ≤ 1 s
(2–3 por vídeo). Humor como corte de tempo.

**R15. Legenda bilíngue.** Inglês pequeno, branco, fixo a ≈ 78 % da altura; português cinético grande acima (caps branca
com glow, palavra-chave azul). Duas audiências no mesmo post (as marcas patrocinadoras são estrangeiras).

**R16. Diário do mês.** Plano fixo de 16 s dele trabalhando de costas no set; no centro, lista em mono branca pequena
("Junho: 186 vídeos (secreta) / 13 clientes (+1) / …"); ele vira e sorri no meio. Música; zero corte.

**R17. Planilha de produção IA.** Tela dividida em 3 faixas fixas: topo = ficha branca com título display ("COLAPSO") e o
produto; meio = janela 16:9 com o filme de IA rodando; base = character sheet (personagem de frente/lado/costas,
acessórios, tênis). O processo fica exposto o vídeo inteiro (E20).

**R18. REAL vs IA com contagem.** Título 3D "REAL VS IA" (amarelo/vermelho com fogo) → "REAL — começa em 8…0" sobre
timelapse real → "IA" e o impossível acontece no mesmo enquadramento (E24).

**R19. Chicote e tremida gravados.** Na captação: girar a câmera 90–180° em ≈ 0,3 s saindo do assunto no fim do take e
entrando no começo do próximo; tremer de propósito nos planos de velocidade. Na edição: cortar no quadro de maior borrão
(como T15/T18, mas físico).

**R20. Flash duotone no beat + colagem flutuante.** Entre cortes, 2–4 quadros do plano seguinte tingido de laranja
(#FF8A00) ou verde; e em trechos de 2–4 s, 2–3 vídeos em cards (55–70 % da largura) sobre preto, deslocados, cada um
entrando numa batida.

**R21. Reação P&B com balão.** Plano de reação (grande-angular, dentro do carro) dessaturado; a fala aparece em caixa
sans bold amarela/vermelha ao lado da boca ("Que suave aí?", "MEU DEUS!"), 1–1,5 s; volta a cor no plano seguinte.

**R22. Camcorder 1996.** 4:3 (≈ 1080×810) centrado com barras pretas; saturação −30 %, contraste baixo, nitidez digital
alta; flash/luz de câmera na cara; legenda caps sans fina amarela (#E6E600, ≈ 1,5 % da altura) no canto inferior esquerdo
da imagem; som de câmera/ambiente cru.

**R23. Abertura em rajada.** Primeiros 8–10 s com troca a cada **4 quadros a 24 fps (6 fps)**: fotos e planos do evento
inteiro como um flipbook; depois cai para 1–1,4 cortes/s. Medido em `DZxjIdCxIno` (45 cortes em 10 s).

**R24. Fecho-pôster de venda gerado por IA.** Últimos 7–8 s: cartaz-cenário (cidade cyberpunk à noite, outdoor com os
nomes dos produtos em neon laranja/roxo, mascote coelho, raio) + pílula rosa "ÚNICA TURMA DO ANO DIA 6 DE JULHO". O
vídeo de ofício vira anúncio sem mudar de "mundo".

**R25. Dupla alternando por frase.** Dois apresentadores no mesmo enquadramento/cor alternam frase a frase (Gui ↔ Paula);
legenda branca pequena com glow e uma palavra colorida por frase (azul, rosa); números "1º", "1 2 3" desenhados no ar.

**R26. Título do produto na fachada.** Nome do produto escrito em condensada laranja no topo da fachada do lugar real
(camera tracking), como se fosse o letreiro do prédio, nos 3 primeiros segundos.

Técnicas existentes que ele usa: T5 (2–3 vozes de legenda), T8 (scramble no HUD), T13 (cards de vidro), T15 (estalo de
câmera), T26 (antes/depois), T29 (monitor filmado em `DesE3R_v4o0`).

### 4.4 O que NÃO copiar
- Picos acima de 0 dBTP (vários vídeos clipam em +0,5 a +3,6 dBTP).
- Palavrão e piada interna que só funcionam para a base dele.
- Venda em quase todo vídeo falado: para clientes nossos, no máximo 1 CTA de venda a cada 3 posts.
- Talking head de 80–100 s sem nenhuma imagem de apoio (`DaVddXpPxrq` 614 curtidas): funciona só com causa forte.

---

## 5. Para os nossos clientes (ideias concretas)

1. **Disalp — "Será que as fotos ficaram boas?" (E28 + M39, 20–25 s).** Bastidor de 6–8 s: o fotógrafo da Ellcazo numa
   pizzaria/restaurante cliente montando o prato com o molho/insumo Disalp, texto no topo "A [restaurante] trocou o
   fornecedor de molho. Será que o prato ficou bom?" → "RESULTADO EM 3·2·1" → 10–12 fotos/planos de cardápio a ~1 s
   cada, padrão Kampeki (fundo escuro, luz lateral dura, molho escorrendo, vapor). Fecho: "Disalp no prato de quem você
   já come." CTA de comentário "TABELA". Serve de conteúdo **para o cliente da Disalp** também (co-post).
2. **MF Máquinas — "Bastidor com HUD" (E28 + R2 + R19, 15–20 s).** Operador com a serra/martelete na obra; card de
   configurações rastreado no chão (POTÊNCIA / RPM / DISCO / PESO / TENSÃO / PREÇO DA DIÁRIA); contagem; resultado em
   slow + som real gravado em 32-bit float (o grito do disco no concreto). Câmera presa na máquina em 1 plano (POV).
3. **3LM — aftermovie com rajada + camcorder (E31 + E30).** Abertura 8 s em rajada 6 fps com fotos da festa inteira →
   aftermovie de 40 s no beat com bodycam no peito do cinegrafista e 1 câmera 360 na pista. Variante para viralizar:
   "Imagina se a formatura de 1996 fosse assim" — a mesma festa tratada como fita de camcorder (4:3, cor lavada, flash na
   cara, entrevistas "que câmera é essa?"). É a fórmula de 96 mil curtidas.
4. **Natália — "Diário do mês" (R16 + M44, 15–20 s).** Plano fixo dela trabalhando no gabinete ou na rua; lista em mono:
   "Outubro: 46 visitas a bairros / 112 pedidos registrados / 9 ruas com reparo pedido / 3 reuniões com a secretaria…";
   ela olha para a câmera no meio. Sem número de urna, partido ou pedido de voto; CTA só "qual rua a gente visita em
   novembro?".
5. **Ellcazo (marca própria) — "Quem resolve é o carinha com a câmera" (E27, 45–60 s).** Hyperedit do Italo explicando o
   que é a Ellcazo: palavras rastreadas no set, metáfora do liquidificador com ROTEIRO / CAPTAÇÃO / MONTAGEM / SOM / COR /
   TRÁFEGO, clones "nota 7 × nota 10", voo pela timeline. E, separado, a série "3 criativos de uma diária" (M43) mostrando
   como uma meia diária de cliente vira 3 anúncios com funções diferentes.

---

## Anexo — modelos novos (M39–M44) para copiar no `MODELOS.md` quando o Italo aprovar
- **M39 Bastidor → contagem → resultado** (15–35 s; fontes: @rabbits `DalKeBhPTSx`/`DaSz7w0vL52`, @omarcosvianna
  `Dbtq3SgPlvF` 10,8 mil): 1/3 processo (como foi feito, de preferência no celular, com configurações ou pergunta no topo)
  → "Resultado em 3·2·1" (1 s por número, som ambiente) → resultado cheio no downbeat → fecho de 1 plano ou cartaz com CTA.
- **M40 Abertura de turma/lançamento** (45–60 s): pergunta binária → o que é + nota máxima → diferencial dito 3× com troca
  de cenário → o que tem dentro → trunfo "isso ninguém fez" → data única → palavra no comentário.
- **M41 Publi sincera** (45–75 s): elogio-sentença → "antes era assim" (demonstração lenta com humor de espera) → "agora
  é assim" (1 gesto) → entusiasmo exagerado → "hoje não tem link / ninguém me pagou pra isso" → piada final.
- **M42 Causa da comunidade** (60–100 s, pode ser plano único): convocação → regra/dor com número → concessão → o erro da
  forma → quem se omitiu → pergunta-suspeita → palavra no comentário para receber o documento (petição, abaixo-assinado).
- **M43 Tutorial de negócio com o caso da casa** (50–60 s): relógio/sazonalidade → "por exemplo, aqui na [empresa]" →
  passo a passo em telas redesenhadas → 1 dado + 1 ressalva → ordem com prazo.
- **M44 Diário do mês em números** (12–20 s, sem fala): plano fixo de trabalho + lista mono de 5–7 números do mês + 1
  olhar para a câmera; legenda do post com a frase de mentalidade.
