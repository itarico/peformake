# Animações de legenda: movimento, velocidade e ritmo

Ferramenta: `scripts/animar.py` (gera .mov com alfa). Listar: `python animar.py --animacoes` e `python animar.py --curvas`.
Durações em quadros a 30 fps; o script converte para o fps da sequência e multiplica pela velocidade.
Valores de partida vindos da pesquisa de 27/11/2026 (`pesquisa-2026-11.md`); os marcados ali como [CONFIRMAR] foram ajustados no teste visual, não medidos de vídeo real.

## 1. Catálogo (nome no script, o que faz, quando usar)

| Animação | Unidade | Movimento | Quando usar |
|---|---|---|---|
| `corte` | bloco | entra e sai seco | Padrão SN/BRIO; quando o ritmo vem do corte de vídeo |
| `fade` | bloco | opacidade 0 > 1 em 4 q, easeOutQuad | Institucional, premium, Apple style |
| `pop` | bloco | escala 70% > 100% em 6 q, easeOutBack | Reels comum, uso geral |
| `hormozi_bloco` | bloco | 80% > 110% > 100% em 8 q (pico no q4) | Vendas, negócio, anúncio com fala; 1 palavra em cor por bloco |
| `punch` | bloco | 125% > 100% em 5 q, easeOutExpo | Número, preço, palavra de impacto |
| `anticipacao` | bloco | recua e passa do ponto (easeInOutBack) em 10 q | Revelação, antes e depois |
| `glitch` | bloco | tremida horizontal + pisca em 5 q (degraus) | Tech, games, virada de assunto |
| `wipe` | bloco | revela o bloco da esquerda para a direita em 8 q | Frase-tese, citação |
| `slide_esquerda` | bloco | entra da direita 90 px em 8 q, easeOutQuart | Lista, passos |
| `pop_palavra` | palavra | cada palavra pula (50% > 100%), stagger 2 q | Talking head com energia |
| `slide_cima` / `slide_baixo` | palavra | 40 px + fade em 7 q, stagger 2 q | O mais versátil, storytelling |
| `blur_slide` | palavra | desliza 60 px com desfoque de movimento em 6 q | Hype, néon |
| `desfoque` | palavra | desfoque 14 > 0 + escala 108% > 100% em 6 q, stagger 3 q | "Legenda com foco", premium calmo |
| `bounce` | palavra | cai 70 px e quica em 10 q | Food, humor, infantil |
| `elastico` | palavra | escala 0 > 100% com mola em 16 q | Gancho, CTA; usar pouco |
| `rotacao` | palavra | gira -12 graus + pop em 7 q | Humor, descontraído |
| `squash` | palavra | amassa e estica mantendo volume em 9 q | Palavra-pico com peso, cartoon |
| `palavra_a_palavra` | palavra | cada palavra entra no tempo da fala (pop 4 q) | Retenção máxima |
| `hormozi` | palavra | palavra a palavra sincronizada + punch 130% > 100% em 4 q | Alcance, coach, vendas |
| `karaoke` | palavra | frase inteira; palavra falada troca de cor | Tutorial, educação |
| `karaoke_pop` | palavra | karaokê + palavra falada 112% | Estilo Hormozi com frase inteira |
| `karaoke_caixa` | palavra | caixa colorida corre atrás da palavra falada | Submagic/CapCut "highlight", alta retenção |
| `pulso_palavra` | palavra | palavra falada pulsa 100 > 118 > 100% em 8 q | Ênfase sem trocar cor |
| `dois_tons` | palavra | frase em cinza, cada palavra acende em branco ao ser dita e fica acesa | Ali Abdaal, educação calma, B2B |
| `maquina` | letra | máquina de escrever, 1 letra por quadro | Documental, mistério, Estilo Story |
| `letra_pop` | letra | letras pulam em cascata, stagger 1 q | Título curto, nome de marca |
| `letra_sobe` | letra | letras sobem 30 px (curva snappy), stagger 1 q | Premium, Apple style |

Efeito contínuo (`"durante"`): `onda` (palavras sobem e descem, 40 q, 6 px), `pulso` (bloco respira 3%), `shake` (tremor 3 px), `zoom_lento` (+6% ao longo da legenda), `flutua` (deriva 10 px para cima).
Saída (`"saida"`): `corte`, `fade_saida`, `pop_saida`, `sobe_saida`, `desfoque_saida` (4 a 5 q: cerca de metade da entrada).
Velocidade (`"velocidade"`): `lento` 1,4x, `normal`, `rapido` 0,7x, `frenetico` 0,5x ou um número.

Animação própria sem mexer no script: na entrada, `"animacao": {"nome": "pop", "entrada": {"s": [[0, .8], [5, 1.05, "easeOutBack"], [8, 1]]}}` substitui as trilhas. Propriedades: `op`, `s`, `sx`, `sy`, `dx`, `dy` (px em 1080x1920), `rot` (graus), `blur`, `rev` (0 a 1).

## 2. Curvas de velocidade

| Curva | cubic-bezier | Sensação | Uso |
|---|---|---|---|
| `easeOutQuad` | (0.5, 1, 0.89, 1) | neutra | fade |
| `easeOutCubic` | (0.33, 1, 0.68, 1) | uso geral | slide, desfoque |
| `easeOutQuart` | (0.25, 1, 0.5, 1) | firme | slide lateral |
| `easeOutExpo` / `snappy` | (0.16, 1, 0.3, 1) | chega quase na hora e freia longo | punch, blur slide |
| `easeOutBack` | (0.34, 1.56, 0.64, 1) | passa do alvo e volta | pop; `easeOutBack(2.5)` exagera |
| `easeInOutBack` / `anticipacao` | (0.68, -0.6, 0.32, 1.6) | recua e passa | revelação |
| `easeOutElastic`, `easeOutBounce` | função | mola, quique | brinquedo, exagero deliberado |
| `easeInCubic`, `easeInBack`, `m3Saida` | (0.32, 0, 0.67, 0) | acelera para fora | saídas |
| `m3Entrada` | (0.05, 0.7, 0.1, 1) | Material 3 emphasized decelerate | entradas premium |
| `steps(n)`, `segura`, `linear` | degraus | mecânico | máquina de escrever, glitch |

Qualquer outra: `bezier(x1,y1,x2,y2)`. Fonte dos valores: easings.net (código-fonte) e tokens do Material 3.

## 3. Regras de ritmo (pesquisa + casa)

1. Ease-out na entrada, ease-in na saída, saída com cerca de metade da duração da entrada.
2. Leitura pt-BR: até 17 caracteres por segundo (Netflix pt-BR). Bloco de 2 a 3 palavras fica cerca de 1 s; bloco inteiro pelo menos 25 quadros. Palavra a palavra quebra a regra de propósito.
3. Fala rápida (cerca de 180 palavras por minuto): entrada e saída abaixo de 12 quadros; use `rapido`.
4. O pico do overshoot cai na consoante tônica (P, T, K, B), não só na boca. `antecipar_q` (padrão 1 quadro) adianta a entrada das palavras sincronizadas; testar 1 a 2 em 60 s de vídeo antes de fechar.
5. Não animar tudo: pop e pulso só em substantivo, verbo de ação e número; conectivos parados. Pop em tudo perde o sinal.
6. Uma cor de destaque por bloco. Mínimo de 2 quadros entre legendas.
7. Uma animação por vídeo (no máximo duas: base + palavra-pico). Troca de animação = troca de linguagem da cena.
8. Movimento em pt-BR tem palavras longas: prefira fonte condensada (Anton, Bebas) quando o pop por bloco estoura a largura.
