# Ferramentas grátis e locais — inventário (07/11/2026)

Tudo abaixo roda no PC da Performake, sem crédito pago. Antes de instalar, o código de cada pacote de
terceiros foi lido procurando chamadas de rede/telemetria (resultado na coluna "Rede").
PC: i7, 8 GB RAM, MX230, C: com pouco espaço → modelos e downloads ficam no **D:\FERRAMENTAS\**.

## 1. Instalado e testado

| Ferramenta | Para quê | Licença | Rede | Onde / como |
|---|---|---|---|---|
| **Kokoro-82M** (pesos) | narração pt-BR realista, CPU | Apache 2.0 | nenhuma (offline) | `D:\FERRAMENTAS\kokoro\kokoro-v1.0.int8.onnx` + `voices-v1.0.bin` |
| **kokoro-onnx** 0.6.1 | roda o Kokoro no onnxruntime (sem torch) | MIT | nenhuma (só textos de ajuda com URL) | venv `~/.video-venv` |
| espeak-ng (espeakng-loader 0.2.4) + phonemizer 3.6 | fonemas pt-BR para o Kokoro | GPL-3.0 | nenhuma | venv. GPL só obriga quem DISTRIBUI o software; o áudio gerado é livre para uso comercial |
| soundfile 0.14 | gravar WAV | BSD-3 | nenhuma | venv |
| **yt-dlp** 2026.10.26 | baixar Reels/TikTok/Shorts públicos + métricas visíveis | Unlicense | só instagram.com / cdninstagram (o alvo) | venv |
| **instaloader** 4.16 | listar posts de perfil público (metadados) | MIT | só instagram.com | venv |
| Archivo (fonte variável) | fonte do kit pro, peso 100–900 e largura 62–125 | OFL 1.1 | — | `remotion/public/fonts/` (local, sem CDN) |
| @remotion/three, @remotion/noise, @remotion/lottie, @remotion/motion-blur 4.0.541 + three, @react-three/fiber 8, lottie-web | 3D, ruído, Lottie, motion blur no Remotion | Remotion License* / MIT | nenhuma no render | `video-tools/remotion` |

\* **Remotion**: grátis para pessoa física e empresas com até 3 funcionários; acima disso exige "Company
License" paga. A Performake hoje se enquadra no grátis — rever se a equipe crescer.

### Scripts e skills novos
| Arquivo | O que faz |
|---|---|
| `scripts/narrar.py` + skill `narracao` | texto/roteiro → WAV 48 kHz 24 bits; vozes `pf_dora` (fem.), `pm_alex` (masc.), `pm_santa` (masc. grave); velocidade, mistura de vozes, trocas de pronúncia por cliente (`clientes/<cliente>_pronuncia.txt`), `--lufs -16` |
| `scripts/analisar_referencia.py` | baixa e mede um Reel: cortes, plano médio, gancho 0–3 s, SFX × cortes, LUFS, fala/s, transcrição (Whisper local), folha de contato → `referencias/<canal>_<id>/analise.md` |
| `scripts/perfil_instagram.py` | últimos N posts de um perfil público ordenados por curtidas → `referencias/_perfis/<perfil>.csv` |
| skill `referencias-instagram` | junta os scripts acima + o `referencia_reel.py` da sessão CENTRAL e explica conectores Meta/Windsor |
| `remotion/src/pro/` + `remotion/render-pro.sh` | kit de motion "pro" por marca (ver seção 3) |

### Testes feitos (07/11/2026)
- **Narração:** 3 amostras em `Desktop\FERRAMENTAS_TESTE\` (`narracao_feminina_pf_dora.wav` — Disalp,
  `narracao_masculina_pm_alex.wav` — MF, `narracao_masculina_grave_pm_santa.wav` — estilo documentário).
  Transcritas de volta pelo Whisper: ~100% das palavras certas. Tropeços: "Camaragibe" → resolvido com troca
  de pronúncia. Velocidade: ~2 s de CPU por segundo de áudio.
- **Instagram:** Reel de referência do Italo (@earn.edits, DfZoBRQuHwq) baixado sem login; análise completa em
  `referencias/earn.edits_DfZoBRQuHwq/analise.md` (9 cortes/37 s, 67% dos cortes no pico de SFX, narração em
  89% do tempo, feito em After Effects). `perfil_instagram.py earn.edits --max 4` funcionou sem login.
- **Motion:** ver seção 3.

## 2. Instagram: o que dá e o que não dá de graça
- **Referências públicas:** yt-dlp (vídeo + legenda + curtidas/comentários; views nem sempre aparecem sem
  login) e instaloader (lista do perfil). **Risco de bloqueio** sem login: 401/429 se abusar → até 12 posts por
  vez, pausa 3–6 s, 1 perfil por vez, nunca agendado; bloqueou, espere 30–60 min. Nunca logar com conta do
  Italo/cliente nessas ferramentas.
- **Contas dos clientes (desempenho real):** conectores Meta já conectados no Claude — "ADS", "ADS- F5",
  "ADS - ACÀCIA" → `ads_get_ig_accounts` e `ads_get_ig_media` (alcance, plays, salvamentos, compartilhamentos)
  — e **Windsor.ai** para séries históricas. Isso é API oficial, não scraping.

## 3. Motion nível After Effects

### (a) After Effects — NÃO vai ser instalado (decisão do Italo, 07/11/2026)
O Italo quer que o Claude faça motion/efeitos nível AE **por código**. Caminho escolhido: o kit Remotion
"pro" (abaixo) + filtros SVG + shaders GLSL + scripts Python de rastreamento e recorte, documentado na skill
**`motion-pro`** (tabela "recurso do AE → componente do kit").
- O MCP `ishu86/after-effects-mcp` foi revisado mesmo assim (MIT; ponte só por arquivos JSON em
  `Documentos\ae-mcp-commands`, sem rede; o painel executa ExtendScript com `eval` e o instalador liga
  `PlayerDebugMode`). Clone em `D:\FERRAMENTAS_DL\aemcp` caso um dia mude de ideia — não instalado.
- O MCP do Premiere já instalado aceita .mogrt (`import_mogrt`), útil para templates Mixkit sem AE.

### (b) Templates profissionais grátis
- **Mixkit** (mixkit.co/free-premiere-pro-templates e /free-after-effects-templates): títulos, transições,
  lower thirds. Licença "Mixkit Video Templates Free License": uso comercial e em trabalho para cliente
  permitido dentro do vídeo final; proibido revender/redistribuir o template em si. Não há atribuição
  obrigatória. (A página de licença só abre por modal; confira o selo de licença na página de cada item.)
  Os de Premiere (.mogrt) funcionam sem After Effects. Não baixei nenhum agora (internet lenta) — baixe sob
  demanda para `D:\FERRAMENTAS\templates\mixkit\` e recolora com as cores da marca.
- **LottieFiles** grátis (Lottie Simple License, uso comercial ok) → `src/pro/LottiePro.tsx` (com recolorir
  pela marca).

### (c) Kit Remotion "pro" — `video-tools/remotion/src/pro/`
Entrada própria (`src/pro/index.ts`), sem tocar no `src/Root.tsx` das sessões de cliente. Toda composição
recebe `cliente: disalp | mf | mfBlack | tlm` (cores, fonte, largura, itálico, grão vêm de `marca.ts`).

| Composição | O que é |
|---|---|
| `TituloCinetico` | gancho 1–3 linhas ENORMES centralizadas; cada palavra sobe por máscara, sai do desfoque, tracking fecha, mola pesada; palavra-chave na cor de destaque com brilho passando; extrusão "documentário" (relevo) ou limpo; câmera em push-in; saída por máscara |
| `LegendaPro` | legenda 1–3 palavras, palavra entra por máscara quando é falada + pop curto; destaques na cor da marca; contorno + sombra, sem caixa; lê o `.captions.json` do `transcrever.py` |
| `LowerThirdPro` | linha de destaque desenha do centro, nome sobe acima e cargo desce abaixo por máscara, sombra difusa; centralizado (ou à esquerda) |
| `TransicaoWipe` / `TransicaoWhip` / `TransicaoLightLeak` | camadas de transição para pôr sobre o corte (meio do clipe = corte): painéis da marca (diagonal ou chevron MF), whip com rastros + flash, vazamento de luz quente tingido pela marca (+ film burn) |
| `CTA3D` | placa 3D real (three.js) com verniz e luz passando, entra girando com mola; texto na fonte da marca |
| `GrainOverlay` | grão de filme animado (muda a cada 2 frames), poeira/fios, vinheta, flicker — com alpha |
| `LottiePro` | Lottie sincronizado ao frame, opcionalmente recolorido |
| `Vitrine` (`Pro-Vitrine`) | abertura completa de exemplo empilhando tudo (fundo GLSL, câmera 2,5D, texto por letra, glow, impacto, traço, bokeh, grão) |

**Motor de efeitos `src/pro/fx/`** (≈ After Effects):
| Arquivo | Equivale a |
|---|---|
| `efeitos.tsx` | Glow (`Brilho`), RGB Split (`Aberracao`), Turbulent Displace (`Turbulencia`), `wiggle()`/`Tremor`/`impacto`, Motion Blur (`DesfoqueMov`) |
| `camera.tsx` | câmera 3D + camadas 3D com profundidade de campo (`Cena3D`, `Camada`), keyframes com curva (`chaves`), movimentos prontos |
| `texto.tsx` | Text Animator com range selector, por letra/palavra/linha, entrada e saída (`AnimadorTexto`) |
| `traco.tsx` | Shape Layer + Trim Paths (`TracoAnimado`: círculo, seta, sublinhado, moldura, check) |
| `composicao.tsx` | tracking aplicado (`SeguirPonto`), track matte "texto atrás da pessoa" (`TextoAtrasDaPessoa`), vídeo base com push-in (`VideoBase`) |
| `shader.tsx` | GLSL: Fractal Noise/neblina, Light Rays, gradiente vivo da marca, Film Burn (`ShaderCamada`) |
| `scripts/rastrear.py` | Tracker do AE (OpenCV, fluxo óptico + escala/rotação) → JSON para `SeguirPonto` |

Render (ProRes 4444 com alpha, para trilha própria no Premiere):
```bash
cd video-tools/remotion
bash render-pro.sh Pro-TituloCinetico "D:/.../MOTION/titulo.mov" --props='{"cliente":"mf","linhas":["PAROU?","A GENTE CONSERTA"],"destaques":["conserta"]}'
```
Studio para ajustar ao vivo: `npx remotion studio src/pro/index.ts`.

## 4. O que ficou de fora e por quê
| Ferramenta | Motivo |
|---|---|
| XTTS-v2, F5-TTS | pesos com licença NÃO comercial (CPML / CC-BY-NC) |
| Edge-TTS | usa o serviço online da Microsoft sem contrato; termos não cobrem uso comercial |
| Piper | projeto ativo virou GPL (piper1-gpl); vozes pt-BR (faber/cadu/jeff, só masculinas) têm dataset CC0 mas foram treinadas a partir da voz `lessac` (licença restrita) → cadeia de licença não limpa; `edresson` (CC BY 4.0) é "low" e robótica. Kokoro já cobre fem./masc. melhor |
| Kokoro pacote oficial (`kokoro` + torch) | ~1 GB de torch; o `kokoro-onnx` usa o onnxruntime que já existia |
| Kokoro fp32/fp16 | 310/170 MB com internet lenta; o int8 (88 MB) passou no teste de inteligibilidade |
| After Effects | decisão do Italo: motion por código (skill `motion-pro`); além disso C: cheio e 8 GB de RAM |
| Login no Instagram (instaloader/yt-dlp com cookies) | risco de bloquear a conta do Italo/cliente |

## 5. Sugestões (próximos passos, todos grátis)
- **MCPs/conectores:** abrir o painel do MCP do
  Premiere (`Janela > Extensões > MCP Bridge`) para ligar o `premiere-pro` já instalado; Figma (já autenticável
  no plugin `marketing`) para puxar grafismos das marcas; conectores Meta/Windsor para métricas.
- **Plugins grátis de Premiere/AE:** Motion Bro (gerenciador de presets, grátis com packs pagos — usar só os
  grátis), "Premiere Composer" (Mister Horse, grátis), Bodymovin (exporta AE → Lottie, MIT).
- **Locais/open source:** Real-ESRGAN ncnn-vulkan (upscale, BSD-3, roda na MX230), RIFE ncnn (slow motion
  por interpolação, MIT), Demucs (separar voz/música, MIT — pesado no CPU, usar em trechos curtos),
  rembg já instalado (recorte), Natron (compositor nodal, GPL) e Blender (3D, GPL; o vídeo gerado é livre).
- **Música/SFX:** já existem a skill `sound-effects` (Kenney CC0) e a lista Mixkit; para trilhas sem crédito
  também YouTube Audio Library (baixar manualmente, conferir "atribuição não necessária").
