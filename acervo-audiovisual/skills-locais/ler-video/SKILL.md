---
name: ler-video
description: Transcreve áudio de graça (Whisper local na GPU) e assiste vídeo completo, juntando fala com o tempo e quadros ao longo de todo o vídeo, não só um print. Use quando o usuário mandar áudio, vídeo, Reels, TikTok, YouTube, link de vídeo, gravação de reunião ou nota de voz e pedir para transcrever, legendar, resumir, analisar, "ver o vídeo", "assistir", "ler o vídeo" ou extrair roteiro/ganchos de um vídeo.
---

# Ler vídeo e transcrever áudio (grátis, local)

Ferramenta: `D:\ITALO\CLAUDE\IA-LOCAL\ler_video.py` com o ambiente `venv-transcricao` (faster-whisper `large-v3-turbo` na GTX 1650, yt-dlp, ffmpeg). Nada é enviado para API paga.

## Rodar

```bash
PYTHONIOENCODING=utf-8 /d/ITALO/CLAUDE/IA-LOCAL/venv-transcricao/Scripts/python /d/ITALO/CLAUDE/IA-LOCAL/ler_video.py "<arquivo ou URL>" --saida "<pasta>" --idioma pt
```

- Entrada: caminho local (mp4, mov, mp3, m4a, ogg, wav, opus do WhatsApp...) ou URL (YouTube, Instagram, TikTok e outros sites aceitos pelo yt-dlp).
- `--saida`: use a pasta de rascunho da sessão, a menos que o usuário peça outro lugar.
- `--idioma`: `pt` quando o conteúdo é em português; omita para detectar sozinho.
- `--max-quadros`: padrão 40. Use 15 a 25 para Reels curtos e até 60 para vídeos longos.
- `--so-audio`: só transcreve, sem quadros (nota de voz, podcast).
- `--modelo`: `large-v3-turbo` (padrão, melhor). Use `small` se a GPU estiver ocupada ou faltar memória.
- Vídeo longo (mais de 10 min): rode em segundo plano.
- Instagram ou TikTok privado, ou pedindo login: avise o usuário e peça o arquivo baixado. Não use cookies nem senha dele.

## Arquivos gerados

- `roteiro.md`: linha do tempo, com cada quadro, o tempo dele e a fala daquele trecho. **Leia este primeiro.**
- `quadros/`: imagens com o tempo no nome (`00012.40s.jpg`), tiradas a intervalos regulares e nas trocas de cena.
- `transcricao.txt`: o texto corrido.
- `transcricao.srt`: a legenda pronta, com os tempos.

## Como "assistir" de verdade

1. Leia o `roteiro.md` inteiro.
2. Abra **todos** os quadros com Read, em ordem. Se forem muitos, abra pelo menos 1 a cada 3 e todos os das trocas de cena.
3. Junte o que se vê (texto na tela, pessoas, produto, cenário, cortes, legenda queimada) com o que se fala, no mesmo tempo.
4. Responda ao que o usuário pediu, citando o tempo (ex.: "aos 0:12, ..."). Para análise de Reels, cubra: gancho dos primeiros 3 s, ritmo dos cortes, texto na tela, CTA e o que trocar.

## Limites

- O Whisper erra nomes próprios e marcas. Revise antes de entregar uma legenda.
- O que acontece entre dois quadros não aparece. Se o detalhe importa, rode de novo com mais `--max-quadros`.
- Música sem fala: a transcrição sai vazia ou com lixo. Diga isso, não invente letra.
