# HTML Base — Performake Visual Output

Este arquivo contém o CSS, JS e estrutura HTML completa que deve ser usada em TODOS os artifacts da Performake. Copie e adapte — nunca invente um estilo novo.

---

## Estrutura HTML Completa

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[CLIENTE] — [TIPO] — Performake Agência</title>
<style>
/* === BASE === */
:root { color-scheme: light; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #1a1a1a; }

/* === HEADER === */
.header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white; padding: 24px 28px; display: flex; align-items: center; gap: 18px;
}
.logo { width: 52px; height: 52px; background: #e94560; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
.header-text h1 { font-size: 20px; font-weight: 700; }
.header-text p { font-size: 12px; opacity: 0.7; margin-top: 3px; }
.badge { background: #e94560; color: white; font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 20px; display: inline-block; margin-top: 6px; }

/* === SCORE BAR === */
.score-bar { background: #1a1a2e; color: white; padding: 12px 28px;
  display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.score-item { text-align: center; }
.score-item .num { font-size: 22px; font-weight: 800; color: #e94560; }
.score-item .lbl { font-size: 10px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.4px; }
.score-item.good .num { color: #00d4aa; }
.score-item.mid .num { color: #ffb800; }

/* === TABS === */
.tabs { display: flex; background: white; border-bottom: 2px solid #eee;
  overflow-x: auto; padding: 0 20px; gap: 2px;
  position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.tab { padding: 12px 14px; font-size: 12px; font-weight: 600; color: #666;
  cursor: pointer; border-bottom: 3px solid transparent; white-space: nowrap; transition: all 0.2s; }
.tab.active { color: #e94560; border-color: #e94560; }
.tab:hover:not(.active) { color: #1a1a2e; }

/* === LAYOUT === */
.content { padding: 20px 24px; max-width: 1000px; margin: 0 auto; }
.section { display: none; }
.section.active { display: block; }
.section-title { font-size: 17px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px;
  padding-bottom: 9px; border-bottom: 2px solid #e94560; display: flex; align-items: center; gap: 8px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr; } }

/* === CARDS === */
.card { background: white; border-radius: 12px; padding: 18px; margin-bottom: 14px;
  border: 1px solid #e8e8e8; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
.card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.09); }
.card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.card-num { color: white; width: 34px; height: 34px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0; background: #1a1a2e; }
.card-num.red    { background: #e94560; }
.card-num.teal   { background: #00d4aa; color: #1a1a2e; }
.card-num.gold   { background: #ffb800; color: #1a1a2e; }
.card-num.purple { background: #7c3aed; }
.card-num.blue   { background: #0066cc; }
.card-num.green  { background: #059669; }
.card-title { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }

/* === TAGS === */
.card-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 12px; display: inline-block; }
.tag-b2b      { background: #e0f0ff; color: #0066cc; }
.tag-mercado  { background: #fff0e0; color: #cc6600; }
.tag-educacao { background: #e8ffe8; color: #006600; }
.tag-trending { background: #ffe0e0; color: #cc0033; }
.tag-branding { background: #f0e0ff; color: #6600cc; }
.tag-post     { background: #e0fff5; color: #006644; }
.tag-oferta   { background: #fff8e0; color: #886600; }

/* === INFO ROWS === */
.info-row { display: flex; gap: 8px; margin-bottom: 7px; font-size: 13px; align-items: flex-start; }
.info-label { font-weight: 700; color: #555; min-width: 88px; flex-shrink: 0; }
.info-val { color: #333; }

/* === SCRIPT BOX === */
.script-box { background: #f8f9fc; border-left: 3px solid #e94560; border-radius: 0 8px 8px 0;
  padding: 13px; font-size: 13px; line-height: 1.7; color: #333; white-space: pre-wrap; }
.hook { font-weight: 700; color: #e94560; }

/* === CARROSSEL === */
.carrossel-slides { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-top: 10px; }
.slide { background: #1a1a2e; color: white; border-radius: 10px; padding: 12px; min-width: 170px; font-size: 12px; }
.slide-num { font-size: 10px; opacity: 0.5; margin-bottom: 5px; }
.slide-text { line-height: 1.5; }

/* === STORIES === */
.story-card { background: white; border-radius: 12px; border: 1px solid #e8e8e8; overflow: hidden; }
.story-header { background: linear-gradient(135deg, #1a1a2e, #0f3460); color: white;
  padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
.story-time { font-size: 11px; opacity: 0.7; }
.story-body { padding: 13px 15px; font-size: 13px; line-height: 1.6; }

/* === ESTRATEGIA === */
.estrategia-card { border-left: 4px solid #e94560; }
.estrategia-priority { font-size: 12px; font-weight: 700; color: #e94560;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }

/* === DIY === */
.diy-card { border-left: 4px solid #00d4aa; }
.diy-steps { list-style: none; margin-top: 10px; }
.diy-steps li { padding: 5px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; display: flex; gap: 8px; }
.diy-steps li:last-child { border-bottom: none; }
.diy-steps li::before { content: "→"; color: #00d4aa; font-weight: 700; }

/* === POST === */
.post-card { border-left: 4px solid #7c3aed; }
.post-copy { background: #f8f4ff; border-radius: 8px; padding: 13px; font-size: 13px; line-height: 1.7; color: #333; margin-top: 10px; }
.post-caption { font-style: italic; color: #666; font-size: 12px; margin-top: 8px; }

/* === EXTRAS === */
.extras-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.extra-item { background: white; border-radius: 10px; padding: 13px; border: 1px solid #e8e8e8; }
.extra-icon { font-size: 20px; margin-bottom: 7px; }
.extra-title { font-size: 13px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
.extra-desc { font-size: 12px; color: #666; line-height: 1.5; }

/* === RESUMO === */
.resumo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px; }
.resumo-item { background: white; border-radius: 12px; padding: 14px; text-align: center; border: 1px solid #e8e8e8; }
.resumo-num { font-size: 28px; font-weight: 800; color: #e94560; }
.resumo-label { font-size: 11px; color: #888; margin-top: 3px; font-weight: 600; }

/* === HIGHLIGHT === */
.highlight-box { background: linear-gradient(135deg, #1a1a2e, #0f3460); color: white;
  border-radius: 12px; padding: 18px; margin-bottom: 18px; }
.highlight-box h3 { font-size: 13px; opacity: 0.65; font-weight: 600; margin-bottom: 7px;
  text-transform: uppercase; letter-spacing: 0.4px; }
.highlight-box p { font-size: 15px; font-weight: 700; line-height: 1.5; }

/* === TREND TAGS === */
.trend-tag { display: inline-block; background: #ffe0e0; color: #cc0033; border-radius: 20px;
  padding: 3px 10px; font-size: 12px; font-weight: 600; margin: 3px; }

/* === LINKS === */
.link-item { display: flex; align-items: center; gap: 12px; padding: 11px; background: white;
  border-radius: 10px; border: 1px solid #e8e8e8; margin-bottom: 8px; text-decoration: none; color: inherit; }
.link-icon { width: 34px; height: 34px; border-radius: 8px; background: #f0f0f0;
  display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
.link-text .lt { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.link-text .ld { font-size: 12px; color: #888; }

/* === SCORE DIAGNOSTICO === */
.score-row { display: flex; align-items: center; gap: 12px; padding: 10px 0;
  border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.score-row:last-child { border-bottom: none; }
.score-bar-fill { height: 8px; border-radius: 4px; background: #e94560; }
.score-label-d { flex: 1; font-weight: 600; }
.score-num-d { font-weight: 800; font-size: 16px; color: #1a1a2e; min-width: 40px; text-align: right; }
.score-bar-wrap { flex: 2; background: #f0f0f0; border-radius: 4px; height: 8px; overflow: hidden; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="logo">[EMOJI_DO_NICHO]</div>
  <div class="header-text">
    <h1>[NOME_CLIENTE] — [TIPO_DO_PLANEJAMENTO]</h1>
    <p>Performake Agência · [DATA]</p>
    <span class="badge">[BADGE_LABEL]</span>
  </div>
</div>

<!-- SCORE BAR: escolha as métricas mais relevantes para o tipo -->
<div class="score-bar">
  <div class="score-item"><div class="num">[VALOR]</div><div class="lbl">[LABEL]</div></div>
  <!-- repita para cada métrica; use .good para verde e .mid para amarelo -->
</div>

<!-- TABS -->
<div class="tabs">
  <div class="tab active" onclick="showTab('[ID_DA_ABA]',this)">[EMOJI] [LABEL]</div>
  <!-- repita para cada aba -->
</div>

<!-- SEÇÕES: uma por aba -->
<div class="content section active" id="[ID_DA_ABA]">
  <!-- conteúdo da aba -->
</div>

<script>
function showTab(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  el.classList.add('active');
}
</script>
</body>
</html>
```

---

## Padrões de uso para cada tipo de conteúdo

### Card simples (padrão)
```html
<div class="card">
  <div class="card-header">
    <div class="card-num red">1</div>
    <div>
      <div class="card-title">Título do Item</div>
      <span class="card-tag tag-mercado">Categoria</span>
    </div>
  </div>
  <div class="info-row"><span class="info-label">Plataforma:</span><span class="info-val">Instagram + TikTok</span></div>
  <div class="script-box"><span class="hook">HOOK: "Texto do hook aqui"</span>

Corpo do roteiro preservando quebras de linha.</div>
</div>
```

### Score de maturidade (DIAGNOSTICO)
```html
<div class="card">
  <div class="score-row">
    <div class="score-label-d">Redes Sociais</div>
    <div class="score-bar-wrap"><div class="score-bar-fill" style="width:45%"></div></div>
    <div class="score-num-d">45/100</div>
  </div>
  <!-- repita para cada dimensão -->
</div>
```

### Highlight box (sempre no topo do Resumo)
```html
<div class="highlight-box">
  <h3>Posicionamento / Insight Principal</h3>
  <p>"Texto do posicionamento ou insight mais importante aqui."</p>
</div>
```

### Carrossel
```html
<div class="carrossel-slides">
  <div class="slide"><div class="slide-num">Slide 1 — Capa</div><div class="slide-text">Texto do slide</div></div>
  <!-- repita para cada slide -->
</div>
```

### Story card (grade 2 colunas)
```html
<div class="grid-2">
  <div class="story-card">
    <div class="story-header"><span>Story 1 — Seg 8h</span><span class="story-time">Tipo</span></div>
    <div class="story-body">Conteúdo do story</div>
  </div>
</div>
```

### DIY card
```html
<div class="card diy-card">
  <div class="card-title">DIY 1 — Título</div>
  <ul class="diy-steps">
    <li>Passo 1</li>
    <li>Passo 2</li>
  </ul>
</div>
```

### Post card
```html
<div class="card post-card">
  <div class="card-header"><div class="card-num purple">1</div><div><div class="card-title">Título</div><span class="card-tag tag-post">Post Feed</span></div></div>
  <div class="post-copy">Texto completo do post aqui</div>
  <div class="post-caption">Legenda e hashtags</div>
</div>
```

### Extras grid
```html
<div class="extras-grid">
  <div class="extra-item">
    <div class="extra-icon">🗺️</div>
    <div class="extra-title">Título da ideia</div>
    <div class="extra-desc">Descrição da ideia extra</div>
  </div>
</div>
```

### Estratégia card
```html
<div class="card estrategia-card" style="border-color:#0066cc;">
  <div class="estrategia-priority" style="color:#0066cc;">🚀 PRIORIDADE 1</div>
  <div class="card-title" style="font-size:16px;margin-bottom:10px;">Título da Estratégia</div>
  <div class="info-row"><span class="info-label">Objetivo:</span><span class="info-val">Texto do objetivo</span></div>
  <div class="script-box">Detalhamento da estratégia, passos, exemplos...</div>
</div>
```

### Trend tags
```html
<div class="card">
  <div style="display:flex;flex-wrap:wrap;gap:5px;">
    <span class="trend-tag">Tendência 1</span>
    <span class="trend-tag">Tendência 2</span>
  </div>
</div>
```

---

## Emojis por nicho (sugestões para o logo)

| Nicho | Emoji |
|---|---|
| Autopeças / Transporte | 🚛 |
| Gastronomia / Restaurante | 🍽️ |
| Moda / Vestuário | 👗 |
| Saúde / Beleza | 💆 |
| Tecnologia | 💻 |
| Imóveis | 🏠 |
| Educação | 📚 |
| Academia / Fitness | 💪 |
| Agronegócio | 🌾 |
| Contabilidade / Finanças | 📊 |
| Advocacia / Jurídico | ⚖️ |
| Construção / Engenharia | 🏗️ |
| E-commerce / Loja | 🛍️ |
| Genérico / Agência | 🎯 |

