# Catálogo de estilos de legenda (Peformake)

Legenda queimada em Reels vertical 1080x1920 (sequência dos clientes em 2160x3840). Cada estilo tem: quando usar, quantas linhas, tom e como fazer (preset do `scripts/legendas.py` ou template do Legendas Master).

## 1. Padrões da casa (já postados)

| Estilo | Visual | Linhas / palavras | Quando usar | Como fazer |
|---|---|---|---|---|
| **SN** | Montserrat ExtraBold Itálica branca, sombra escura suave (desfoque 10), corpo 108, centro a 76% da altura | 1 a 3 palavras, até 2 linhas | Padrão neutro dos vídeos SN (Black, BIO DIGESTOR); institucional, fala de dono ou técnico | `"preset": "sn"` |
| **BRIO** | Montserrat ExtraBold Itálica branca, contorno escuro 12 px, palavra-chave laranja `#FF8C1A`, centro a 65%, corpo 106 (reduz até 84) | frase curta, até 2 linhas | Food com apresentador; destaque na palavra de desejo (fome, mais gostosos, delivery) | `"preset": "brio"` + `*palavra*` |
| **DISALP** | Mesmo corpo da SN, centro a 70%, destaque amarelo | frase curta | Vídeo longo com motion: a legenda **some** nas janelas em que há texto de motion | `"preset": "disalp"` + `"janelas"` (formato de `legendas_janelas.json`) |

Origem: `G:\lucas\NOVEMBRO\BRIO BURG\_CLAUDE\legendas.py`, `G:\lucas\NOVEMBRO\SN\_CLAUDE\legendas_sn.py`, `G:\lucas\DISALP\PROJETOS\MOTION\legendas_plano.py` + `legendas_janelas.json`. O gerador único reproduz os três (a diferença: por padrão ele estreita a linha para não entrar na coluna de botões; `"lateral_livre": false` volta à largura antiga).

## 2. Legendas Master (plugin CEP no Premiere)

Templates em `G:\lucas\NOVEMBRO\SN\_RECURSOS\Legendas Master\templates`, catálogo visual em `G:\lucas\NOVEMBRO\SN\_RECURSOS\legendas_master_catalogo.jpg`. Cada template tem `.cgt`/`.cga` (pacote do plugin, criptografado: não dá para ler nem gerar por script), `thumb.jpg`, prévia `.mp4` e às vezes um som (whoosh, pop, metal). Fontes do pacote em `G:\lucas\NOVEMBRO\SN\_RECURSOS\Fontes` (SF UI Display, Reloka, Bebas, Abril Fatface, Ivy Presto, Optima, Raleway, BucklaneScript etc.). Uso: abrir o painel no Premiere, logar, transcrever (Whisper do próprio plugin) e aplicar o template. **É manual, feito pelo Italo**; a ponte MCP não controla o painel.

| Família | Qtde | Linhas | Visual (pelo catálogo) | Tom / quando usar |
|---|---|---|---|---|
| **Apple style** | 13 (1 linha) + 6 (2 linhas) | 1 ou 2 | Sans limpa tipo SF, branca, pequena; versões com "Destaque + frase de apoio" e itálico serifado grande sobre fundo escuro ("esse problema já entendeu") | Premium, clean, institucional, produto/tecnologia, saúde. Pouca palavra por tela, sem cor. |
| **Auto** | 3 modelos x 3 | 1 a 2 | Fundo degradê colorido, serifada/itálica grande com palavra em script ("Difference premium", "Template hook viral") | Cartela de gancho e títulos de abertura, não legenda corrida. |
| **Difference** | 3 (1 linha) + 4 (2 linhas) | 1 ou 2 | Fundo claro, sans preta, palavra-chave em verde ou cinza ("Success is not built on comfort", "Clarity comes from...") | Frase de efeito, mentalidade, depoimento sóbrio; vídeo claro/branco. |
| **Marca Texto** | 6 (frases) | 1 a 2 | "hook viral / TEMPLATE": palavra pequena em cima e palavra grande embaixo, branca com vermelho, itálico pesado | Gancho e frases de impacto; comercial, varejo, promoção. Equivalente no gerador: `marca_texto` (caixa amarela atrás da palavra) ou `viral`. |
| **Viral** | 13 (1 linha) + 25 (2) + 16 (3) + 8 (4) | 1 a 4 | Duas vozes: sans/itálico pequeno + palavra-pico gigante (serifada itálica, script, condensada) em cor (vermelho, roxo, amarelo, dourado); efeitos: Typewriter, Rebote, Smooth up, Slide left, palavra por palavra, VHS, texto escrito à mão, Pop up caption (caixa vermelha), Texto dourado | Reels de alcance, talking head com ritmo, criador. 1 linha = palavra a palavra; 3 a 4 linhas = frase-bloco de gancho. Equivalente no gerador: `viral` (palavra-pico 1,45x) e `palavra`. |

Regra de escolha rápida: cliente sóbrio/premium = Apple style ou Difference; food/varejo/promoção = Marca Texto ou Viral 2 linhas; gancho de abertura = Auto ou Viral 3 a 4 linhas; vídeo de alcance falado = Viral 1 linha (palavra por palavra).

## 3. Estilos do acervo (fichas em `acervo-audiovisual/virais` e `perfis`)

Achar a ficha: `grep -liE "<termo>" C:/Claude/peformake/acervo-audiovisual/virais/*.md` (ex.: "palavra a palavra", "atrás d", "três vozes").

| Estilo | Visual | Quando usar | Preset / receita | Fichas de exemplo |
|---|---|---|---|---|
| **Palavra a palavra** | 1 palavra por vez, sans bold branca, centro do corpo | Talking head rápido, retenção máxima | `palavra` com entrada `"palavras"` (Whisper) | omarcosvianna, salleszk, johnbucog, willrvail |
| **Duas vozes (palavra-pico)** | legenda pequena + palavra-chave gigante em itálico/serifada colorida | Explicação com uma ideia forte por frase | `viral` + `*palavra*` | salleszk, omarcosvianna, earn.edits, viashaan |
| **Três vozes** | sans branca no conteúdo, script néon amarelo no pico, serifada itálica pequena nas ligações | Edição premium (Estilo Motion) | gerar duas passadas: `sn` para a base e `viral`/`atras` para o pico | salleszk, earn.edits |
| **Legenda de filme** | itálica pequena amarela no centro, 3 a 5 palavras | Esquete, trecho "cinema", storytelling | `filme` | salleszk, oandrenuneu |
| **Caixa translúcida** | sans bold branca em faixa preta translúcida, terço inferior | Depoimento longo, entrevista, educação | `caixa` | earn.edits |
| **Mono amarela** | monoespaçada amarelo-claro, 2 a 4 palavras, embaixo | Documental, investigação (Estilo Story) | `filme` com `"fonte"` monoespaçada | giubeckers, ashokreddyai |
| **Legenda com foco** | cada palavra entra desfocada e foca em 3 a 4 quadros | Premium calmo | PNG + no Premiere Desfoque gaussiano 30 para 0 (quadros-chave via `add_keyframe`) | salleszk |
| **Texto atrás da pessoa** | palavra gigante condensada atrás do recorte do corpo | Gancho, palavra-tese, nome do produto (1 a 3 vezes por vídeo, não a legenda inteira) | `atras` + `recorte_pessoa.py` (rembg 2.0.87) | salleszk (DefVZvwgS2s), omarcosvianna, viashaan, vaishmediafilms, melikazaghari; skill edicao-motion |

Cuidados de leitura (todas as fichas): legenda nunca briga com o texto de motion (janela sem legenda); troca de fonte = troca de mundo (só muda de estilo quando a cena muda de linguagem); palavra-pico no máximo 1 por tela.
