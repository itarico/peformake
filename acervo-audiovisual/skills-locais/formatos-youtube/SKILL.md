---
name: formatos-youtube
description: Escolhe o formato de apresentação do próximo vídeo longo de YouTube (índice com ícones e progresso, dossiê, ascensão e queda, iceberg, ranking, explicado em níveis, "e se", mistério, comparação, linha do tempo, tier list, desafio interativo, tipografia cinética, entrevista) pelo tema, pelo objetivo e pelo que a produção aguenta, sem repetir o formato do vídeo anterior, e indica o estilo visual de referência. Use quando o usuário perguntar "qual formato usar", "como apresentar esse vídeo", "estrutura do vídeo do canal", "variar o formato", "estilo Daniel Penin", "índice com ícones", ou antes de rodar a roteiro-retencao para um vídeo do canal Por Dentro.
---

# Formatos de YouTube: escolher o formato do próximo vídeo

Base (ler antes de escolher):
- `C:\Claude\peformake\acervo-audiovisual\youtube\FORMATOS-APRESENTACAO.md`: os 15 formatos, com blocos, exemplos com
  views, por que retém, produção e nota de adequação.
- `...\youtube\REFERENCIAS-ESTILO-CANAIS.md`: canais de referência visual e viabilidade com as nossas ferramentas.
- `...\youtube\POSICIONAMENTO-CANAL.md`: a lente fixa do canal. O formato muda; a lente não.
- `...\youtube\APRENDIZADO-YOUTUBE-2026.md`: retenção, embalagem, Shorts, proporção hype x atemporal.
- `...\youtube\PAUTAS-PROXIMAS.md`: pautas já propostas com o formato sugerido.

## Passo 1: o que a pauta é
Responda em uma linha cada:
1. **Forma do conteúdo:** lista de tipos? história com começo e fim? uma pergunta? dois lados? um conceito? um enigma?
2. **Objetivo do vídeo:** descoberta (puxar gente nova), profundidade (fã), série (próximo vídeo), Shorts (itens soltos).
3. **Hype ou atemporal:** há data de validade? (ver §6 do APRENDIZADO).
4. **O que a produção aguenta nesta semana:** baixo, médio ou alto.
5. **Formato dos 2 últimos vídeos publicados** (não repetir em sequência).

## Passo 2: tabela de decisão
| Forma do conteúdo | Formato principal | Alternativa |
|---|---|---|
| Lista de tipos ou de gatilhos | Índice com ícones e progresso | Tier list |
| Esquema, golpe, campanha suspeita | Dossiê / investigação | Iceberg |
| Empresa que caiu ou virou | Ascensão e queda | Linha do tempo |
| Muitos casos de escala diferente | Ranking / top N | Iceberg |
| Um conceito só | Explicado em 5 níveis | Tipografia cinética |
| Premissa impossível com dados | "E se...?" | Desafio interativo como camada |
| Mito com resposta surpreendente | Mistério com revelação no fim | Dossiê |
| Duas marcas ou dois lançamentos | Comparação lado a lado | Tier list |
| Expansão no território ou no tempo | Linha do tempo / mapa que cresce | Ascensão e queda |
| Ideia sem imagem de arquivo | Tipografia cinética (Tinocando) | Explicado em níveis |
| Acesso a alguém de dentro | Entrevista / documental | Dossiê |

Ajustes pelo objetivo:
- **Descoberta:** prefira formatos com contador visível (índice, ranking, iceberg) e título com número ou pergunta.
- **Série:** dossiê em partes (mecânica do caso Daniel Penin: tese moral no título, "Parte 2"), com prova documental e
  sem acusar pessoa física sem fonte oficial.
- **Shorts:** formatos com itens rendem um Short por item.
- **Produção baixa:** índice, ranking, níveis, tier list e tipografia cinética têm molde reutilizável.

## Passo 3: estilo visual
Escolha 1 dos 4 estilos de `REFERENCIAS-ESTILO-CANAIS.md` (Sala de Guerra; infográfico Wendover/PolyMatter; texto
Tinocando; mapa Johnny Harris/Nostalgia) ou a pele própria da pauta (ex.: "Propaganda da Capital" no Panem).
Papel e tinta é série especial, não padrão. Ferramentas: HTML+GSAP (OpenMotion/HyperFrames), Remotion, Premiere,
imagens livres; sem gerador de imagem, salvo decisão do Italo.

## Passo 4: entregar
Na conversa, em até 10 linhas:
- formato escolhido e o alternativo, com o porquê (forma do conteúdo, objetivo, produção, variedade);
- os blocos com tempos (copiar o esqueleto do formato e encaixar os 4 blocos fixos do canal: "A peça", "O mecanismo",
  "A conta", "Use você");
- 1 exemplo com views tirado do FORMATOS-APRESENTACAO (nunca inventar número);
- o frame-chave descrito em 1 frase;
- o próximo passo: `roteiro-retencao` com o formato escolhido.

## Regras
- Nunca repetir o formato do vídeo anterior.
- Número de views só com fonte (arquivo da pesquisa ou coleta nova com `yt-dlp`). Se não houver, dizer que não encontrou.
- Formato novo que funcionar no canal entra no FORMATOS-APRESENTACAO com o resultado (placar do Studio após 7 dias).
- Mudou esta skill: copiar para `C:\Claude\peformake\acervo-audiovisual\skills-locais\formatos-youtube\SKILL.md` e fazer
  commit e push (regra do acervo).
