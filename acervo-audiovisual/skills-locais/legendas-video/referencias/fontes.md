# Fontes para legenda

Detalhe completo (pesos, itálico, licença com link, quem usa): `pesquisa-2026-11.md`, bloco 3.
Antes de fechar um padrão, testar `AÇÃO ÁGUA CORAÇÃO PÊSSEGO ÓTIMO` na fonte.
Licença: Google Fonts (OFL ou Apache 2.0) e Fontshare (ITF) liberam uso comercial em vídeo. DaFont "free for personal use" NÃO serve para cliente. Envato Elements: registrar o projeto do cliente na hora do download (a licença vale por projeto registrado).

## Instaladas neste PC (atualizado 27/11/2026)
Instalação por usuário em `%LOCALAPPDATA%\Microsoft\Windows\Fonts` (registradas no HKCU, o Premiere enxerga depois de reabrir).
- Já existiam: Montserrat (variável, normal e itálica), Poppins (todos os pesos e itálicos), Inter, Bebas Neue, DM Serif Display (normal e itálica), Playfair Display, Sora, Raleway, Abril Fatface. Pacote Legendas Master em `G:\lucas\NOVEMBRO\SN\_RECURSOS\Fontes`: SF UI Display, Reloka, Ivy Presto, Bucklane Script, Optima etc.
- Instaladas em 27/11/2026 (95 arquivos do repositório oficial google/fonts, todas com acentos pt-BR conferidos): Anton, Luckiest Guy, Bangers, Archivo Black, Oswald, Barlow Condensed (18), League Gothic, Lilita One, Titan One, Fredoka, Instrument Serif (normal e itálica), Fraunces (normal e itálica), Caveat, Permanent Marker, IBM Plex Mono (14), JetBrains Mono, Space Mono, Unbounded, Kanit (18), Russo One, Teko, Plus Jakarta Sans, Figtree, DM Sans, Manrope, Rubik, League Spartan, Space Grotesk, Bricolage Grotesque, Outfit, Nunito, Passion One, Bowlby One SC, Roboto Condensed.

O gerador procura em `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, `C:\Windows\Fonts` e na pasta do Legendas Master. Fonte que falta: avisa e usa Montserrat ExtraBold Itálica. Fonte variável com mais de um eixo (Fraunces, Bricolage): o `peso` pode não aplicar; preferir as estáticas.

## Pagas pelo Envato (Italo tem acesso; baixar quando for usar)
O padrão da agência é o nível Legendas Master: hierarquia apoio + pico. O que mais falta para variar o pico:
| Tipo | Para que preset | O que buscar no Envato Elements (Fonts) |
|---|---|---|
| Serifada display itálica de alto contraste | `lm_serif`, `lm_ouro` | "serif display italic", "editorial serif", "high contrast serif" (o look do "template" serifado do Viral) |
| Script de assinatura / pincel | `lm_ouro`, palavra de luxo | "signature script", "brush script" (com acentos: conferir "Latin Extended" ou "multilingual") |
| Grotesca pesada itálica geométrica | `lm_viral` | "geometric sans bold italic", "grotesk black italic" (estilo Gilroy/TT Commons) |
| Display condensada com personalidade | `lm_condensada`, `lm_vermelho` | "condensed display", "bold condensed sans" |
Ao baixar: instalar, rodar `legendas.py` com `"fonte": "<arquivo>"` e conferir acentos antes de virar preset.

## Não usar em cliente sem licença
Komika Axis (só uso pessoal), Proxima Nova, TT Commons, Gilroy completa (pagas fora do Envato). The Bold Font grátis só tem maiúsculas.

## Combinações por estilo
| Estilo | Pico | Apoio |
|---|---|---|
| `lm_viral` (padrão) | Poppins Black Italic + glow branco | Poppins SemiBold |
| `lm_vermelho` | Anton caixa alta vermelha + glow | Poppins SemiBold Italic |
| `lm_serif` | Instrument Serif Italic | Poppins Medium |
| `lm_gradiente` | Poppins Black Italic, degradê azul > roxo > rosa | Poppins Medium |
| `lm_ouro` | DM Serif Display Italic, degradê dourado | SF UI Display Light caixa alta |
| `lm_apple` | SF UI Display Bold | SF UI Display Light cinza |
| `lm_condensada` | Bebas Neue Bold amarela + glow | Poppins SemiBold Italic |
| Simples (só para coisa simples) | Hormozi: Montserrat 900 / Beast: Luckiest Guy / Ali: Inter Bold | |
