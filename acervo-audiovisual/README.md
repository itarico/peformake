# Acervo audiovisual: índice único

Tudo sobre roteiro, criação, storytelling, gravação e edição que está no Git. Levantamento de 19/11/2026.
Nada foi movido: cada arquivo continua no lugar original. Este índice só aponta onde está cada coisa.

**Regra (Italo, 19/11/2026):** tudo novo de audiovisual (estudo, estrutura, edição, engenharia reversa, skill) entra
nesta pasta e no Git no mesmo dia. Nunca fica só no PC.

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
Primeiro: `perfis/salleszk.md`.

## 6. Skills que só existiam no PC (cópia em `skills-locais/`)
Copiadas de `~/.claude/skills` em 19/11/2026 para ficarem salvas no Git. A cópia é backup: a skill que roda
continua sendo a do PC. Se editar lá, copie de novo para cá.
- `mdd/`: Método De Dentro completo (SKILL.md e references). A base de tudo
- `redator-audiovisual-agencia/`, `performake-content-agent/`
- `roteiro-retencao/`, `narracao/`, `edicao-motion/`, `edicao-story/`, `radar-criativos/`, `ler-video/`,
  `clareza-video/`, `shorts-do-longo/`, `titulo-thumb-lab/`, `varredura-nicho/`

Ficaram de fora as skills de terceiros instaladas (seedance, kling, hyperframes, remotion, ugc-ad-scripts,
ad-hook-analyzer, humanizar, nem-parece-ia e outras): não são estudo da casa e podem ser reinstaladas.
