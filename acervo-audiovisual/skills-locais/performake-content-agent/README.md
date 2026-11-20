# 📺 SKILL: REDATOR DE CONTEÚDO DIÁRIO PARA AGÊNCIA

## 📦 CONTEÚDO DA SKILL

```
redator-conteudo-diario-agencia/
├── SKILL.md                    # Documentação completa da skill
├── README.md                   # Este arquivo
├── references/
│   ├── ESTRUTURA_DRIVE.md      # Estrutura real do Google Drive
│   ├── PROMPT_TEMPLATE.md      # Template parametrizável
│   └── INTEGRACAO.md           # Guia de integração
└── scripts/
    └── [futuros scripts auxiliares]
```

## 🚀 INSTALAÇÃO

1. Baixe este arquivo `.skill`
2. Instale no seu Cowork/Claude Code
3. Comece a usar!

## 💡 COMO USAR

### Execução Sob Demanda:
```
User: "Gera o briefing de conteúdo do dia para [CLIENTE]"
```

### Agendamento Automático (7h):
Configure uma scheduled task com a skill:
```
Cron: 0 7 * * *
Descrição: "Gerar Briefs Diários"
```

## ✅ O QUE A SKILL ENTREGA

- ✅ 10 Reels com roteiros completos
- ✅ 5 Carrosseis com estrutura de slides
- ✅ 10 Stories para distribuição ao longo do dia
- ✅ 3 Estratégias de marketing acionáveis
- ✅ 5 DIY (projetos faça-você-mesmo)
- ✅ 10 Ideias extra para inspiração
- ✅ Links de referências e vídeos virais
- ✅ Assuntos do momento com ações

## 📊 INTEGRAÇÃO

A skill se integra com:
- **Google Drive** — lê dados do cliente, salva briefs
- **Web Search** — busca trends, concorrentes, assuntos
- **Google Docs** — cria documentos no Drive
- **Artifacts** — exibe no Cowork
- **Scheduled Tasks** — agendamento automático

## 🔧 CONFIGURAÇÃO INICIAL

1. **Dados do cliente no Drive:**
   - Pasta: `/Performake Agência/🗄️ CRM — Clientes/[CLIENTE]/`
   - Arquivo: `📄 Ficha Completa — [CLIENTE]`

2. **Agendamento (opcional):**
   - Use skill `schedule`
   - Cron: `0 7 * * *`
   - Descrição: "Gerar Briefs Diários"

3. **Permissões:**
   - Google Drive (ler + escrever)
   - Web Search
   - Artifacts (Cowork)

## 📝 EXEMPLO DE RESULTADO

O briefing gerado terá este formato:

```
══════════════════════════════════════════
[CLIENTE] — BRIEF DE CONTEÚDO
03/06/2026 07:00
══════════════════════════════════════════

🔥 TREND DO DIA: [tendência principal]

🎯 OPORTUNIDADE IMEDIATA: [1 ação concreta]

📱 CONTEÚDO PRIORITÁRIO: [qual reel/carrossel]

📊 CONCORRÊNCIA: [o que estão fazendo]

💡 INSIGHT: [observação estratégica]

⚠️ EVITAR: [1 coisa para não fazer]

══════════════════════════════════════════

[Seguido de 10 Reels, 5 Carrosseis, 10 Stories, 3 Estratégias, 5 DIY, extras, links]
```

## 🎯 PRÓXIMOS PASSOS

1. Instale a skill
2. Teste com um cliente (ex: MD Prime Carpina)
3. Configure agendamento para 7h
4. Deixe rodar automaticamente!

## 📞 SUPORTE

Se precisar ajustar:
- Triggers da skill
- Formato de entrega
- Integração com Drive
- Agendamento

Entre em contato com o time da Performake.

---

**Versão:** 2.0  
**Status:** ✅ Pronta para uso  
**Data:** 03/06/2026
