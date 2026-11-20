---
name: varredura-nicho
description: Faz a varredura completa de tráfego pago de um nicho ou cliente — concorrentes, anúncios já validados (Biblioteca de Anúncios da Meta, Google Ads Transparency, TikTok Creative Center), ofertas, ganchos, ângulos e lacunas — e transforma em estratégia pronta de campanha, oferta e criativos. Use quando o usuário pedir "varredura", "pesquisa de nicho", "o que os concorrentes anunciam", "anúncios validados", "espionar anúncios", "ideias de anúncio para o cliente X", "estratégia de tráfego para o nicho Y" ou "o que está funcionando no nicho".
---

# Varredura de nicho para tráfego pago

Objetivo: sair de "não sei nada desse nicho" para "estratégia de tráfego com ofertas e criativos baseados no que já está validado no mercado".

**Não usar o Windsor.ai nesta skill** (pedido do Italo). Dados de conta do cliente, só se ele fornecer (print, export, Reportei ou MCP oficial `meta-ads` já autorizado).

Enquadramento: tráfego é o acelerador do negócio. Nunca trate anúncio como vilão.

## 0. Briefing (perguntar só o que faltar)

- Cliente, nicho, cidade/região, ticket médio, oferta atual, objetivo (WhatsApp, venda online, agendamento, loja física).
- Concorrentes que o cliente já conhece (nome, @ ou site).
- Verba mensal aproximada.

Sem resposta, siga com o que tiver e marque como **FALTA** no documento.

## 1. Palavras de busca

Monte 5 a 10 termos: nome do serviço/produto, variações populares, dor ("dor nas costas"), desejo ("sorriso perfeito"), termo + cidade, e nomes dos concorrentes.

## 2. Biblioteca de Anúncios da Meta (principal fonte de "validado")

**Primeiro:** use o MCP oficial `meta-ads`, ferramenta `ads_library_search` (`search_terms`, `countries: ["BR"]`, `ad_active_status: "ACTIVE"`, até 50 por chamada). Testado em 29/10/2026: ele devolve anúncios comerciais do Brasil, com ID, página, data de criação e data de início de veiculação, mas sem o texto. Use para levantar rápido quem anuncia e há quanto tempo. Para o texto, o criativo e as versões, complete pelo navegador (funciona sem login):

URL por termo (troque o termo, mantenha `country=BR`):

```
https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=TERMO&search_type=keyword_unordered&media_type=all
```

Para um anunciante específico, pesquise o nome e abra a página dele na Biblioteca.

Extração: rode o conteúdo de `extrair-biblioteca-meta.js` (nesta pasta) no `javascript_tool` com a página aberta. Ele rola, lê os cartões e devolve JSON com `dias_no_ar`, `versoes`, anunciante, texto, destino e CTA, ordenado pelo mais antigo. Se a página mudar e o script vier vazio, leia com `get_page_text` e extraia à mão.

**Critério de validado** (proxy, não é prova de lucro):
- Forte: ativo há **60+ dias**, ou ativo há 30+ dias **e** com várias versões ("N anúncios usam esse criativo").
- Médio: ativo 30 a 59 dias.
- Teste: menos de 30 dias. Mostra o que o concorrente está testando agora.

Abra os 5 a 10 mais fortes (`?id=...`) e veja o criativo: formato, primeiros 3 segundos, texto na tela, quem aparece, oferta, CTA. Para vídeo importante, use a skill `ler-video` com o link ou o arquivo.

## 3. Google Ads Transparency Center

```
https://adstransparency.google.com/?region=BR
```

Pesquise o domínio ou o nome de cada concorrente. Anote: se anuncia no Google, formatos (texto, imagem, vídeo/YouTube), títulos, e há quanto tempo. Anunciante presente na pesquisa do Google = demanda ativa no nicho. (O pacote Python `Google-Ads-Transparency-Scraper` está em `D:\ITALO\CLAUDE\IA-LOCAL\venv-trafego`, mas parou de devolver dados; use o navegador.)

## 4. TikTok Creative Center (tendência e formato)

```
https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/pt?region=BR
```

Sem login, o TikTok mostra só 3 anúncios de exemplo. A lista completa pede login no TikTok for Business: se o Italo não estiver logado, marque como FALTA. Com login: filtre por setor e por período. Anote ganchos, formatos e CTR quando aparecer. Também veja "Hashtags" e "Músicas" em alta no setor.

## 5. Sites e ofertas dos concorrentes

Abra a página de destino dos 3 a 5 concorrentes mais fortes: promessa principal, oferta, preço/condição, garantia, prova social, CTA e meio de contato. Se for preciso, use `claude-ads:ads-landing` para auditar a página.

## 5b. Diagnóstico do próprio cliente (pontos negativos)

Antes de propor tráfego, audite o cliente com o mesmo rigor:
- **Google (perfil da empresa):** busque "<nome> <cidade>" e anote nota e número de avaliações. Clique em "Ver todos os comentários do Google" e ordene por "Menor classificação". Leia com `get_page_text` e agrupe os temas que se repetem (atendimento, pós-venda, prazo, produto, preço), contando quantas vezes cada um aparece. Veja também se o dono responde, se as respostas são genéricas ou repetidas e quantas negativas estão sem resposta.
- **Reclame Aqui / Procon:** busque "<nome> reclame aqui".
- **Consistência:** confira se nome, endereço e telefone batem em Google, Instagram, Facebook, site e marketplace. Procure páginas duplicadas e links quebrados (site antigo com 404).
- **Site:** verifique se abre no domínio próprio e se tem Pixel/GA4 (procure `fbq(` e `gtag(` no HTML).
- **Anúncios do cliente:** quantos estão ativos na Biblioteca e há quanto tempo, comparado aos concorrentes.

Nomeie avaliadores só no documento interno, nunca no material para o cliente. Trate acusação grave como RELATO, não como fato.

## 6. Síntese (o que importa)

Monte tabelas com:
1. **Concorrentes:** quem anuncia, onde (Meta/Google/TikTok), volume de anúncios ativos, há quanto tempo.
2. **Anúncios validados:** link, dias no ar, versões, formato, gancho, oferta, CTA.
3. **Padrões que se repetem** nos validados: ganchos, ângulos (dor, desejo, prova, preço, autoridade, urgência), ofertas e formatos.
4. **Lacunas:** o que ninguém está fazendo (ângulo, formato, público, oferta, plataforma).

## 7. Estratégia para o cliente

Use as skills que já existem para cada parte:
- Estratégia, estrutura de campanha, público e verba: `ads` ou `claude-ads:ads-plan` e `claude-ads:ads-budget`.
- Oferta irresistível: `offers`.
- Contas (CPA, ROAS, ponto de equilíbrio): `claude-ads:ads-math`.
- Criativos e copies: `ad-creative` ou `claude-ads:ads-create`.
- Decisão difícil: `marketing-council`.

Entregue:
- 3 ângulos principais, com o anúncio validado que inspira cada um.
- 1 a 3 ofertas propostas.
- Estrutura de campanha inicial (objetivo, conjuntos, público, verba por conjunto).
- 6 a 10 ideias de criativo: gancho, formato, roteiro curto, CTA.
- Plano de teste das 2 primeiras semanas e o critério para pausar e escalar.

## 7b. Plano do mês (quando pedirem plano/estratégia mensal)

Siga o modelo de `D:\ITALO\CLAUDE\SHOPPE\varreduras\will-motos-plano-novembro-2026.md`:
1. Resumo para decisão.
2. Pontos negativos com gravidade.
3. Objetivos com indicador e meta.
4. Plano semana a semana em tabelas, com cada ação tendo quem faz, prazo e entregável. A semana 1 sempre arruma a casa (atendimento, medição, presença) antes de ligar a verba.
5. Configuração do tráfego.
6. Atendimento, pós-venda e reputação.
7. Orgânico.
8. Painel semanal.
9. O que o cliente precisa entregar.
10. Riscos.

Use as datas reais do mês: feriados e datas do comércio.

## 8. Entrega

Documento em português, para o Italo e para o cliente. Separe sempre **FATO** (visto na Biblioteca ou no site, com link), **HIPÓTESE** (o que inferimos) e **FALTA** (dado que não temos). Nunca invente gasto, CTR ou resultado de concorrente: a Biblioteca não mostra isso para anúncios comerciais do Brasil.

Salve em `D:\ITALO\CLAUDE\SHOPPE\varreduras\<cliente>-<data>.md` e exporte para Word e PDF:

```bash
PYTHONIOENCODING=utf-8 /d/ITALO/CLAUDE/IA-LOCAL/venv-trafego/Scripts/python /d/ITALO/CLAUDE/IA-LOCAL/exportar_doc.py "<arquivo.md>"
```

Isso gera `.docx` (abre no Word e no Google Docs) e `.pdf` na mesma pasta. Envie os arquivos.

## Regras

- Inspiração não é cópia: nunca reproduza texto ou criativo de concorrente literalmente na proposta.
- Nichos regulados (saúde, estética, odontologia, financeiro): confira regras do conselho (CFM, CFO, CRO etc.) e da política da Meta antes de propor promessa, antes e depois ou preço.
- Não entre com login nem senha do Italo em nenhum site durante a varredura.
