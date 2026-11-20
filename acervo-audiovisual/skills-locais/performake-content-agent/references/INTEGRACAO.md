# 🔧 GUIA DE INTEGRAÇÃO TÉCNICA

## 1️⃣ INTEGRAÇÃO COM GOOGLE DRIVE

### Ler Dados do Cliente

**Localização:**
```
📂 Performake Agência
└── 📂 🗄️ CRM — Clientes
    └── 📂 [NOME_CLIENTE]
        └── 📄 Ficha Completa — [NOME_CLIENTE]
```

**Como fazer:**
1. Acesse a pasta do cliente no Drive
2. Procure arquivo: `📄 Ficha Completa — [CLIENTE]`
3. Extrai dados: nome, nicho, site, Instagram, serviços, tom de voz, etc.

---

### Salvar Briefing em Google Doc

**Localização:**
```
📂 Performake Agência
└── 📂 🗄️ CRM — Clientes
    └── 📂 [NOME_CLIENTE]
        └── 📺 BRIEF DIÁRIO — [CLIENTE] — [DATA] [HORA]
```

**Como fazer:**
1. Cria novo Google Doc
2. Nome: `📺 BRIEF DIÁRIO — [CLIENTE] — [DATA] [HORA]`
3. Salva na pasta do cliente
4. Retorna URL para visualizar

---

## 2️⃣ INTEGRAÇÃO COM WEB SEARCH

### Buscas Executadas

```
ETAPA 1: TRENDS DO NICHO
├─ "trend [NICHO] TikTok Instagram [DATA]"
├─ "[NICHO] viral Brasil 2026"
└─ "[NICHO] [CIDADE] trending"

ETAPA 2: CONCORRENTES
├─ "concorrentes [NICHO] [CIDADE]"
├─ "[CONCORRENTE_1] [NICHO] 2026"
└─ "[CONCORRENTE_2] redes sociais"

ETAPA 3: ASSUNTOS DO MOMENTO
├─ "[NICHO] notícia [DATA]"
├─ "[NICHO] economia Brasil"
└─ "oportunidade [NICHO]"

ETAPA 4: ÁUDIO E FORMATO
├─ "áudio viral TikTok 2026"
└─ "trend [NICHO] redes sociais"
```

---

## 3️⃣ AGENDAMENTO AUTOMÁTICO (7h)

### Configuração via `schedule` skill:

```
Nome da Task: "Gerar Briefs Diários — Performake"
Descrição: "Executa agente de conteúdo para todos os clientes ativos"

Tipo: Recorrente
Cron: 0 7 * * * (todo dia, 7 da manhã, qualquer dia)

Timezone: America/Recife (ou seu timezone)

Prompt:
"""
Execute a seguinte rotina AUTOMÁTICA todo dia às 7h:

1. LEIA a planilha mestre: 📊 VISÃO GERAL — Todos os Clientes
   - Filtrar: clientes com status "ATIVO" ou "Proposta Aceita"

2. PARA CADA cliente ativo:
   a. Acessar pasta: /Performake Agência/🗄️ CRM — Clientes/[CLIENTE]/
   b. Ler: 📄 Ficha Completa — [CLIENTE]
   c. Buscar: trends via web_search
   d. Executar skill: redator-conteudo-diario-agencia
   e. Gerar: briefing completo
   f. Salvar: novo Google Doc (📺 BRIEF DIÁRIO — [CLIENTE] — [DATA])
   g. Criar: Artifact para visualizar no Cowork

3. CONSOLIDAR:
   - Notificar: "✅ Briefs gerados para X clientes"
   - Listar URLs dos documentos
   - Log de erros (se houver)

IMPORTANTE:
- Use web_search para TODAS as buscas
- Mantenha qualidade consistente
- Se algum cliente falhar, registre e continue
- Nunca edite documentos existentes
- Sempre crie novo arquivo
"""
```

---

## 4️⃣ INTEGRAÇÃO COM ARTIFACTS (Cowork)

### Visualização Imediata

A skill cria um Artifact para o usuário revisar no Cowork:

```html
<div style="font-family: 'Segoe UI'; max-width: 900px; margin: 0 auto; padding: 20px;">
    
    <h1>📺 Brief Diário — [CLIENTE]</h1>
    
    <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>✅ Gerado:</strong> [DATA_HORA]</p>
        <p><a href="[URL_DRIVE]" target="_blank">📄 Abrir documento completo no Google Drive</a></p>
    </div>
    
    <div style="background: white; padding: 20px; border-left: 4px solid #0066cc;">
        <h2>📌 Resumo Executivo</h2>
        [CONTEÚDO_BRIEF]
    </div>
    
</div>
```

---

## 5️⃣ TESTES RECOMENDADOS

### Teste 1: Leitura de Ficha
```
Input: "MD Prime Carpina"
Output: {
  nome: "MD Prime Carpina",
  nicho: "Moda Feminina",
  site: "[URL]",
  instagram: "@mdprime",
  ...
}
Status: ✅ PASSOU
```

### Teste 2: Web Search
```
Input: buscar trends de moda
Output: [
  "Tend. 1: sustentabilidade",
  "Tend. 2: looks rápidos",
  ...
]
Status: ✅ PASSOU
```

### Teste 3: Geração de Conteúdo
```
Input: prompt parametrizado
Output: 10 reels + 5 carros + 10 stories + ...
Status: ✅ PASSOU
```

### Teste 4: Salvamento em Drive
```
Input: briefing gerado
Output: novo Google Doc criado
URL: https://docs.google.com/document/d/[ID]/edit
Status: ✅ PASSOU
```

---

## 6️⃣ PERMISSÕES NECESSÁRIAS

- ✅ Google Drive (ler + escrever)
- ✅ Web Search
- ✅ Create Documents (Google Drive)
- ✅ Artifacts (Cowork)
- ✅ Read Spreadsheets (mestre de clientes)

---

## 7️⃣ FLUXO DE DADOS

```
┌─────────────────────┐
│  Ficha do Cliente   │
│  (Google Drive)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Web Search        │
│  (Trends, concorr.) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Prompt Adapt.     │
│  (Parametrizável)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Gerar Conteúdo    │
│  (10+5+10+3+5+...)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Salvar em Drive   │
│  (novo Google Doc)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Criar Artifact    │
│  (Cowork)           │
└─────────────────────┘
```

---

**Versão:** 1.0  
**Status:** ✅ Pronto para implementação
