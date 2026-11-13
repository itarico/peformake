# Estudo: "PDF inteligente" (a página vira tarefa já preenchida)

Pedido do Italo, 13/11/2026: na Apresentação de um documento do agente (`/documento/:assetId`), ao marcar uma página como tarefa,
o sistema tem que **reconhecer o que está na página** e preencher sozinho o roteiro (audiovisual) ou o briefing da peça (design/social).
Só estudo: nada foi alterado no código, no banco nem nos documentos.

---

## 1. Como está hoje

- A Apresentação (`src/features/strategy/DocPresentation.tsx`) abre o `.html` que o agente sobe junto do PDF. Cada página é um
  `<section class="pg ...">`. Dela o sistema só lê **o título** (primeiro `h1`/`h2`), para mostrar no rodapé.
- "Virar tarefa" abre um pop-up com: título (já com o título da página), área (chip) e pessoa (foto). Grava com
  `agent_doc_page_task(_asset, _page, _area, _title, _assignee, _brief)`; a tela manda `_brief = null`.
- A função (migração `20261117200000_doc_apresentacao_revisao.sql`) cria **só o título** e uma descrição
  "Veio da página N do documento X":
  - Social → `social_tasks` (título + descrição).
  - Design → `content_items` (título + `briefing` com aquela frase), no plano do **mês atual**, tipo sempre `post`.
  - Audiovisual → `av_projects` (título + `briefing` com aquela frase), status `script`, mês atual, roteiro vazio.
  - Tráfego/Atendimento → `traffic_tasks`.
  - Avisa a pessoa escolhida (ou a equipe do cliente) e grava a página como `tarefa` em `agent_doc_reviews`.
- Problemas que aparecem já hoje:
  1. Todo o conteúdo rico da página (3 ideias, roteiro de apoio, copy, legenda, referência, data) **fica para trás**: alguém teria que copiar à mão.
  2. No documento de Social media a área padrão é **Social** (vira `social_tasks`), mas as páginas de postagem são **peças de design** (`content_items`).
  3. A peça cai no plano do **mês de hoje**, mesmo quando a data da postagem é em dezembro.
  4. Não há proteção contra duplicar: a mesma postagem pode virar tarefa de novo pelo documento de Estratégia ou por uma versão nova do PDF (o `asset_id` muda).
  5. O tipo de aviso `agent_doc_task` não aparece em nenhum lugar do front (Bete/prioridade dos avisos): entra como aviso comum.

## 2. Onde cada coisa deve cair

### O que as páginas já têm (exemplo real: Fornario, nov–dez)

- **Audiovisual**: uma página por vídeo (`section.pg.vpg`): código (F1), selo "Diária 24/11 · Prova · Reel", título, direção,
  quem fala, quem grava, a referência (link + miniatura + rótulo), "no Fornario fica assim", e **3 ideias** (nome, direção e
  roteiro de apoio em 3 linhas). Na Peformake o selo traz o uso: "Orgânico + remarketing".
- **Social media**: uma página por postagem (`section.pg.post`): data, formato ("Carrossel · 5 telas"), objetivo, ligação com a
  estratégia, referência (link + miniatura), copy da arte (título, apoio e as telas do carrossel), direção de arte,
  "da referência, pegamos", legenda pronta e hashtags.

### Tabelas reais (lidas no Supabase, só leitura)

- `av_projects`: `title`, `briefing` (8.000), `script` (20.000), `format` (200), `reference_links` (lista), `month`, `shoot_at`,
  `shoot_notes`, `videomaker_id`, `scriptwriter_id`, `video_count`, `status` (`script`…), `script_status` (`rascunho`…). **Não tem campo para "uso" (orgânico/anúncio) nem para "quem fala".**
- `client_scripts` (banco de Roteiros, tela `ScriptsPage`): `title`, `body`, `source` (`agente` existe), `status` (`rascunho`),
  `av_project_id`. Na página do projeto eles já aparecem como "roteiro(s) pronto(s)" com o botão **Usar este**.
- Modo gravação (`RecordingPage`): **não lê `av_projects.script`**. Ele monta os vídeos da estratégia do mês
  (`monthly_strategies.doc` + `monthly_strategy_actions`, cenas em `monthly_av_takes`). Um projeto criado pelo documento abre
  `/gravacao/projeto/:id`, mas não acha o vídeo dele (procura `action.routed_id`).
- `content_items`: `title`, `headline`, `subtitle`, `cta` (200), `briefing`, `caption` (4.000), `observations`,
  `carousel_slides` (lista de `{text}`), `reference_links`, `publish_date`, `deadline`, `kind` (`post`, `carrossel`, `story`,
  `reels`, `anuncio`), `spec.purpose` (`postagem`/`criativo`), `designer_id`.
- `social_tasks`: só `title`, `description` (4.000), `due_date`, `network`, `assignee_id`, `ref_table`/`ref_id`.

### Campo do documento → campo do sistema

**Vídeo (página do audiovisual) → `av_projects` + `client_scripts`**

| Do documento | Vai para |
|---|---|
| código + título ("F1 · A sua pizza começou anteontem") | `av_projects.title` |
| direção, "a referência → no cliente", quem fala, o que filmar | `av_projects.briefing` (em tópicos curtos) |
| ideia escolhida (nome + direção + roteiro de apoio) | `av_projects.script`, em tópicos: `Ideia A · A história da massa` / `• fala 1` / `• fala 2`… |
| as 3 ideias | 3 linhas em `client_scripts` (`source='agente'`, `status='rascunho'`, `av_project_id` = o projeto): trocar de ideia é 1 toque em "Usar este" |
| link da referência | `av_projects.reference_links` (a tela já mostra o vídeo pelo link; a miniatura em base64 não precisa ir) |
| formato + uso ("Reel · orgânico + anúncio") | `av_projects.format` (texto; sem coluna nova por enquanto) |
| dia da diária (24/11) | `month` do vídeo; o dia vai em `shoot_notes` ("Diária sugerida: 24/11") e a prévia oferece **Agendar 24/11** (ver pergunta 2) |
| quem grava | `videomaker_id` quando o nome bate com alguém da equipe; senão a prévia mostra as fotos para escolher |

**Peça (página de postagem) → `content_items`**

| Do documento | Vai para |
|---|---|
| título da postagem (header da página) | `title` |
| copy da arte: título / apoio | `headline` / `subtitle` |
| telas do carrossel (lista) | `carousel_slides` |
| chamada ("Reserve pelo WhatsApp") | `cta` |
| legenda + hashtags | `caption` |
| formato ("Carrossel · 5 telas", "Post", "Reels (capa)", "Post + anúncio") | `kind` (`carrossel`/`post`/`reels`; "+ anúncio" → `spec.purpose='criativo'` ou `kind='anuncio'`) |
| data | `publish_date`, e o plano é o **do mês da data** (não o mês de hoje) |
| referência (link) | `reference_links` |
| na estratégia, objetivo, direção de arte, "da referência pegamos" | `briefing` (em tópicos) |

**Postagem que não é arte (ex.: rotina de stories) → `social_tasks`**: título, `description` (legenda e direção), `due_date`, `network`.

## 3. Como o sistema reconhece o conteúdo

### Recomendado: o agente marca os dados de forma estruturada

Em cada página que pode virar tarefa, o gerador põe **um bloco de dados** dentro da própria `<section>`:
`<script type="application/json" class="pg-data">…</script>`. Ele não aparece na tela nem no PDF. A Apresentação lê esse bloco
**antes** de limpar os scripts (hoje `prepareHtml` apaga todos os `<script>`; ela passa a guardar só o JSON, sem executar nada).
O gerador já tem esses dados em listas (`av.js`/`roteiros.js` e `sm.js`), então é só escrever o que já está montado.

Formato proposto, vídeo (página 4 do audiovisual da Fornario):

```json
{
  "v": 1, "tipo": "video", "id": "fornario-2026-11-F1", "area": "audiovisual",
  "codigo": "F1", "titulo": "A sua pizza começou anteontem",
  "direcao": "A massa de 48 horas contada em imagens: quase sem fala, close e luz quente.",
  "data": "2026-11-24", "data_confirmada": false, "papel": "Prova",
  "formato": "Reel", "uso": ["organico"],
  "quem_fala": "Pizzaiolo, uma frase", "quem_grava": "Ellcazo, na diária",
  "referencia": { "url": "https://www.tiktok.com/@rodegann/video/7629501704089718023",
    "rotulo": "@rodegann · Pizza napolitana de longa fermentação · 1,08 mi views" },
  "adaptacao": "O pizzaiolo mostra a massa de 48 h, sem receita, e termina na mesa posta.",
  "filmar": ["Timelapse da massa (celular fixo por 2 h)", "Macro nas mãos e na borda abrindo"],
  "ideias": [
    { "letra": "A", "titulo": "A história da massa", "direcao": "Conte em uma frase por que a massa daqui descansa 48 horas.",
      "roteiro": ["“Poucas pessoas sabem: a sua pizza começou anteontem.”", "“Aqui a massa descansa 48 horas.”", "“A sua mesa? Chama no WhatsApp.”"] },
    { "letra": "B", "titulo": "O processo", "direcao": "Mostre a massa crescendo e as mãos dobrando.",
      "roteiro": ["Sem fala: massa crescendo, mãos dobrando.", "No fim, só: “Começou anteontem.”", "Texto: “Reserve pelo WhatsApp.”"] },
    { "letra": "C", "titulo": "A prova na mão", "direcao": "Abra a borda na frente da câmera e diga o que a pessoa vai sentir.",
      "roteiro": ["“Escuta essa borda.”", "“Leve por dentro, crocante por fora.”", "“Traz o seu grupo: reserva até 19/12.”"] }
  ]
}
```

Formato proposto, peça (página 5 do social media da Fornario):

```json
{
  "v": 1, "tipo": "peca", "id": "fornario-2026-11-post01", "area": "design",
  "numero": 1, "titulo": "Sua confraternização no Fornario",
  "data": "2026-11-19", "formato": "carrossel", "telas": 5, "uso": ["organico"], "objetivo": "Venda",
  "estrategia": "Confraternização até 19/12: abre a temporada de reservas de grupo.",
  "copy": { "titulo": "Confraternização? A mesa é no Fornario.", "apoio": "Mande a data e quantas pessoas. A gente reserva.",
    "telas": ["Confraternização? A mesa é no Fornario.", "Mesa reservada para o grupo, no salão da Praça do Canhão.",
      "Pizza de massa de 48 horas, pratos e petiscos para dividir.", "Como reservar: mande no WhatsApp a data e o número de pessoas.",
      "Datas até 19/12. Reserve pelo WhatsApp."] },
  "cta": "Reserve pelo WhatsApp",
  "legenda": "O fim de ano chegou e o grupo já está perguntando: onde vai ser a confraternização? 🍕\n\n…\n\n👉 Toque no link da bio e reserve pelo WhatsApp.",
  "hashtags": "#confraternização #saolourencodamata #pracadocanhao #fornario #camaragibe",
  "direcao_arte": "Mesa de grupo em luz quente, arco vermelho do logo como moldura, títulos em Fraunces e selo “Reserve pelo WhatsApp” em toda tela.",
  "da_referencia": "O passo a passo numa arte só; aqui ele vira “como reservar a confraternização”.",
  "referencia": { "url": "https://www.instagram.com/p/DTWUSxdEYw4/", "rotulo": "@cavalcantis_pizzaria · 17,6 mil views" }
}
```

Regras do formato: datas sempre `AAAA-MM-DD` (o documento mostra "Qui 19/11", sem ano); `id` estável por cliente + mês + código
(é ele que evita duplicar); `v` para mudar o formato no futuro sem quebrar os antigos; páginas sem bloco (capa, estudo, calendário)
continuam como hoje (só título).

### Comparação com as outras saídas

| Caminho | Custo | Confiança | Observação |
|---|---|---|---|
| **Bloco de dados do agente (recomendado)** | zero por uso | alta | o agente já tem os dados soltos; a página continua igual |
| Ler o texto/as classes da página (`.vpg`, `.idea`, `.rot i`, `.post`, `.ct`, `.leg`) | zero | média/baixa | funciona nos 6 documentos de hoje, mas quebra na primeira mudança de visual; datas sem ano; "quem grava" é texto livre |
| IA pela API lendo a página | cada página custa e demora alguns segundos | média | gasto no teto do mês e chance de inventar campo; não precisa, já que quem escreve o documento é o próprio agente |

### Documentos já enviados

Recomendado **gerar de novo** os documentos de audiovisual e social media que ainda estão para aprovar (Fornario, Brio, Vovina,
SN, Raph e Peformake): o gerador já tem os dados, é rápido e o PDF não muda. Não vale escrever um leitor de texto só para eles.
Se algum já foi revisado, as marcações por página continuam (a versão nova sobe com outro `asset_id`; ver risco 3).

## 4. Fluxo na tela

- **Virar tarefa (página com dados)**: o pop-up abre **já preenchido** e é só confirmar (1 toque):
  - Área já escolhida pelo tipo (vídeo → Audiovisual; peça → Design). A pessoa vem marcada se o nome bateu; senão, fotos.
  - Aba 1 "Resumo" (sem rolagem): título, data, formato/uso e 3 linhas do que vai. Aba 2 "Ver tudo" (`DialogTabs`): os campos editáveis (copy, legenda, roteiro).
  - **Vídeo**: chips **Ideia A · Ideia B · Ideia C · As 3**. Escolher uma põe essa no roteiro; as 3 vão sempre para o banco de roteiros do projeto (trocar depois é "Usar este").
  - Botão: "Criar roteiro" / "Criar peça".
- **Virar tudo em tarefa** (no fim, junto de "Aprovar e enviar"): "Reconhecemos 10 vídeos e 10 peças. 2 já são tarefa." → **Criar 18**.
  Pula páginas Recusadas e as que já são tarefa. Um toque, com o responsável padrão de cada área (trocável por foto antes).
- **Não duplicar**: a função grava o `id` do bloco; se o mesmo vídeo/peça já virou tarefa (por outro documento ou versão), a página mostra
  "Já é tarefa · abrir" em vez de criar outra.
- **Aviso ao responsável**: um aviso só por pessoa e por documento ("10 roteiros novos da Fornario"), sem alarde (não é urgente);
  no "Virar tudo", o link abre a lista da área filtrada pelo cliente; na tarefa única, o link abre a tarefa (`/audiovisual/projeto/:id`, `/conteudo/peca/:id`).
- **Tudo conectado**: registrar `agent_doc_task` na prioridade dos avisos da Bete (`features/goals/priority.ts`, como novidade) e conferir
  que cada link abre o ponto exato. Se "Virar tudo" virar rotina automática, entra no `automation_catalog`.

## 5. O que muda em cada parte, ordem e tamanho

| # | Etapa | Onde | Tamanho |
|---|---|---|---|
| 1 | Gerador escreve o bloco `pg-data` em cada página de vídeo e de postagem; **levar o gerador para o repositório** (hoje está só na pasta temporária de uma sessão) | gerador do agente + `docs/ROTINA-ESTRATEGIA-MENSAL.md` (item do .html: "cada página de vídeo/postagem leva o bloco de dados no formato v1") | pequena |
| 2 | Função nova `agent_doc_item_task(_asset, _page, _data jsonb, _assignee, _idea)` + `agent_doc_items_task` (lote): mapeia como a seção 2, plano pelo mês da data, grava o `id` do item; coluna `item_key` + `client_id` em `agent_doc_reviews` com índice único para não duplicar; aviso agrupado | migração nova | média |
| 3 | Tela: `prepareHtml` guarda os blocos (sem executar), pop-up preenchido com abas, chips de ideia, "Virar tudo em tarefa" no fim, área padrão por tipo; teste em `docPresentation.test.ts` com uma página real; `e2e/popups.cjs` e `e2e/documentos.cjs` | `DocPresentation.tsx` | média |
| 4 | Gerar de novo os documentos de audiovisual e social media pendentes | agente | pequena |
| 5 | (depois) Vídeo do documento aparecer no **Modo gravação** com as falas da ideia escolhida | `RecordingPage`/`avPlan` ou ação em `monthly_strategy_actions` | grande |

Ordem recomendada: 1 → 2 → 3 → 4 (publicar 2 e 3 juntos). A 5 só se a equipe for gravar a partir do documento.

### Riscos

1. O gerador mora na pasta temporária da sessão: se a sessão acabar, perde-se. Precisa ir para o repositório antes de tudo.
2. O Modo gravação não enxerga projeto que não veio da estratégia do mês (etapa 5); até lá o roteiro fica na página do projeto.
3. Versão nova do PDF não zera as marcações antigas (já anotado no diário); com o `item_key`, pelo menos não duplica tarefa.
4. Mesmo vídeo no documento de Estratégia e no de Audiovisual: os dois precisam usar o mesmo `id` no bloco.

### Perguntas para o Italo

1. No vídeo, o padrão do roteiro é **uma ideia** (a A, e a equipe troca) ou **as 3 juntas** e a gravação decide?
2. A data da diária no documento é sugestão: já **agendar** a gravação (vai para a agenda/Google) ou só sugerir e agendar com 1 toque?
3. "Orgânico/anúncio": basta escrever no formato do projeto, ou quer um campo próprio (com filtro "vídeos para anúncio")?
4. "Virar tudo em tarefa" deve existir já, ou primeiro só a página a página preenchida?
