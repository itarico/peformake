---
name: shorts-do-longo
description: Transforma um vídeo longo do YouTube em 5 a 10 Shorts verticais (9:16) que funcionam sozinhos e puxam para o vídeo completo. Escolhe os trechos pela força da ideia, reescreve o gancho dos 2 primeiros segundos, corta e reenquadra com ffmpeg, recorta a legenda e entrega título e descrição de cada Short. Use quando o usuário pedir Shorts, cortes, "picotar o vídeo", "transformar em Reels/TikTok", clipes, vídeos curtos do longo, ou depois de publicar ou finalizar um vídeo longo.
---

# Shorts do longo

Script: `~/.claude/skills/shorts-do-longo/scripts/cortar_shorts.py` (roda com qualquer Python; precisa do ffmpeg no PATH).
Saída: `<pasta do vídeo>/shorts/`

## Por que
Shorts trazem descoberta e inscritos. O vídeo longo traz horas assistidas, que são a meta do Programa de Parcerias. Cada Short é uma porta para o longo: entrega uma ideia completa e deixa um motivo para assistir ao vídeo inteiro.

## Fluxo

### 1. Achar os trechos
Fontes, em ordem de preferência:
1. A seção "Shorts derivados" do roteiro (`roteiro-retencao`).
2. `tempos.json` e `narracao.srt` da `narracao`, para achar o tempo exato de cada frase.
3. Vídeo já pronto sem roteiro: `ler-video` com `--so-audio` gera o `.srt`.

Um bom trecho tem 20 a 60 s, uma ideia só (uma revelação, uma contradição, um "por que"), sentido sem o resto do vídeo e um fim que pague o gancho. Evite trecho que depende de "como eu disse antes".
Escolha de 5 a 10 e mostre a lista (início, fim, ideia) antes de cortar.

### 2. Gancho dos 2 primeiros segundos
O começo do trecho raramente é um gancho. Para cada Short, escreva:
- **Frase de gancho** (até cerca de 12 palavras), a pergunta ou contradição do trecho: "O livro mais famoso da China estava ao contrário."
- Se a primeira frase do trecho já serve, use-a. Se não, narre a frase nova com a `narracao` (mesma voz do vídeo) e coloque-a no início na edição.
- **Texto na tela** nos primeiros 2 s (até 6 palavras).

### 3. Cortar
Escreva `cortes.json`:
```json
[{"nome": "tao-ao-contrario", "inicio": "3:12.4", "fim": "3:58"}]
```
```bash
python ~/.claude/skills/shorts-do-longo/scripts/cortar_shorts.py "<video.mp4>" "<cortes.json>" --saida "<pasta>/shorts" --srt "<narracao.srt>" --modo blur
```
- `--modo blur` (padrão): o vídeo 16:9 inteiro no centro, com fundo desfocado. Serve para diagrama, mapa e texto na tela.
- `--modo crop`: corte central em tela cheia. Serve para cena cinematográfica com o assunto no centro.
- Saída: `<nome>.mp4` (1080x1920, 30 fps, áudio em -14 LUFS) e `<nome>.srt` com o tempo zerado.

### 4. Acabamento
Passe cada corte pela `edicao-motion` para legenda animada, texto do gancho e zoom de ênfase. Se o gancho é uma frase nova narrada, ela entra aqui.

### 5. Publicar
Para cada Short: título (até 60 caracteres, a pergunta ou revelação), 2 ou 3 hashtags do tema e o vídeo longo como **vídeo relacionado** no YouTube Studio, que é o link clicável do Short. Na descrição, a frase "Vídeo completo:" e o link.
Espalhe os Shorts: de 1 a 2 por dia depois do longo, não todos no mesmo dia.

## Regras
- Short de no máximo 3 minutos (o script avisa). Até 60 s costuma ser mais seguro para retenção.
- O Short não pode prometer o que só o longo entrega sem pagar nada: entregue a ideia e convide para o aprofundamento.
- Música da `audio-video` (ACE-Step) evita reivindicação de direitos autorais.
