---
name: estilos-edicao
description: Biblioteca de estilos de edição da agência, aprendidos de ~85 vídeos de referência (salvos do Italo, profissionais de Recife/Brasil/mundo) — talking head cinético, documental mínimo, tela dividida, colagem de papel estilo Vox, retrô-documentário, pôster editorial, micro-documentário, antes/depois, tutorial com assinatura, motion de interface, carrossel animado — cada um como receita reproduzível (quando usar, tempos em frames, fontes, cor, grão, como implementar em Remotion/HyperFrames/FFmpeg/Premiere) e como MESCLAR. Use sempre que for escolher o estilo de um vídeo, planejar motion/legenda/transição, quando o usuário pedir "nesse estilo", "estilo Vox", "colagem", "documental", "tipografia animada", "antes e depois", ou mandar uma referência para replicar.
---

# Estilos de edição — escolher, mesclar, executar

**Nada é regra.** Esta biblioteca dá opções e o raciocínio; a escolha é por intenção. Leia junto com
`video-tools/NARRATIVA.md` (princípios) — a narrativa vem antes do estilo.

## Arquivos (em `video-tools/estilos/`)
- `indice_referencias.md` — **todas as referências separadas em A. aprender a EDITAR × B. aulas para FAZER no
  Claude** (novas: tipo A → `REFERENCIAS\_estilos\`, tipo B → `REFERENCIAS\_tutoriais\`).
- `estudo_aslaniedits.md` — **referência nº 1 do Italo**: sistema de estilo do Milad Aslani (43 vídeos), 6
  variações, técnicas T1–T30 com parâmetros e plano de componentes + vídeo-teste Ellcazo de 8 s.
- `estudo_rabbits.md` / `estudo_omarcosvianna.md` — Guilherme Coelho e Marcos Vianna: o que ensinam (captação,
  áudio, negócio, recorrência), estilos E27–E34 (hyperedit, bastidor→resultado, edit no beat, camcorder, aftermovie,
  unboxing de luz dura, trailer de evento, imóvel editorial), técnicas R1–R26 e V1–V21.
- `estudo_earnedits.md` / `estudo_dacostamotion.md` — motion: documentário de mesa 2,5D a 15–16 fps (E35–E37,
  EE1–EE28) e brandmotion de estúdio / brand book em movimento (E38–E39, DC1–DC24).
- `estudo_mavic.md` — humor que vende sem parecer venda (fórmula, H1–H14, roteiros por cliente).
- Ferramentas de estudo (baixar/medir/transcrever reels, ataques de áudio): `video-tools/scripts/estudo/`.
- `catalogo_estilos.md` — **cada um dos 104 vídeos de referência com o NOME do estilo (E1–E26) e a gramática de
  cada família** (E15 demo em UI escura, E16 rosto↔cartaz, E17 POV câmera viva, E18 esquete encenado, E19 curta
  cinematográfico, E20 breakdown de processo, E21 tela filmada, E22 nativo de feed, E23 explainer 3D, E24 quebra
  de realidade, E25 vitrine em lista, E26 explainer de manchetes).
- `tutoriais_aplicar.md` — cada tutorial estudado 2×: o que ensina (passo a passo para fazer aqui) + a edição do
  vídeo (transição X-RAY, catálogo das 30 animações do Claude, lemo-opuscar…).
- `receitas_estilos.md` — **11 estilos como receita** (quando usar, estrutura, parâmetros, implementação), mesclas
  recomendadas, **15 técnicas** em ordem de valor, **14 erros de "cara de IA"** + checklist de 8 perguntas,
  anexo de XML para "texto atrás da pessoa".
- `licoes_profissionais.md` — 10 lições/receitas dos profissionais (Recife, Brasil, mundo) e onde a cena de Recife
  deixa espaço (explicador com dados, séries com personagem, som real, padrão de texto fixo).
- `tecnicas_vistas.md` — técnicas profissionais vistas quadro a quadro (texto atrás do sujeito, texto que contorna o
  corpo, palavra-chave hierárquica, a palavra vira o cenário, textura que pertence à cena, 2,5D, fecho mínimo).
- `ferramentas_e_workflows.md` — ferramentas e workflows dos vídeos sobre Claude (o que instalar/evitar).
- `estudo_youtube.md` — 23 tutoriais: ofício documental (paper edit, montagem só de áudio, segurar informação,
  Johnny Harris/James Jani), fluxos de edição com Claude Code e seus erros, regras de motion, monetização;
  §6 = 16 mudanças priorizadas para as nossas skills.
- `estudo_maestros_ia.md` — canal Maestros da IA (23 vídeos): painel aprovar/rejeitar, biblioteca de motion
  reutilizável, layout escolhido pelo tipo de frase, regras de carrossel/thumbnail/cortes longos, o que NÃO adotar.
- `sound_design.md` — dicionário ação → efeito sonoro (tap, shutter, swoosh, flicker, charge, UI) e regras de mixagem.
- `estudo_giubeckers.md` — estudo da @giubeckers (895 mil): série "POV" no cenário real, legenda de 1 palavra,
  fecho de assinatura de cinema. Receita E6b (P&B + círculo vermelho narrado) em `receitas_estilos.md`.
- Referências brutas: `D:\PEFORMAKE\REFERENCIAS\_salvos\<grupo>\...\<id>\` (`video.mp4`, `sequencia.jpg`,
  `analise.md` com estudo visual, `transcricao.txt`).

## Como escolher (ordem de decisão)
0. A história vem antes do estilo: roteiro/paper edit pela skill **`roteiro-narrativa`**.
1. **Frase-alma e emoção** do vídeo (NARRATIVA §1–2).
2. **Gênero do material**: real/documental (evento, depoimento, político, institucional) → base E2 documental;
   fala de autoridade/marca → E1 cinético ou E3 tela dividida; explicar conceito/história → E4 colagem, E5 retrô ou
   E7 capítulos; vender serviço de edição → E8 antes/depois; tutorial → E9; produto digital → E10.
3. **Identidade do cliente** (`video-tools/clientes/<cliente>.md`): cores, fontes, tom. A referência dá o ritmo e a
   linguagem; a marca manda no que aparece.
4. **Mesclar com propósito**: 1 estilo base + no máximo 1–2 técnicas de outro (ex.: documental + 1 momento de
   palavra-chave cinética na frase mais forte). Ver "Mesclas recomendadas".
5. **Plataforma e duração** (Reels 9:16, 15–90 s; YouTube 16:9).
6. Escrever no `intencao.md`: estilo escolhido, por quê, quais técnicas e o que foi descartado.

## Executar
- Motion: Remotion (`video-tools/remotion`, kit `src/pro/`) ou HyperFrames (quando instalado); sempre arquivos
  separados (ProRes 4444 alpha), nunca grudados no vídeo base.
- Recorte de pessoa (texto atrás do sujeito): `video-tools/scripts/recortar.py fundo`.
- Textura/grão/look de arquivo: receitas FFmpeg em `receitas_estilos.md`.
- Antes de entregar: checklist anti-"cara de IA" (receitas §4) + verificação de montagem limpa (NARRATIVA §11b).

## Atualizar a biblioteca
Nova referência boa → skill `referencias-instagram` (baixar e medir) → estudo visual por `sequencia.jpg` →
acrescentar/ajustar a receita aqui, citando o id do vídeo.
