# Pesquisa 2 — Quem monetiza vídeo com Claude + plano de 90 dias (07/11/2026)
Fonte: agente de pesquisa. Números de terceiros, em geral autodeclarados ou patrocinados por ferramenta — nada auditado.

## Achado principal
Não há matéria de editor/agência pequena dizendo quanto fatura editando com Claude. O dinheiro aparece em:
(1) quem vende a ferramenta (Higgsfield ~US$700M ARR; Remotion ~US$660k/ano estimado; Blotato),
(2) quem ensina em público e monetiza audiência/comunidade/consultoria (Sabrina Ramonov, Nate Herk, Julian Goldie, Calvin Hia).
Padrão: **ensinar em público → isca grátis → comunidade/consultoria/recorrência.** O Claude derruba custo; o dinheiro vem de distribuição + oferta recorrente.

## Casos (resumo)
- Sabrina Ramonov/Blotato — 500M+ views em ~1 ano; grava 21 peças/semana num dia; clientes pagantes vêm do YouTube longo + e-mail.
- Nate Herk — 1,1M inscritos; comunidade Skool US$94–129/mês, ~3k pagantes.
- Julian Goldie — 432k inscritos; Remotion: "10 intros de marca para clientes numa tarde".
- Calvin Hia — Reels com palavra-chave → 46 automações comentário→DM → 3.000+ leads, US$12k+ em 30 dias (autodeclarado).
- Create With (UK) — ~600 vídeos de marca com Claude Code + Remotion + Supabase, "zero tempo de edição".
- Brooke Lacey — Claude Code + FFmpeg + Whisper: 5 min de celular → anúncio de 15 s com cortes, face tracking, legenda.
- BR: Rafa Voss (curso ClaudePRO; video-use + HyperFrames), Inteligência Aplicada (Remotion + pasta de marca + Whisper), Ratos de IA, Durval Simardi (curso, repo MIT com ~30 skills: WhatsApp, aprovação de cliente, custo).
- NÃO usar como prova: "Zero to US$13.457/mês" (projeção patrocinada pela Higgsfield).

## Workflows replicáveis no PC fraco (top 5)
1. **Playbook Andreas Fuchs** — whisper.cpp + ffmpeg + HyperFrames; 100% local e grátis além do Claude; 16:9 e 9:16 com checagem por etapa.
2. **auto-editor / cut-video** (corte de silêncio) + faster-whisper local.
3. **Legenda animada + pasta brand/ por cliente** (fontes, cores, logo) → escala sem cara de IA.
4. **claude-shorts** — live/palestra/entrevista → 8–15 cortes (forte p/ político).
5. **Pacote final** estilo claude-youtube-editor só com partes grátis (títulos, capas HTML, SFX CC0).
Evitar no PC fraco: Resolve/Premiere pesados via MCP, OpenMontage (AGPL, pesado). Higgsfield só com crédito pago pelo cliente.

## Repos citados (estrelas 07/11/2026)
hyperframes 80,5k Apache · remotion 71,5k (grátis ≤3 pessoas) · video-use 30,7k MIT (usa ElevenLabs) · OpenMontage 78k AGPL · claude-code-video-toolkit 2,5k MIT · claude-video-vision 1,5k MIT · claude-shorts 350 MIT · cut-video 119 MIT · auto-editor 5,8k Unlicense · whisper.cpp 55k MIT · claude-youtube-editor 369 MIT · davinci-resolve-mcp 4k MIT (Resolve grátis só até 21.0.x) · awesome-claude-video-skills (índice com nota de segurança).

## Modelos de monetização para a Performake/Ellcazo
1. **Assinatura mensal de Reels editados + motion** (comércio, serviços, gastronomia).
2. **Pacote político por cortes** (lives/agendas → 30–60 cortes/mês; contrato + regra eleitoral; próxima eleição municipal 2028).
3. **"Como a gente faz" em público + produto de entrada** (skill/template/workshop para agências do NE).

## Plano de 90 dias (preços = sugestão, não fonte)
- **Sem 1–4 (máquina e prova):** instalar workflow 1 + faster-whisper + auto-editor; skill "corte-padrão-Ellcazo" + CLAUDE.md de estilo; 3 pastas brand/ demo (restaurante, clínica, político); 10 reels-portfólio com clientes atuais; medir tempo/reel antes×depois; postar 3x/semana "antes/depois" no perfil da agência (lote num dia).
- **Sem 5–8 (oferta e clientes):** "Reels Recife" — Básico R$600–900/mês (8 reels) · Pro R$1.200–1.800/mês (12 reels + 1 motion + 3 capas) · Avulso R$80–150/reel · Político R$2.500–5.000/mês (40 cortes). Captação: 50 negócios com anúncio ativo e criativo fraco (Biblioteca de Anúncios) + reel-amostra com a marca de cada um + comentário→DM com isca. Meta: 3–5 clientes (1 político).
- **Sem 9–12 (escala):** claude-shorts no pacote político; pacote final para todos; link de aprovação do cliente; publicar "Como editamos 40 reels/mês com Claude num PC de 8 GB"; lista de espera de workshop R$197–497; revisar preço pelo tempo medido.
- **Métricas semanais:** tempo/reel (−50% até sem 8), rodadas de ajuste (≤1,5), resposta da prospecção (≥10%), fechamento (≥20%), MRR, margem por cliente, views/DMs/leads do perfil, custo de ferramentas (≤ plano Claude).
