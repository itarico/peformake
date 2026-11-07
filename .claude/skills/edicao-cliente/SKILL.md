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
