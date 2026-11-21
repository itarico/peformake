# Acervo audiovisual: índice único

Tudo sobre roteiro, criação, storytelling, gravação e edição que está no Git. Levantamento de 19/11/2026.
Nada foi movido: cada arquivo continua no lugar original. Este índice só aponta onde está cada coisa.

**Regra (Italo, 19/11/2026):** tudo novo de audiovisual (estudo, estrutura, edição, engenharia reversa, skill) entra
nesta pasta e no Git no mesmo dia. Nunca fica só no PC.

- **Comece por aqui: `MOTOR.md`.** Motor audiovisual único: a ordem das decisões (Reels e YouTube longo) e qual arquivo ou
  skill responde cada passo. Estrutura = código S, com a gramática das 117 em `ESTRUTURAS/S__.md` (skill `estrutura-video`, modo de escolha, nichos, intenção e nota por etapa), a ficha de
  entrada do cliente em `ESTRUTURAS/FICHA-ENTRADA.md` e os apelidos antigos (M, H, V, E) em `ESTRUTURAS/EQUIVALENCIAS.md`.
- **Todos os vídeos estudados (556), com link e pasta:** `INDICE-VIDEOS.md` (gerado por `ferramentas/indice_videos.py`).

## 1. Método e motor de roteiro (app peformake-gestao)
| Arquivo | O que é |
|---|---|
| `peformake-gestao/docs/ESTUDO-ROTEIRO-AUDIOVISUAL.md` | Estudo base (o porquê). MDD expandido em §2b, 117 estruturas S1–S117 em §3c |
| `peformake-gestao/docs/MOTOR-ROTEIRO.md` | Regras operacionais: pipeline de especialistas, banca de 4 notas, mix, trend, multiplicador |
| `peformake-gestao/docs/PROMPT-ROTEIRO-MASTER.md` | Prompt que a IA executa (núcleo e módulos M0–M10). Também no banco: `agent_instructions('roteiro-master')` |
| `peformake-gestao/docs/RADAR-TENDENCIAS.md` | Radar de trends, matriz de hype, calendário |
| `peformake-gestao/docs/ESTUDO-PERFIS.md` | Por que as pessoas acompanham cada perfil estudado |
| `peformake-gestao/docs/TESTE-ROTEIROS-PEFORMAKE.md` | Teste real do motor: 6 roteiros da Peformake (dez/2026) |
| `peformake-gestao/docs/TESTE-ROTEIROS-SN.md` | Teste real do motor no cliente SN |
| `peformake-gestao/docs/ESTUDO-ELLCAZO-ESPACO.md` | Estúdio e diária Ellcazo |
| `peformake-gestao/docs/ROTINA-ESTRATEGIA-MENSAL.md`, `ROTINA-ESTRATEGIA-CARDS.md`, `GUIA-ESTRATEGIA-MENSAL.md` | Onde o roteiro entra na estratégia do mês |
| `peformake-gestao/docs/rotina-diario.md` | Diário com as decisões do Italo sobre o motor |

Código que usa o motor: `peformake-gestao/src/features/strategy/brief/` (`scriptRules.ts`, `estruturas.ts`, `avParts.ts`,
`AvPartsView.tsx`), `src/features/strategy/` (`avPlan.ts`, `avTakes.ts`, `avDeck.ts`, `avTatico.ts`), `src/features/av/`
(gravação, agenda, roteiros) e `tools/estudo-mes/` (`roteiros.js`, `av.js`, `pfav2.js`, `pfav3.js`).

## 2. Skills de roteiro e edição no repo (`.claude/skills/`)
- `roteiro-narrativa/` (`SKILL.md`, `MODELOS.md` com M1–M49, `IDEIAS_MDD.md` com D1–D78)
- `motion-pro/`, `edicao-cliente/`, `peformake-estudo-mes/`

## 3. Edição, estilos e referências (`video-tools/`)
- `MANUAL_EDICAO.md` (1 página de decisão) e `NARRATIVA.md`
- `estilos/`: `catalogo_estilos.md` (E1–E39), `receitas_estilos.md`, `estudo_narrativas.md` (ganchos G1–G12),
  `estudo_mavic.md` (humor H1–H14, venda invisível V1–V12), estudos por editor (`estudo_aslaniedits`, `estudo_rabbits`,
  `estudo_omarcosvianna`, `estudo_earnedits`, `estudo_dacostamotion`, `estudo_giubeckers`, `estudo_maestros_ia`,
  `estudo_youtube`), `licoes_profissionais.md`, `tecnicas_vistas.md`, `sound_design.md`, `tutoriais_aplicar.md`,
  `ferramentas_e_workflows.md`, `ferramentas_citadas.md`, `lista_instalacao.md`, `indice_referencias.md`,
  `breakdowns/E14_milad_DfWvqYMM7uA.md`
- `estudos-perfis/pesquisa/`: 01 a 07 (profissionais, monetização e plano de 90 dias, ferramentas, estudo visual completo)
- `estudos-perfis/<perfil>/`: análise por vídeo (`analise.md`, `cortes.csv`, `transcricao.txt`). Análises por perfil:
  dacostamotion 101, salvos 84, mavicproducoes 57, earn.edits 52, rabbits 45, aslaniedits 41, omarcosvianna 40,
  tutoriais 29, giubeckers 19, estilos-instagram 12, 99hud 7, trafego 1
- Transcrições do YouTube: maestros 20, avulsos 25, fernando-valon, lucas-leite, marcos-lemos, deborah-folloni,
  rafa-voss, romariiu, labs

## 4. Só em outra branch: `claude/cloud-video-editing-2c3kea` (não juntada a esta)
Kit de edição: `video-tools/scripts/` (`decupar.py`, `montar.py`, `recortar.py`, `transcrever.py`, `estabilizar.py`),
`video-tools/remotion/` (Reel, LowerThird, TituloAnimado), `video-tools/clientes/disalp.md`, instaladores e as skills
`decupagem-video`, `motion-remotion`, `tratamento-video` e uma versão de `edicao-cliente`.

## 5. Sistema antigo (raiz do repo)
`src/components/consulting/audiovisual/` (gerador e chat roteirista) e `supabase/functions/consulting-audiovisual-*`.
Geração anterior, não segue o MDD.

## 5b. Biblioteca de virais (engenharia reversa)
`virais/README.md`: uma ficha por vídeo que funcionou, com esqueleto, molde de fala e como aplicar. Feita pela skill
`.claude/skills/engenharia-reversa-viral/` (também copiada para `~/.claude/skills` do PC).

## 5c. Estudos de perfil
`perfis/`: um arquivo por perfil estudado inteiro (números, ideias que funcionam, gramática de edição, links das fichas).
Primeiro: `perfis/salleszk.md`. Transições: `perfis/willrvail.md` (Will Vail, 21/11/2026).

## 5d. Mapa, placar e rotina diária (o motor que se aprimora)
- `MAPA-ESTRUTURAS.md`: código S por objetivo, os mais fortes, esqueleto por código, S-novo e códigos sem exemplo.
  `MAPA-ESTRUTURAS-COMPACTO.md` é a versão lida pela fila da estratégia (roteiro-master M1/M2/M5). Os dois e o
  `estruturasProvadas.ts` das funções saem de `ferramentas/mapa_estruturas.py`: ficha nova ou placar novo, rode o script.
- `PLACAR-ESTRUTURAS.md`: cada Reel publicado de cliente com o código S e a força (views ÷ mediana do perfil). O mapa
  põe "nosso placar" em cada código; o motor prefere o que funcionou aqui e evita o que falhou.
- Rotina na nuvem "Acervo: virais do dia, estruturas novas e placar" (todo dia 06:41): atualiza o placar, estuda 2 virais
  com estrutura nova e 1 vídeo do estoque salvo, refaz o mapa e escreve as lições do nicho às segundas.
  Roteiro completo do ciclo (prioridade do que estudar, como ensinar a página, quando nasce estrutura nova):
  `APRENDIZADO.md`.

## 5e. YouTube (canal)
- `youtube/pesquisas/<tema>-<data>/`: outliers (skill `youtube-outliers`) e o `MAPA.md` com a lacuna e as pautas.
- `youtube/roteiros/`: roteiros longos (skill `roteiro-retencao`, MDD). Primeiro: GTA 6 e a ciência da espera (20/11/2026).
- `youtube/roteiros/taoismo/`: "O livro mais famoso da China estava ao contrário" (canal Por Dentro): roteiro-v1, checagem,
  fontes e mídia, narração para gravar e plano de cenas e animação. Mídia baixada fica fora do Git em `C:\Claude\canal-youtube	aoismo\midia\`.
- **Falta no Git (está só no outro PC, `D:\ITALO\CLAUDE\SHOPPE\canal-youtube\`):** `MDD-manual-v2.md` (base do método),
  `LINHA-EDITORIAL.md`, roteiros e embalagens antigos, e o pipeline de narração e leitura de vídeo
  (`D:\ITALO\CLAUDE\IA-LOCAL\`). Trazer na próxima ida ao outro PC (lembrete de 20/11).

## 6. Skills que só existiam no PC (cópia em `skills-locais/`)
Copiadas de `~/.claude/skills` em 19/11/2026 para ficarem salvas no Git. A cópia é backup: a skill que roda
continua sendo a do PC. Se editar lá, copie de novo para cá.
- `mdd/`: Método De Dentro completo (SKILL.md e references). A base de tudo
- `redator-audiovisual-agencia/`, `performake-content-agent/`
- `roteiro-retencao/`, `narracao/`, `edicao-motion/`, `edicao-story/`, `radar-criativos/`, `ler-video/`,
  `clareza-video/`, `shorts-do-longo/`, `titulo-thumb-lab/`, `varredura-nicho/`

- `openmotion*/` (8 skills do OpenMotion, estúdio de vídeo com agente, 20/11/2026). Para instalar o OpenMotion
  num PC (repositório, MCP e skills): `ferramentas/openmotion/INSTALAR.md` e `instalar-openmotion.ps1`.
  Aprendizados de uso real (duração em quadros inteiros, import por ZIP, atraso dos efeitos do Pixabay):
  `ferramentas/openmotion/APRENDIZADOS.md`. Exemplo completo: `youtube/roteiros/taoismo/montagem/v70-openmotion/`.
- `transicoes-willrvail/` (21/11/2026): receitas das transições do @willrvail (flash cut, negativo, whip, silhueta,
  match cut, tinta como luma matte, light leak, wipe por objeto, glitch) em ffmpeg, Remotion, HTML+GSAP e Premiere,
  com 6 transições prontas para o documentário do Taoísmo. Estudo do perfil: `perfis/willrvail.md`.

Ficaram de fora as skills de terceiros instaladas (seedance, kling, hyperframes, remotion, ugc-ad-scripts,
ad-hook-analyzer, humanizar, nem-parece-ia e outras): não são estudo da casa e podem ser reinstaladas.

## 7. Kit de edição do PC de edição (subido em 20/11/2026)
Vindo do checkout `C:\Users\intal\peformake` (estava só lá, sem commit):
- Skills de edição em `.claude/skills/`: `estilos-edicao` (porta de entrada da biblioteca de estilos),
  `referencias-instagram` (baixar e medir reels), `decupagem-video`, `tratamento-video`, `cor-sony`, `limpeza-audio`,
  `narracao`, `motion-remotion`, `capa-thumbnail`
- `video-tools/README.md`, `ORGANIZACAO.md`, `FERRAMENTAS.md`, `install.sh`, `requirements.txt`
- `video-tools/scripts/`: decupar, montar, recortar, transcrever, estabilizar, corrigir_cor, limpar_audio, narrar, capa,
  rastrear, referencia_reel, perfil_instagram, analisar_referencia, `openverse_audio.py` (áudio com licença) e
  `estudo/` (processar_links.sh, transcrever_lote.py, onsets.py: lote de reels → transcrição → ataques do áudio)
- `video-tools/remotion/`: kit `src/pro/` (LegendaPro, TituloCinetico, Transicoes, LowerThirdPro, CTA3D, Vitrine,
  GrainOverlay, fx/ de câmera, texto, traço, shader) e as composições genéricas (Reel, LowerThird, TituloAnimado)
- `video-tools/referencias/`: análise de referência do earn.edits
- `acervo-audiovisual/treino/milad_build/`: o treino de recriar o reel do Milad em HyperFrames (só o código; a imagem,
  o som e os quadros de referência ficaram no PC em `D:\PEFORMAKE\TREINO\milad_build\`)

Fichas de edição por cliente em `video-tools/clientes/` (Disalp, MF Máquinas, 3LM, Natália/Menudo; subidas em 20/11). Ficaram de fora as composições e logos de Disalp, MF, 3LM e Menudo
(`src/compositions/{Disalp,mf,tlm,menudo}`, `public/<cliente>/`). Por isso `remotion/src/Root.tsx` importa arquivos que
não estão aqui: para rodar o kit em outra máquina, apague essas 4 linhas de import ou traga as pastas do PC.
