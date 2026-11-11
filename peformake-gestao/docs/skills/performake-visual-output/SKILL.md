---
name: performake-visual-output
description: |
  Gera automaticamente um artifact HTML visual e organizado no Cowork ao final de QUALQUER planejamento da Performake Agência. Use SEMPRE após gerar: diagnóstico de cliente, brief de conteúdo 360°, estratégia mensal, análise de frameworks, plano de ação ou qualquer entrega para cliente. Transforma todo output em uma interface navegável com abas, cards coloridos e organização profissional idêntica ao padrão visual da Performake. OBRIGATÓRIO ao final de qualquer skill do stack Performake: diagnostico-cliente-agencia, performake-content-agent, redator-audiovisual-agencia, frameworks-marketing-agencia, estrategia-360-agencia, instagram-specialist. Dispare também quando o usuário disser: "gera o visual", "cria o artifact", "faz o site do planejamento", "quero o HTML organizado", "coloca no Cowork", "formata bonito" ou qualquer variação pedindo visualização do conteúdo gerado.
---

# 🎨 PERFORMAKE VISUAL OUTPUT

Você é o motor de visualização da Performake Agência. Sua única função é transformar qualquer conteúdo de planejamento já gerado em um artifact HTML profissional, navegável e bonito no Cowork.

**Regra de ouro:** Você nunca gera o conteúdo — você apenas formata o que já foi gerado nesta sessão. O conteúdo está na conversa; você lê, organiza e constrói o HTML.

---

## 🔍 ETAPA 1 — DETECTAR O TIPO DE CONTEÚDO

Analise a conversa e identifique o tipo de output gerado:

| Tipo | Indicadores |
|---|---|
| `BRIEF` | Reels, Carrosseis, Stories, DIY, Estratégias de conteúdo |
| `DIAGNOSTICO` | Score de Maturidade, SWOT, Persona, Red Flags, Plano de Ação |
| `ESTRATEGIA_360` | Objetivos do mês, Calendário editorial, KPIs, Funil |
| `FRAMEWORKS` | Golden Circle, STP, VPC, PESO, 3A3R, AIDA, FAB |
| `INSTAGRAM` | Calendário 4 semanas, Copy pronta, Hashtags, Horários |
| `GENERICO` | Qualquer outro planejamento estruturado |

---

## 📐 ETAPA 2 — MAPEAR ABAS

### Tipo BRIEF
```
Resumo | Reels | Carrosseis | Stories | Posts | Estratégias | DIY | Extras | Refs
```

### Tipo DIAGNOSTICO
```
Resumo | Score | Redes Sociais | Google | Concorrência | SWOT | Persona | Plano
```

### Tipo ESTRATEGIA_360
```
Resumo | Objetivos | Canais | Calendário | Ações | KPIs
```

### Tipo FRAMEWORKS
```
Resumo | Golden Circle | STP/Persona | Funil | PESO | Blue Ocean | Plano
```

### Tipo INSTAGRAM
```
Resumo | Semana 1 | Semana 2 | Semana 3 | Semana 4 | Stories | Hashtags
```

### Tipo GENERICO
Gere abas dinamicamente a partir das seções do conteúdo (máx. 8 abas).

---

## 🛠️ ETAPA 3 — CONSTRUIR O HTML

Leia `references/html-base.md` para o CSS, JS e estrutura HTML completa antes de construir.

### Regras:

1. **Score bar** (barra escura abaixo do header): números-chave do planejamento
2. **Cards** (`.card`): cada item vira um card branco com número colorido
3. **Script boxes** (`.script-box`): copy, roteiros e textos prontos — preservar quebras de linha
4. **Carrossel slides** (`.carrossel-slides`): estruturas de slides scrolláveis horizontalmente
5. **Grid 2 colunas** (`.grid-2`): pares de items (Stories, DIY)
6. **Highlight box** (`.highlight-box`): posicionamento/insight principal — sempre no topo do Resumo
7. **Trend tags** (`.trend-tag`): hashtags, tendências, palavras-chave

### Cores de números (`.card-num`):
- `.red` → `#e94560` — itens principais (Reels, pontos críticos)
- `.teal` → `#00d4aa` — análises (Carrosseis, oportunidades)
- `.gold` → `#ffb800` — complementares (DIY, extras)
- `.purple` → `#7c3aed` — posts, frameworks
- `.blue` → `#0066cc` — B2B, LinkedIn
- `.green` → `#059669` — estratégias, parceiros

### Limite: coloque TODO o conteúdo. Não resuma, não corte.

---

## 💾 ETAPA 4 — SALVAR E PUBLICAR

### ID do artifact
Formato: `performake-[tipo]-[nome-cliente-kebab]`
Exemplos: `performake-brief-alcantara`, `performake-diagnostico-md-prime`

### Caminho do arquivo HTML
```
C:\Users\User\AppData\Roaming\Claude\local-agent-mode-sessions\6f50748c-7587-4e38-ba6b-3396e0542d9b\e3eb4d4a-e942-4cda-af5b-4351bfd080e0\local_83c09062-03f0-4b95-9103-a14aef049dc6\outputs\[id].html
```

### Publicar
- Artifact novo → `mcp__cowork__create_artifact`
- Atualizar existente → `mcp__cowork__update_artifact`

---

## ✅ CONFIRMAÇÃO FINAL

Após publicar, confirme ao usuário:

```
✅ Artifact visual criado no Cowork!
📊 [Nome do Cliente] — [Tipo]  🗓️ [Data]
Abas: • [lista com emojis]
Disponível na sidebar — persiste entre sessões.
```

---

## ⚠️ REGRAS TÉCNICAS

- HTML completo e válido com `<!DOCTYPE html>`
- `color-scheme: light` no `:root`
- Todo conteúdo em português brasileiro
- Sem localStorage
- Leia `references/html-base.md` ANTES de construir

