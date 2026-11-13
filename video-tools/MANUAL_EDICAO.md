# Manual de Edição Ellcazo — 1 página para decidir qualquer vídeo

Nada aqui é regra fixa: é a ordem das decisões e onde está o conhecimento. Cada passo aponta para o arquivo certo.

## 1. Por quê (antes de abrir o bruto)
- Objetivo único (vender · lead · educar · autoridade · marca · informar), público, **frase-alma** ("deve SENTIR ___ e
  ACREDITAR que ___"), ação final. → skill `roteiro-narrativa` §1 · `video-tools/clientes/<cliente>.md`.
- Escopo em 13 itens → `estilos/estudo_narrativas.md` (ficha de escopo).

## 2. História
- Gancho pelo objetivo (G1–G12) + texto na tela ≤ 2 linhas + **teste sem som**; 2–3 versões. → `estudo_narrativas.md`.
- Arco em 5 linhas; modelo de partida M1–M49 → `.claude/skills/roteiro-narrativa/MODELOS.md`.
- Humor que vende sem parecer venda (H1–H14) → `estilos/estudo_mavic.md` · ideias soltas D1–D78 → `IDEIAS_MDD.md`.
- Locução 3,3–3,5 palavras/s; virada a cada 15–20 s; fecho em círculo + assinatura fixa.
- Material gravado: **paper edit só no áudio** antes de imagem (NARRATIVA §11b; corte pela transcrição E pela onda).

## 3. Estilo (a gramática, não a cópia)
- Escolher 1 base + 1–2 técnicas de outro → `estilos/catalogo_estilos.md` (E1–E39) e `receitas_estilos.md`.
- Atalhos: manifesto de metáforas (E13) · fio condutor de uma forma / Milad (E14) · rosto↔cartaz (E16) · POV câmera
  viva (E17) · esquete (E18) · curta cinematográfico (E19) · bastidor→resultado (E28) · documentário de mesa 2,5D (E35)
  · brandmotion (E38).
- Técnicas medidas: Milad T1–T30 (`estudo_aslaniedits.md`), @rabbits R1–R26, Vianna V1–V21, EarnEdits EE1–EE28,
  dacosta DC1–DC24.

## 4. Fazer
| Peça | Ferramenta |
|---|---|
| Motion/texto/transições em código | skills `hyperframes` (+ `hyperframes-registry`, ~450 blocos) ou Remotion |
| Recriar uma referência quadro a quadro | skill `reverse-any-video` · estilo provado em tema novo: `style-sampling` |
| Desenho à mão / rabisco | skill `hand-drawn-video` |
| Efeitos sobre talking head (texto atrás, órbita…) | skill `video-effects` |
| Isométrico explicativo | skill `anatomy` |
| Filme em estilo artístico | skill `lemo-opuscar` |
| B-roll com origem/licença | skill `get-brolls` (cliente: só fontes livres) |
| Recorte de pessoa · cor · limpeza de áudio | `video-tools/scripts/recortar.py`, `corrigir_cor.py`, `limpar_audio.py` |
| Boca de personagem | Rhubarb (`D:\PEFORMAKE\_ferramentas\rhubarb\…\rhubarb.exe`) |

## 5. Som
- Um som por evento, 1–2 quadros antes; música abaixa nos SFX; silêncio antes da frase forte → `estilos/sound_design.md`.
- Skill `real-sfx` (deixas no quadro exato) → Earshot confere → `scripts/openverse_audio.py` completa (com licença).
- Final em −14 LUFS.

## 6. Entregar
- **Corte bruto 720p para o Italo aprovar antes de finalizar** (skill `edicao-cliente` §4.5).
- Animações em arquivos separados (ProRes 4444 alfa) + projeto editável no Premiere (XML) + vídeo final.
- Checklist: falas completas, nada vencido, uma voz por vez, imagem = o que é dito, sem cara de IA
  (`receitas_estilos.md` §4), termina na frase que fecha.
