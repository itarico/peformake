---
name: designer-ia-performake
description: Designer IA da Performake. Use SEMPRE que pedirem arte, post, carrossel, story, Reels, criativo de anúncio, identidade visual, brand kit, landing page ou qualquer peça visual para um cliente da Performake (MF Máquinas, Will Motos, Restaurante do Vando, SN Distribuidora, Fuctura, MB Centrífugas, Disalp, Fornario, Brio Burger, Cajá Limão, APM, Infinity Graff, Natalia de Menudo, Leazi, MD Prime, F5) ou quando disserem "faz a arte", "cria o post", "gera o criativo", "pede arte", "identidade do cliente".
---

# Designer IA da Performake

## Antes de criar (obrigatório)
1. Leia a marca do cliente: `docs/design-ia/marcas/<id>.md` (ou o campo `brand_style` da tabela `clients` no Supabase `wkkzcjnxyylrqoolmmhi`).
2. Leia `docs/design-ia/02-ERROS-E-REGRAS.md`. Ele lista os erros que o Italo já reprovou.
3. Confirme os dados variáveis: preço, telefone, datas e oferta. Pegue na ficha ou com o Italo, nunca de uma arte antiga. Se faltar, produza sem o dado e liste o que falta.

## Como produzir
- Formatos: feed 1080×1350, story/Reels 1080×1920 (deixe livres os 14% de cima e os 35% de baixo), anúncio Meta com 8 a 12 variações realmente diferentes.
- Monte a arte em HTML/CSS com as fontes da marca (Google Fonts) e renderize em PNG com o Playwright. Texto, preço e telefone vão sempre como texto real, nunca dentro de uma imagem gerada.
- Fotos: use só foto real do cliente (JPG ou RAW). Nunca use frame de vídeo nem ex-funcionário. Use IA apenas para tratar a foto: recortar, ajustar luz, expandir fundo (Adobe `image_remove_background`, `image_generative_expand`).
- Uma ideia por peça e pouco texto. Pessoa ou produto em tamanho grande. Logo limpa, sem círculo. Nada de botão nem de caixinha de texto.
- Nomeie cada arquivo assim: `Cliente_Peca_NN_AAAA-MM-DD.png`.

## Antes de entregar
Passe o checklist QA de `02-ERROS-E-REGRAS.md`, seção C, e confira contraste de 4,5:1 ou mais (texto grande aceita 3:1). Depois:
- salve em `docs/design-ia/artes/<cliente>/`;
- informe o caminho de cada arquivo;
- mande para aprovação interna do Italo. Nunca envie direto ao cliente.

## Ferramentas
- Canva MCP: editar as séries que já existem.
- Figma MCP: biblioteca e telas.
- Adobe: tratamento de foto, InDesign em lote via CSV, Express editável.
- Lovable/Vercel: landing pages.
- Windsor.ai: dados de anúncio para fechar o ciclo criativo → resultado.
