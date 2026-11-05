# Conexões do Designer IA — status e o que falta

Checado em 05/11/2026 nesta sessão (cloud).

## ✅ Conectados e funcionando

| Conector | O que dá para fazer | Observação |
|---|---|---|
| **Canva** | Buscar/editar/gerar designs, exportar, redimensionar, remover fundo, gerar imagem, brand templates | Conta tem designs de MB Centrífugas, MF Máquinas, Disalp, SN Distribuidora, Will Motos, Pizzaria do Vando. **0 Brand Kits cadastrados** ⚠️ |
| **Figma** | Ler/criar arquivos, design system, design→código, FigJam, gerar imagem | Usuário `italo`, plano **Starter, assento "View"** ⚠️ — limita edição em arquivos do time |
| **Lovable** | Criar/editar sites e landing pages, deploy | Repo `peformake` é projeto Lovable |
| **Vercel** | Deploy, domínios, analytics de páginas | — |
| **Gamma** | Apresentações, documentos, posts sociais, imagens | Bom para propostas e carrosséis rápidos |
| **Google Drive / Docs / Sheets** | Fichas de clientes (CRM), logos, entregas | Fonte da verdade das marcas |
| **Gmail / Calendar** | Enviar aprovações, agendar | — |
| **Windsor.ai** | Ler dados de Meta Ads, Instagram, GA4… e **publicar** post no Instagram / mexer em campanhas | Fecha o ciclo: criativo → anúncio → resultado |
| **Supabase** | Banco do app Performake (tabela `arts`, briefings) | — |
| **Firecrawl** | Pesquisa web e raspagem de referências | Usado no radar semanal |

## ❌ Configurados mas FALHANDO (rede do ambiente bloqueia — proxy 403)

Asana, Linear, Intercom, Notion, Slack, Atlassian, Ahrefs, Amplitude, HubSpot, Klaviyo, Similarweb, Supermetrics, Zoom.
→ Correção: liberar os hosts na configuração de rede do ambiente cloud (Settings → ambiente → Network) ou usar a partir do app desktop. Para design, os mais úteis são **Notion** (banco de referências) e **Slack** (aprovação com equipe).

## 🔌 Conectar para ficar mais poderoso (prioridade)

| # | O que | Por quê | Como |
|---|---|---|---|
| 1 | **Brand Kits no Canva** (1 por cliente) | Toda arte gerada já sai com cor/fonte/logo certos — principal causa de "fora da marca" | Canva → Marca → criar kit (exige Canva Pro/Teams) |
| 2 | **Assento Figma "Full/Dev"** | Para o Claude editar arquivos do time e criar bibliotecas | Figma → Admin → upgrade do seat |
| 3 | **Gerador de imagem com texto confiável** (Gemini/Nano Banana, GPT Image, Ideogram) via API | Imagens fotorrealistas de produto/carro/placa solar | Chave de API no ambiente (request_credential) |
| 4 | **Gerador de vídeo** (Veo, Runway, Kling) + **CapCut/Canva vídeo** | Reels e criativos em vídeo | API / Canva `create-video` já disponível |
| 5 | **Meta Ad Library / Pinterest** | Banco de referências por nicho | Firecrawl + Windsor |
| 6 | **Adobe (Firefly/Express)** | Imagens comercialmente seguras (licenciadas) | Conector Adobe se disponível |
| 7 | **Banco de fotos** (Unsplash/Pexels/Freepik) | Fotos reais em vez de IA quando o produto é real | API key |
| 8 | **GitHub com permissão de push** | Várias sessões ficaram bloqueadas sem conseguir enviar | claude.ai/connect-github + instalar app Claude no repo |
| 9 | **Notion ou Drive estruturado** "Banco de Referências" | Memória visual acumulativa entre chats | Pasta Drive `/Design IA/Referências/[nicho]` |
