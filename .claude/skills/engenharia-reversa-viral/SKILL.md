---
name: engenharia-reversa-viral
description: Pega um vídeo que viralizou (link do Instagram, TikTok, YouTube ou arquivo), assiste inteiro, faz a engenharia reversa (por que prendeu, segundo a segundo) e guarda como ficha de estrutura reutilizável no acervo audiovisual. Depois aplica a estrutura no cliente ou no próprio perfil. Use quando pedirem "engenharia reversa", "por que isso viralizou", "aprender a fazer igual", "transformar esse vídeo em modelo/skill", "usar a estrutura desse vídeo" ou quando o motor de roteiro precisar de uma estrutura com exemplo real (curador, etapa 2).
---

# Engenharia reversa de vídeo viral

> **Motor único:** a ordem das decisões e o código principal de cada camada estão em `acervo-audiovisual/MOTOR.md`. Estrutura = código S, com a gramática em `acervo-audiovisual/ESTRUTURAS/S__.md`; M, H e V são apelidos (ver `ESTRUTURAS/EQUIVALENCIAS.md`).

Objetivo: transformar um vídeo que funcionou em uma **estrutura** que a Peformake consegue repetir com outro assunto,
outro cliente e outra pessoa, sem copiar o conteúdo. Copia-se a mecânica, nunca a fala, a marca ou a imagem.

Biblioteca: `acervo-audiovisual/virais/` (uma ficha por vídeo, `AAAA-MM-DD_perfil_codigo.md`) e o índice
`acervo-audiovisual/virais/README.md`. O catálogo de estruturas S1–S117 fica em
`peformake-gestao/docs/ESTUDO-ROTEIRO-AUDIOVISUAL.md` §3c: toda ficha aponta para o código S mais próximo ou cria
um "S-novo".

## Modo 1: estudar um vídeo novo

1. **Baixar e assistir.** Skill `ler-video`. Neste PC, se o `ler_video.py` não existir, faça na mão:
   - `python -m yt_dlp -o "video.%(ext)s" --write-info-json <URL>` na pasta de rascunho;
   - quadros: `ffmpeg -i video.mp4 -vf "fps=1/4,scale=360:-1" quadros/q%03d.jpg` e uma folha de contato com
     `ffmpeg -i quadros/q%03d.jpg -vf tile=6x5 contato.jpg`;
   - fala: faster-whisper `small` na CPU, lendo o áudio por `ffmpeg -ac 1 -ar 16000 -f s16le` (o `av` deste PC
     não aceita o arquivo direto).
   - Post privado ou pedindo login: pedir o arquivo ao Italo. Nunca usar senha ou cookie dele.
2. **Números.** Curtidas, comentários, visualizações, data, duração. Comentários muito acima do normal
   (mais de 30 % das curtidas) quase sempre indicam palavra-isca (S100).
3. **Decupar em blocos de tempo.** Para cada bloco: o que se vê, o que se fala, o texto na tela, a função
   (gancho, contexto, virada, prova, payoff, CTA). Citar o tempo (0:12).
4. **Responder às 7 perguntas da engenharia reversa:**
   1. O que para o dedo nos 2 primeiros segundos? (imagem, frase, contraste, curiosidade)
   2. Qual é a promessa implícita e quando ela é paga?
   3. Onde está a tensão que segura até o fim? (pergunta aberta, aposta, teste, contagem)
   4. Qual é a prova? (gráfico, número, print, antes e depois, demonstração)
   5. Por que comentam, salvam ou compartilham? (isca, identificação, polêmica, utilidade)
   6. O que é da pessoa e não se copia? (carisma, lugar, história, autoridade)
   7. O que é mecânica e se copia? (ordem dos blocos, tipo de gancho, ritmo, recurso visual)
5. **Escrever a ficha** com o modelo abaixo e salvar em `acervo-audiovisual/virais/`. Acrescentar uma linha no
   `acervo-audiovisual/virais/README.md` e rodar `python acervo-audiovisual/ferramentas/mapa_estruturas.py` (refaz o
   mapa, o compacto da rotina e o resumo das funções de IA).
   Antes de rodar o mapa, atualize a gramática do código em `acervo-audiovisual/ESTRUTURAS/S__.md` (linha na
   Evidência, com o público do perfil; e Variações, se a ficha mostrou algo novo). Código sem página: criar pelo
   `ESTRUTURAS/_MODELO.md`.
6. **Commit e push** (regra do repo: tudo salvo no Git).

## Modelo da ficha

```markdown
# <nome curto da estrutura> · @perfil · <data>
Link · duração · curtidas · comentários · visualizações (se houver) · formato (9:16, legenda queimada…)
Estrutura do catálogo: S__ (+ S__) ou S-novo: <nome>

## Por que funcionou (1 parágrafo)
## Linha do tempo
| Tempo | Vê | Fala / texto na tela | Função |
## As 7 respostas
## Esqueleto reutilizável (a mecânica, sem o conteúdo dele)
1. … (com tempo-alvo de cada bloco)
## Molde de fala (preencher os colchetes)
## O que não copiar
## Como aplicar
- No perfil do Italo / da Peformake:
- Em cliente (nicho, exemplo de 2 linhas):
- Cuidados (conselho de classe, promessa, escassez só verdadeira)
## Variações (3)
```

## Ficha de edição (quando o que vale é o estilo, não o roteiro)

Referência de edição (sem fala, ou onde a graça é o corte, a tipografia, o som) usa este modelo, no mesmo arquivo
ou sozinho. Liga ao catálogo de estilos (`video-tools/estilos/catalogo_estilos.md`, E1–E39) e às técnicas dos
estudos de editor (Milad T, @rabbits R, Vianna V, EarnEdits EE, dacosta DC).

```markdown
## Edição
Estilo do catálogo: E__ (+ técnicas T__/R__/V__/EE__/DC__) ou E-novo: <nome>
- Gancho visual (0–3 s):
- Ritmo (planos, cortes/s, onde acelera e onde respira):
- Tipografia e legenda (fonte, tamanho, posição, animação):
- Transições e movimento de câmera (zoom, whip, máscara, 3D, parallax):
- Cor, grão e textura:
- Som (música, BPM, SFX, silêncio, onde o som manda no corte):
- Como fazer (programa e passos: Premiere, After Effects, CapCut, Remotion, motion-pro):
- Dificuldade (1 a 5) e tempo estimado por vídeo:
- Em que tipo de cliente/vídeo cai bem e em qual não cai:
```

Ferramenta de preparo em lote: `acervo-audiovisual/ferramentas/preparar_video.py <URL> <pasta> [transcricao.txt]`
(baixa, 24 quadros com o tempo, folha `contato.jpg`, meta; `WHISPER_MODELO=nenhum` pula a transcrição).
Material baixado fica na pasta de rascunho, nunca no Git.

## Modo 2: usar uma estrutura que já está na biblioteca

1. Ler `acervo-audiovisual/MOTOR.md` e `MAPA-ESTRUTURAS.md` (código S por objetivo, placar, ficha de entrada do
   cliente) e escolher pelo
   objetivo (alcance, seguidores, lead, venda) e pelo que o cliente consegue gravar. Lista completa:
   `acervo-audiovisual/virais/README.md`.
2. Abrir a gramática `ESTRUTURAS/S__.md` (e as fichas como prova) e seguir os **blocos** e o **molde de fala**, trocando tudo pelo que é do cliente (MDD: de
   dentro, com caso, número e palavra reais do cliente). Nada de dado inventado.
3. No motor de roteiro, gravar `data.estrutura` com o código S da ficha e citar a ficha como referência.
4. Passar na banca do motor (`peformake-gestao/docs/MOTOR-ROTEIRO.md`). A ficha não substitui a banca.

## Regras

- Copiar a mecânica, nunca a fala, a marca, a música com direito autoral ou a imagem de outra pessoa.
- Uma estrutura que depende do carisma ou da história única do criador vai marcada "difícil de repetir".
- Toda ficha nova entra no Git no mesmo dia.
