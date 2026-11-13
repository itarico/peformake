---
name: edicao-cliente
description: Editor de vídeo da Performake que entende o cliente. A partir dos brutos de uma gravação, identifica o roteiro de cada vídeo, escolhe os melhores takes, corta cada vídeo na duração pedida, cobre com cenas de apoio estabilizadas e entrega UMA timeline no Premiere (XML) com todos os vídeos em sequência, espaço entre eles, marcadores, legenda SRT e relatório. Use quando o usuário disser "edita os vídeos do cliente X", "monta os vídeos da gravação", "corta os roteiros", "faz a primeira montagem", "entrega na timeline" ou mandar a pasta de uma gravação com roteiros.
---

# Edição com contexto do cliente → timeline única no Premiere

Ferramentas: `video-tools/scripts/` (Python via `bash video-tools/bin/vpy`; se acusar que não está instalado: Windows `powershell -ExecutionPolicy Bypass -File video-tools\install.ps1`, Linux/macOS `bash video-tools/install.sh`).
Regras por cliente: `video-tools/clientes/<cliente>.md`. **Leia antes de tudo.** Se não existir, crie a partir
da Base de Conhecimento/CRM do cliente no Drive e confirme com o usuário antes de editar.

## 0. Combinar antes (não pule: evita retrabalho)
Confirme e registre no arquivo do cliente: duração por vídeo, intervalo entre vídeos, como cortar as
entrevistas, fidelidade ao roteiro, formato da legenda e o caminho dos brutos no PC.

## 1. Contexto
- Leia no Drive a Base de Conhecimento, o Banco de Roteiros da gravação e as regras de comunicação.
- Anote: palavras e temas proibidos, afirmações que exigem prova, pessoas que não podem aparecer e o CTA obrigatório.

## 1.5 Intenção de cada vídeo (obrigatório antes de cortar)
Edição sem intenção vira só corte de silêncio. Antes de montar **cada** vídeo, escreva em
`<trabalho>/intencao.md` um bloco curto. Ele decide tudo o que vem depois:

```
### R4 — 7h da manhã
POR QUE EXISTE: provar que a Disalp entrega antes da cozinha abrir (objeção: "fornecedor atrasa").
PARA QUEM: nutricionista e chef de hotel/hospital que abre cedo.
MENSAGEM ÚNICA (1 frase): "Sua cozinha começa o dia já abastecida."
EMOÇÃO: alívio / confiança — ritmo calmo, imagens de madrugada e frota.
GANCHO (0–3 s): "Sete da manhã. A sua equipe chega e o hortifrúti já está lá."
PROVA: frota refrigerada, conferência no Ceasa (cenas de apoio).
CTA: visita técnica. O QUE O ESPECTADOR FAZ DEPOIS: agenda a visita.
SAI DO CORTE: qualquer fala que não sirva à mensagem única, mesmo que boa.
```
- Tire a intenção do roteiro, do banco de séries e da ficha do cliente. Sem roteiro (entrevista, evento),
  deduza a partir da fala mais forte e **confirme com o usuário** antes de montar.
- Use a intenção como critério em cada decisão: qual take fica (energia certa para a emoção), a ordem,
  o que corta quando passa do tempo, que cena de apoio cobre cada frase, o texto da tela e a trilha.
- No relatório, para cada vídeo: a mensagem única e **por que** os cortes principais foram feitos
  ("cortei a fala X porque desviava de Y").

## 1.6 Narrativa (obrigatório): leia `video-tools/NARRATIVA.md` antes de qualquer corte
Para montar a história (roteiro do zero ou paper edit do bruto), use a skill **`roteiro-narrativa`**
(objetivo, frase-alma, gancho por objetivo, arco, modelos M1–M8, checklists) e salve `roteiro.md` na pasta do vídeo.
São os PRINCÍPIOS de construção (frase-alma, emoção, arco, mostrar>dizer, ritmo, som, cor, transição, abertura e
fecho, ética, sem cara de IA, processo). Eles valem para todo formato; as regras abaixo são só um EXEMPLO aplicado.
Em caso não previsto, decida pelo princípio, não pelo checklist.

### Exemplo aplicado — lição da Menudo, 07/11/2026
A primeira entrega da Natália de Menudo foi reprovada como "amadora". O Italo reeditou à mão e o vídeo dele
virou a régua. Erros que NÃO podem se repetir:
1. **História, não picotado:** um arco com começo, meio e fim (ex. evento: contexto feliz → fala pessoal mais forte →
   respiro de emoção sem fala → gratidão/compromisso concreto → fecho na IMAGEM de prova). Nunca dividir a história
   em "bloco de fala" e "bloco de cena".
2. **Cortar o que puxa para fora da mensagem** (política explícita, cobrança, "semana que vem", datas) e **manter o
   que cria vínculo** (agradecer quem fez a festa, a atração, a comunidade).
3. **Filtro ético calibrado:** só sai o que expõe ao ridículo ou agride. Criança e gente brincando = alegria, fica.
4. **Deixar respirar:** fala no rosto quando a fala é forte; blocos de emoção sem fala. Nada de cobrir frase por
   frase com B-roll de 2 s.
5. **Abrir e fechar em imagem**, não em cartela: abre com a cena mais feliz/forte; fecha no impacto (prova visual).
6. **Grafismo mínimo por padrão:** logo pequeno + legenda limpa (1 palavra/expressão por vez). Título, lower third,
   cartela final e efeitos SÓ se o cliente/briefing pedir. Menos texto, mais cena.
7. **Estudar o padrão-ouro ANTES de cortar:** vídeos já entregues/aprovados do Italo para o cliente ou nicho
   (`D:\ELLCAZO\JOBS\<ano>\<mês>\<cliente>\VIDEOS PRONTOS`, pastas "Videos prontos" antigas) e a ficha do cliente.
   Velocidade nunca justifica pular isto.

## 4.5 Corte bruto para aprovação (portão obrigatório)
Antes de motion, SFX, cor e render final: gere um **corte bruto** (720p, só a montagem + áudio + legenda simples)
e o roteiro do arco (bloco a bloco, com tempo). Compare lado a lado com o padrão-ouro e faça uma autocrítica
escrita ("onde isto parece amador?"). Entregue a prévia ao Italo e **espere aprovação** antes de finalizar.
Se ele estiver ausente, deixe a prévia pronta e siga para outro vídeo — não finalize sem OK.

## 2. Material
- Baixe a pasta da gravação do Drive para `<scratchpad>/<cliente>/brutos/` (pasta nova).
- `ffprobe` em tudo: separe **falas** (com voz) e **apoio** (sem fala).

## 3. Decupar
`bash video-tools/bin/vpy video-tools/scripts/decupar.py gerar <brutos>/* --out <trabalho> --caminho-pc "<caminho no PC>"` → `decupagem.json` e transcrições.

## 4. Editar como editor (o trabalho de verdade)
Para cada roteiro do banco:
1. Ache os takes: compare a transcrição com o texto do roteiro. Frases do roteiro gravadas várias vezes → candidatos.
2. Escolha **um take por frase**: completo, sem tropeço, com boa dicção e boa energia; em empate, o último take.
   Fala diferente do roteiro mas natural e dentro das regras: use e marque `ROTEIRO DIVERGE`.
3. Corte no limite da palavra (folga de cerca de 0,10 s antes e 0,15 s depois), sem respiração e sem "é…".
4. Ordem = ordem do roteiro. Gancho nos 3 primeiros segundos, CTA no fim.
5. Duração alvo: veja o arquivo do cliente. Acima do máximo, corte os parágrafos de apoio (nunca o gancho nem o CTA).
   Abaixo do mínimo, não estique: registre no relatório.
6. Regras do cliente: trecho com palavra ou tema proibido **sai**; afirmação sem prova fica e ganha
   marcador `CONFIRMAR: ...`; pessoa sem autorização ganha marcador `AUTORIZAÇÃO: ...`.
7. Entrevistas: siga o combinado no arquivo do cliente (ex.: um vídeo por tema).

## 5. Cenas de apoio
- Escolha pelo assunto da fala (veja os prints e os frames). 2 a 4 s cada; cubra 30 a 50% do vídeo;
  nunca sobre o gancho nem o CTA; não repita a mesma cena em sequência.
- Estabilize só os trechos usados (o arquivo inteiro se for curto):
  `bash video-tools/bin/vpy video-tools/scripts/estabilizar.py <bruto> <trabalho>/ESTABILIZADOS/<nome>_estab.mp4 --suavidade 20 --zoom 4 [--inicio S --dur S]`
  (com `--inicio/--dur` estabiliza só o trecho usado, bem mais rápido)
- Confira um frame de cada cena estabilizada antes de usar.

## 6. Montar
Escreva `<trabalho>/plano.json` (formato em `montar.py --help`) e rode:
`bash video-tools/bin/vpy video-tools/scripts/montar.py plano.json --midia <pasta com brutos e ESTABILIZADOS> --out <entrega> --transcricoes <trabalho>`
O script já valida o XML. Verifique cada vídeo dentro da duração (o resumo aponta "FORA DE").

## 7. Entregar (pasta do cliente no Drive)
- `montagem_premiere.xml`, `montagem.srt`, pasta `ESTABILIZADOS/` e o relatório
  (vídeos montados com duração, roteiros sem material, pendências CONFIRMAR e AUTORIZAÇÃO).
- Instrução para o editor: baixar `ESTABILIZADOS` para dentro da pasta dos brutos no PC → Premiere:
  Arquivo > Importar > `montagem_premiere.xml` → importar `montagem.srt` como legenda e arrastar para a timeline.
