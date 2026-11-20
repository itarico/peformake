---
name: clareza-video
description: Cria vídeo explicativo animado estilo 3Blue1Brown com Manim (padrão vertical 9:16), com roteiro no método ASD-STE100 a 80%. Use quando o usuário pedir vídeo explicativo, animação didática, estilo 3Blue1Brown ou Manim.
---

# Clareza — Vídeo estilo 3Blue1Brown (Manim + ASD-STE100 a 80%)

Vídeo explicativo curto, com fundo escuro, poucos elementos e animação que revela a ideia aos poucos. É o formato mais trabalhoso: trabalhe em etapas.

## Etapas

Quando o usuário estiver presente, mostre o resultado de cada etapa e espere o ok antes de seguir. Se não estiver, siga e diga no topo quais escolhas fez.

### 1. Roteiro

- Duração: 60 a 90 segundos (cerca de 150 a 220 palavras de fala; ~2,5 palavras por segundo).
- Estrutura: gancho (1 frase) → problema → ideia central em 2 a 4 passos → fechamento com o resultado.
- Uma ideia por cena. Cada cena tem: texto da narração + o que aparece na tela + duração.
- Texto no ASD-STE100 a 80%: frases de até 20 palavras, voz ativa, verbo simples, um termo por conceito (o mesmo na fala e na tela), palavra concreta, número em vez de adjetivo, no máximo 1 analogia. Nunca mude um fato para simplificar.

### 2. Formato

Padrão vertical 9:16 para Reels e TikTok. Use 16:9 só se pedirem.

### 3. Setup (uma vez por sessão)

Na nuvem (Linux):

```bash
apt-get install -y -q libpango1.0-dev
pip install -q --break-system-packages manim
```

Neste PC (Windows): `pip install manim` e ffmpeg (`winget install Gyan.FFmpeg`).

### 4. Animação (script.py)

```python
from manim import *
# Revisão: 480x854 a 15 fps. Final: 1080x1920 a 30 fps.
config.pixel_width = 480
config.pixel_height = 854
config.frame_width = 9
config.frame_height = 16
config.frame_rate = 15

class Cena1_Gancho(Scene):
    def construct(self):
        titulo = Text("Por que o buraco negro é preto?", font_size=40)
        self.play(Write(titulo), run_time=2)
        self.wait(1)
```

Regras:

- Uma classe por cena (`Cena1_Gancho`, `Cena2_Problema`...).
- `Text` para texto em português (acentos funcionam). `MathTex` só para fórmula.
- Texto na tela curto: até 6 palavras por elemento. A explicação longa vai na fala.
- `run_time` explícito em todo `play()`; a soma das animações e `wait()` de cada cena bate com a duração da fala.
- No vertical, use a altura: empilhe elementos de cima para baixo e mantenha margem nas bordas (a interface do Reels cobre a parte de baixo e a direita).
- Uma cor de destaque para o conceito principal, a mesma em todas as cenas.

### 5. Render

```bash
manim -ql script.py Cena1_Gancho Cena2_Problema ...   # revisão rápida
```

Junte as cenas na ordem com ffmpeg (arquivo `lista.txt` com `file 'caminho.mp4'` por linha):

```bash
ffmpeg -f concat -safe 0 -i lista.txt -c copy video.mp4
```

Para o final, troque a configuração para 1080x1920 a 30 fps e renderize com `-qh`.

### 6. Narração

Entregue `narracao.txt`: uma linha por cena, com a duração. Opções para o áudio:

- O próprio usuário grava no celular, seguindo o tempo de cada cena.
- Um TTS que o usuário já tenha (ElevenLabs, Chatterbox local).

Não prometa narração automática se a sessão não tiver ferramenta de voz. Se o usuário mandar o áudio, junte:

```bash
ffmpeg -i video.mp4 -i narracao.mp3 -c:v copy -c:a aac -shortest final.mp4
```

### 7. Entrega

Envie o `.mp4` com SendUserFile e o `script.py` junto. Antes, abra um quadro do vídeo (extraia com ffmpeg e veja) para conferir se nada saiu cortado ou sobreposto.

## Checagem antes de entregar

- O roteiro cabe em 60 a 90 segundos?
- Algum texto na tela passa de 6 palavras?
- Os termos da fala e da tela são os mesmos?
- Algo ficou fora da tela ou atrás da interface do Reels?

Referências: asd-ste100.org (padrão oficial), amanndev.com/asd-ste100 (método 80%), github.com/yusuke710/manim-skill (skill de Manim, MIT).
