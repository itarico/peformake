---
name: radar-criativos
description: Motor da assessoria de marketing — assiste os anúncios em vídeo que estão validados no nicho do cliente (Biblioteca de Anúncios da Meta), decompõe gancho/desenvolvimento/prova/CTA, guarda numa biblioteca que cresce a cada nicho e entrega um pacote executável — roteiros prontos para gravar com variações de gancho, kit de gravação, copy dos anúncios, mensagens de WhatsApp de venda e plano de teste. Use quando o usuário pedir roteiros de anúncio, scripts para gravar, "o que falar no vídeo", "ler/assistir os anúncios dos concorrentes", "estruturas de vídeo que funcionam", "criativos para o cliente X", ou depois de uma varredura de nicho.
---

# Radar de criativos → roteiros prontos para gravar

Pasta do motor: `D:\ITALO\CLAUDE\SHOPPE\radar-criativos\` (README lá dentro).
Python com GPU: `D:\ITALO\CLAUDE\IA-LOCAL\venv-transcricao\Scripts\python.exe`.
Não usar Windsor.ai. Tráfego é acelerador, nunca vilão.

## Fluxo

### 1. Coletar
Atalho: `meta-ads` → `ads_library_search` lista IDs e datas de início dos anúncios ativos no Brasil. Os IDs servem direto no `analisar.py` (yt-dlp baixa pelo ID). Para o texto e as versões, use o coletor do navegador abaixo.

**Navegador:**
Abra a Biblioteca de Anúncios no navegador do app, só vídeos, Brasil, ativos:
```
https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=TERMO&search_type=keyword_unordered&media_type=video
```
Rode `coletar.js` no `javascript_tool`. Faça 2 a 4 buscas: termo + cidade do cliente, termo da oferta (ex.: "sem entrada"), e o termo sem cidade (Brasil todo) para pegar os validados de longa duração. Junte os JSON num arquivo `coletas/coleta-<nicho>-<data>.json` com `{"busca", "coletado_em", "anuncios": [...]}`, sem repetir IDs e sem anúncios fora do nicho.

### 1b. Radar de ofertas, posts e ações (navegador)
Além dos vídeos, colete **todos os formatos** (`media_type=all`, e no `coletar.js` use `SO_VIDEO_VALIDADO = false`) com termos de ação comercial do nicho: "feirão", "promoção", "desconto", "brinde", "sorteio", "black friday", "queima de estoque", "aniversário da loja", "troca", "sem entrada", "frete grátis", "garantia". Para posts de imagem/carrossel, abra os mais antigos (`?id=...`) e faça print (`computer screenshot`) para ver a arte.
Classifique cada ação em: **desconto | condição de pagamento | bônus/brinde | evento com data (feirão, aniversário, black) | garantia/risco zero | troca/usado como entrada | escassez | entrega/serviço grátis | sorteio | conteúdo/comunidade**. Anote o gatilho do texto e a arte (cores, número em destaque, foto real ou banco de imagem). Vira a seção **Ofertas e ações do mercado** do pacote, com 3 a 5 ações adaptadas para o cliente e um calendário promocional simples (próximos 60 dias, com datas do comércio).

### 2. Baixar e "assistir" (script)
```bash
cd /d/ITALO/CLAUDE/SHOPPE/radar-criativos && PYTHONIOENCODING=utf-8 /d/ITALO/CLAUDE/IA-LOCAL/venv-transcricao/Scripts/python analisar.py coletas/coleta-<nicho>-<data>.json --nicho "<nicho>" --top 10 --min-dias 30
```
Escolhe os vídeos com mais tempo no ar e mais versões, baixa (yt-dlp pelo ID do anúncio), transcreve na GPU, tira quadros e monta `anuncios/<id>/leitura.md` + `folha.jpg` (todos os quadros numa imagem). Já analisados são pulados. Para nichos com pouco anúncio, use `--min-dias 20`.

### 3. Decompor (você)
Para cada anúncio: leia `leitura.md` e abra `folha.jpg`. Escreva a estrutura no formato do `biblioteca.py` (gancho com tipo e texto, batidas com tempo e função, ângulo, oferta, prova, CTA, por que funciona, como transplantar para outro nicho). Salve a lista em `coletas/estruturas-<nicho>-<data>.json` e rode:
```bash
python biblioteca.py adicionar coletas/estruturas-<nicho>-<data>.json
```
Antes de criar roteiros, consulte também o que já existe de outros nichos (`biblioteca.py buscar --gancho curiosidade`, `resumo`): estrutura boa de um nicho costuma funcionar em outro.

Transcrição com música ou letra em inglês = anúncio sem fala; descreva pelo visual.

### 4. Gerar o pacote do cliente (o produto)
Salve em `D:\ITALO\CLAUDE\SHOPPE\radar-criativos\pacotes\<cliente>-<data>.md`:

0. **Ofertas e ações do mercado** (do passo 1b) + calendário de ações para o cliente.
1. **Mapa rápido** (máx. 10 linhas): as 3 a 5 estruturas mais fortes do nicho, com link do anúncio-fonte, e o que o cliente tem que os concorrentes não têm.
2. **Roteiros prontos para gravar** (8 a 12). Cada um:
   - Nome, estrutura-fonte (link), objetivo (topo, meio, fundo) e duração alvo.
   - **3 ganchos alternativos** (para testar só trocando os 3 primeiros segundos).
   - Tabela de batidas: tempo | o que falar (exatamente, em fala natural, curta, como a pessoa fala) | o que aparece na tela/legenda | plano de câmera.
   - CTA falado + texto do botão.
   - Texto do anúncio (legenda do post) e título.
   Regra: inspirar na estrutura, nunca copiar a fala do concorrente. Usar a oferta e os fatos reais do cliente; o que não for confirmado vira [CONFIRMAR].
3. **Kit de gravação**: ordem para gravar tudo em uma sessão (agrupe por local e por roupa), lista de takes de apoio (B-roll), dicas de enquadramento 9:16, luz e áudio com celular.
4. **Mensagens de WhatsApp**, alinhadas ao ângulo de cada anúncio: primeira resposta, qualificação (2 a 3 perguntas), envio de oferta, follow-up em 1h, 24h e 3 dias, e resposta para as 3 objeções mais comuns do nicho.
5. **Plano de teste de 14 dias**: quais roteiros sobem primeiro, quantos por conjunto, métrica (custo por conversa e conversa → visita/venda) e regra de pausar e escalar.

Sempre separar **FATO / HIPÓTESE / FALTA**. Nunca inventar gasto ou resultado de concorrente.

### 5. Entrega
Exporte para Word e PDF com `D:\ITALO\CLAUDE\IA-LOCAL\exportar_doc.py "<pacote.md>"` (rode com o Python do `venv-trafego`). Resuma em poucas linhas na conversa e envie os arquivos. Ofereça publicar como página para o cliente ou gerar os vídeos (HyperFrames/Remotion) a partir dos roteiros.

## Cuidados
- Crédito/financiamento: "sujeito a análise de crédito"; não prometer aprovação.
- Nichos regulados (saúde, estética, odonto, financeiro): conferir conselho e política da Meta.
- Não baixar nem guardar vídeo de perfil privado; só da Biblioteca pública.
