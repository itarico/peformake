---
name: referencias-instagram
description: Baixa e estuda Reels de referência do Instagram (e TikTok/YouTube Shorts) de graça, sem login, com yt-dlp e instaloader — vídeo, capa, métricas, legenda do post, cortes, ritmo, SFX, folha de planos e transcrição — para aprender padrões de edição e aplicar nos vídeos dos clientes na identidade de cada um. Também diz onde ver o desempenho real das contas dos clientes (conectores Meta, Windsor.ai). Use quando o usuário mandar um link de Reel/TikTok/Short como referência, pedir "analisa esse vídeo", "estuda o estilo desse perfil", "baixa os reels do @fulano", "o que está dando certo no nicho", "quero editar nesse padrão" ou "como estão os reels do cliente".
---

# Referências do Instagram → padrões de edição

Ferramentas no venv `~/.video-venv` (revisadas em 07/11/2026; só falam com o próprio Instagram/TikTok/YouTube):
**yt-dlp** (Unlicense), **instaloader** (MIT, só metadados), faster-whisper, PySceneDetect, FFmpeg.
Só conteúdo **público**, sem login; é material de **estudo** — nunca repostar nem usar trechos, música,
arte ou narração no vídeo do cliente. Copie a LÓGICA (ritmo, linguagem), nunca o conteúdo.
FFmpeg no PATH: `source <pasta do job>/env.sh` (ex.: `D:\ELLCAZO\JOBS\2026\NOV\DISALP\PROJETOS\TRABALHO\env.sh`).

## Dois scripts (use o que servir)
**A) `referencia_reel.py`** — baixa 1+ vídeos ou os últimos N Reels de um perfil e mede o básico.
```bash
bash video-tools/bin/vpy video-tools/scripts/referencia_reel.py "https://www.instagram.com/reel/XXXX/" [--transcrever]
bash video-tools/bin/vpy video-tools/scripts/referencia_reel.py --perfil "https://www.instagram.com/<perfil>/reels/" --max 5
```
Saída em `D:\PEFORMAKE\REFERENCIAS\<Rede>\<autor>\<id>\`: `video.mp4`, `capa.jpg`, `info.json`, `cortes.csv`,
`folha.jpg` (1 quadro por plano) e `analise.md`.

**B) `analisar_referencia.py`** — análise mais funda de um Reel (ou de um .mp4 já baixado, lê o `.info.json` ao lado):
```bash
bash video-tools/bin/vpy video-tools/scripts/analisar_referencia.py "https://www.instagram.com/reel/XXXX/"
```
Mede também: quadros do gancho (0 / 0,5 / 1 / 2 / 3 s), **transientes de áudio (SFX/batidas) e % de cortes
que caem num pico**, palavras/s, % do tempo com fala, texto do gancho; transcreve com o Whisper LOCAL
(`~/.video-models/whisper-small` — o download pelo Hugging Face trava nesta máquina).
Saída: `video-tools/referencias/<canal>_<id>/analise.md` + `dados.json` (git) e mídia em
`D:\FERRAMENTAS\referencias\<canal>_<id>\` (`frames/`, `folha_contato.jpg`; mude com `REF_MIDIA`).
Exemplo completo e preenchido: `video-tools/referencias/earn.edits_DfZoBRQuHwq/analise.md`.

**C) `perfil_instagram.py`** — o que mais performa num perfil público (curtidas, comentários, views), via instaloader:
```bash
bash video-tools/bin/vpy video-tools/scripts/perfil_instagram.py earn.edits --max 12 --so-reels
```
CSV/JSON em `video-tools/referencias/_perfis/<perfil>.csv`, ordenado por curtidas → rode A ou B nos 2–3 primeiros.

**Risco de bloqueio (sem login):** o Instagram responde 401/429 ("Please wait a few minutes") se abusar.
Até 12 posts por vez (máx. 30), pausa de 3–6 s, 1 perfil por vez, nunca em loop/agendado. Bloqueou → espere
30–60 min. Nunca logar com a conta do Italo ou de cliente nessas ferramentas.

## Analisar (o trabalho de verdade)
1. Abra a folha de planos/contato e alguns quadros (Read) — os primeiros 3 s com atenção.
2. Preencha a seção qualitativa do `analise.md`: gancho, tipografia/legenda (família, peso, caixa, entrada,
   posição), transições, cor/textura, som (música, SFX × cortes), estrutura; o que copiar a **lógica** e o que não.
3. Feche com **3 ideias concretas para os clientes, na identidade de cada um** (`video-tools/clientes/*.md`)
   e, se der, qual componente do kit pro (`video-tools/remotion/src/pro/`) reproduz aquilo.
4. Com 3+ referências do mesmo estilo, consolide em `video-tools/estilos/<nome>.md` (receita com tempos) e,
   se for estilo do Italo, resuma em `video-tools/clientes/_estilo_referencias.md`.
5. Compare métricas entre posts do mesmo perfil para separar o que **dá certo** do que não dá.

## Desempenho real dos clientes (API oficial, não scraping)
Curtida pública não mostra alcance, retenção nem salvamento. Para as contas dos clientes:
- **Conectores Meta "ADS", "ADS- F5", "ADS - ACÀCIA"**: `ads_get_ig_accounts` (contas IG ligadas) →
  `ads_get_ig_media` (posts/Reels com alcance, plays, curtidas, comentários, salvamentos, compartilhamentos).
  Cada conector vê um Business Manager diferente — se a conta não aparecer num, tente os outros.
- **Windsor.ai** (`get_connectors` → `get_fields` → `get_data`, fonte `instagram`): séries históricas e
  comparação entre períodos/contas; bom para relatório mensal.
- Cruze os Reels do cliente com maior retenção/compartilhamento com a análise das referências → pauta e edição.
