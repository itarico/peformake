import { ChatConfig } from './types';

export const CHAT_CONFIGS: Record<string, ChatConfig> = {
  campaign: {
    type: 'campaign',
    title: 'Estratégia de Campanha',
    description: 'Monte funis completos e estratégias avançadas de tráfego pago',
    icon: 'Target',
    initialMessage: `Olá! Sou sua estrategista de Tráfego Pago e Performance. 🎯

Vou te ajudar a criar a MELHOR ESTRATÉGIA DE CAMPANHA para maximizar resultados.

Primeiro, configure os parâmetros acima e depois me conte:
• Qual produto/serviço será promovido e qual o ticket médio?
• Qual a meta de resultado (leads, vendas, ROAS)?
• Já rodou campanhas antes? Qual foi o CPA/ROAS?
• Tem landing page ou o tráfego vai para WhatsApp/Instagram?

Vou construir um funil estratégico completo com você!`,
    params: [
      { key: 'platform', label: 'Plataforma', options: ['Meta Ads (Facebook/Instagram)', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'Multi-plataforma'] },
      { key: 'objective', label: 'Objetivo Principal', options: ['Geração de Leads', 'Vendas/Conversão', 'Mensagens WhatsApp', 'Tráfego para Site/LP', 'Reconhecimento de Marca'] },
      { key: 'budget', label: 'Orçamento Mensal', options: ['R$ 500 - 1.000', 'R$ 1.000 - 3.000', 'R$ 3.000 - 10.000', 'R$ 10.000 - 30.000', 'R$ 30.000+'] },
      { key: 'funnel', label: 'Estrutura do Funil', options: ['Funil Completo (Topo+Meio+Fundo)', 'Topo (Awareness + Alcance)', 'Meio (Consideração + Engajamento)', 'Fundo (Conversão Direta)', 'Remarketing + Retenção'] },
      { key: 'ticket', label: 'Ticket Médio', options: ['Até R$ 50', 'R$ 50 - 200', 'R$ 200 - 1.000', 'R$ 1.000 - 5.000', 'R$ 5.000+'] },
      { key: 'destination', label: 'Destino do Tráfego', options: ['Landing Page', 'WhatsApp', 'Instagram DM', 'E-commerce', 'Formulário de Lead'] },
    ],
    quickPrompts: [
      { label: '🔥 Funil Estratégico Completo', prompt: 'Monte o FUNIL DE CAMPANHA COMPLETO: estruture campanhas de Topo (awareness), Meio (consideração) e Fundo (conversão), com orçamento distribuído, públicos específicos para cada etapa, e métricas de passagem entre fases.' },
      { label: '🎯 Públicos e Segmentação', prompt: 'Defina a SEGMENTAÇÃO AVANÇADA: crie 3-5 conjuntos de público (interesse, comportamento, lookalike 1%, 3%, 5%, remarketing, custom audience), com exclusões para evitar sobreposição e estimativa de tamanho de audiência.' },
      { label: '✍️ Copies e Criativos', prompt: 'Gere COPIES PRONTAS PARA USO: para cada etapa do funil, crie 3 variações de headline, texto principal e CTA. Inclua ângulos diferentes (dor, desejo, prova social, urgência) para teste A/B.' },
      { label: '📊 KPIs e Projeção de ROI', prompt: 'Calcule a PROJEÇÃO DE RESULTADOS: com base no orçamento e ticket médio, projete CPM, CPC, CPL, CPA, taxa de conversão esperada, número de leads/vendas e ROAS estimado. Inclua benchmarks do setor.' },
      { label: '🔄 Estratégia de Remarketing', prompt: 'Monte a ESTRATÉGIA DE REMARKETING: defina janelas de tempo (1-3 dias, 7 dias, 14 dias, 30 dias), gatilhos de remarketing (visitou LP, abandonou carrinho, engajou), e sequência de mensagens para cada público.' },
      { label: '⚡ Preencher Campanha de Tráfego', prompt: 'Com base em toda a estratégia definida, gere os DADOS PRONTOS PARA CRIAR A CAMPANHA no sistema: nome da campanha, objetivo (OUTCOME_TRAFFIC/LEADS/SALES), orçamento diário recomendado, texto primário do anúncio, headline, descrição, CTA recomendado, faixa etária e interesses de segmentação.' },
    ],
    generateLabel: '🚀 Gerar Plano Estratégico Completo',
    generatePrompt: `Com base em TODOS os dados coletados, pesquisa de mercado e dados estratégicos do cliente, gere agora o PLANO ESTRATÉGICO DE CAMPANHA DEFINITIVO seguindo OBRIGATORIAMENTE as 10 ETAPAS:

1. DIAGNÓSTICO: Tipo de negócio, ticket médio, ciclo de decisão, capacidade operacional, orçamento, objetivo
2. PADRÃO ESTRATÉGICO: Qual padrão escolhido (local/consultivo/e-commerce/branding/expansão) e POR QUÊ
3. ESTRUTURA DA CAMPANHA: Tipo, estrutura (minimalista/teste/funil), modelo de orçamento (ABO/CBO) com justificativa
4. CONSTRUÇÃO DE PÚBLICO: Geográfica + Demográfica + Segmentação detalhada (broad/interesses/lookalike/remarketing)
5. NOMENCLATURA PROFISSIONAL: Nome da campanha, conjunto e criativos seguindo padrão OBJ|DESTINO|ÂNGULO|LOCAL|DATA
6. CRIATIVOS E ÂNGULOS: Tipo (transformação/oferta/autoridade/prova social), roteiro do gancho, formato ideal
7. COPY COMPLETA: Texto principal, headline, CTA com ângulo psicológico (urgência/status/dor/escassez)
8. MÉTRICAS ESPERADAS: CPM, CTR, CPC, CPL, conversão, ROAS projetado, ponto de equilíbrio (baseados no NICHO)
9. REGRAS DE OTIMIZAÇÃO: Pausa, escala, frequência máxima, quando remarketing, quando novo público
10. DADOS PARA O SISTEMA: Inclua OBRIGATORIAMENTE o bloco ---CAMPAIGN_DATA_START--- / ---CAMPAIGN_DATA_END--- com todos os campos preenchidos

IMPORTANTE: A estratégia deve ser 100% ESPECÍFICA para este nicho. Se ela puder servir para qualquer negócio, REESTRUTURE.`,
  },

  social_media: {
    type: 'social_media',
    title: 'Planejamento Social Media',
    description: 'Crie estratégias completas de conteúdo para redes sociais',
    icon: 'MessageSquare',
    initialMessage: `Olá! Sou sua estrategista de Social Media. 📱

Vou te ajudar a criar um planejamento completo e estratégico.

Selecione os parâmetros iniciais e me conte:
• Quais são os principais pilares de conteúdo?
• Qual tom de voz da marca?
• Tem alguma campanha ou lançamento previsto?

Vou fazer as perguntas certas para gerar o melhor conteúdo!`,
    params: [
      { key: 'platform', label: 'Plataforma Principal', options: ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'Multi-plataforma'] },
      { key: 'contentType', label: 'Foco de Conteúdo', options: ['Feed + Stories', 'Reels/Vídeos Curtos', 'Carrosséis Educativos', 'Mix Completo'] },
      { key: 'frequency', label: 'Frequência', options: ['3x por semana', '5x por semana', 'Diário', '2x por semana'] },
      { key: 'tone', label: 'Tom de Voz', options: ['Profissional', 'Descontraído', 'Inspiracional', 'Educativo', 'Humorístico'] },
    ],
    quickPrompts: [
      { label: '📅 Calendário Semanal', prompt: 'Crie um calendário editorial completo para a próxima semana com posts, legendas e horários.' },
      { label: '✨ Ideias de Reels', prompt: 'Gere 5 ideias de Reels virais para o nicho, com roteiro e música sugerida.' },
      { label: '#️⃣ Estratégia de Hashtags', prompt: 'Monte uma estratégia completa de hashtags: nicho, alcance, comunidade e branded.' },
    ],
    generateLabel: '📋 Gerar Plano de Social Media Completo',
    generatePrompt: 'Com base em todos os dados coletados e na pesquisa de mercado, gere agora o PLANO COMPLETO DE SOCIAL MEDIA. Inclua: pilares de conteúdo com %, calendário editorial detalhado, legendas prontas, hashtags, horários ideais, estratégia de Reels, Stories e engajamento.',
  },

  design: {
    type: 'design',
    title: 'Planejamento de Design',
    description: 'Crie briefings completos e estratégicos para design gráfico',
    icon: 'Palette',
    initialMessage: `Olá! Sou sua diretora de arte. 🎨

Vou te ajudar a criar briefings detalhados e estratégicos.

Selecione o **tipo de arte** e o destino, depois me conte:
• Qual é o objetivo da peça?
• Que mensagem quer transmitir?
• Tem referências visuais ou estilo em mente?

Vou criar briefings prontos para o designer executar!`,
    params: [
      { key: 'artType', label: 'Tipo de Arte', options: ['Post Estático', 'Carrossel', 'Stories', 'Ads (Anúncio)', 'Banner', 'Thumbnail'] },
      { key: 'destination', label: 'Destino', options: ['Instagram Feed', 'Instagram Stories', 'Facebook', 'Google Ads', 'WhatsApp', 'YouTube', 'Site/Landing Page'] },
      { key: 'objective', label: 'Objetivo', options: ['Promover Produto', 'Construir Marca', 'Evento/Lançamento', 'Promoção/Desconto', 'Informativo/Educativo'] },
      { key: 'style', label: 'Estilo Visual', options: ['Minimalista', 'Moderno/Clean', 'Ousado/Vibrante', 'Elegante/Luxo', 'Divertido/Pop', 'Corporativo'] },
    ],
    quickPrompts: [
      { label: '🖼️ Pack de Artes', prompt: 'Crie briefings para um pack completo de 4 artes com conceito visual unificado.' },
      { label: '📐 Direção de Arte', prompt: 'Defina a direção de arte completa: paleta de cores, tipografia, elementos visuais e composição.' },
      { label: '📸 Carrossel Educativo', prompt: 'Crie um briefing de carrossel educativo com 6-8 slides, cada um com headline e conteúdo.' },
      { label: '🔍 Mais Informações', prompt: 'Para cada arte, gere uma versão EXPANDIDA e DETALHADA com: Headline principal (máx 6 palavras) com 3 variações alternativas, Subtítulo completo com copy persuasiva, CTA com ângulo psicológico (urgência, escassez, prova social), Texto de apoio para legenda, Descrição visual técnica detalhada para o designer, Paleta de cores com códigos HEX, Observações de composição e hierarquia visual.' },
    ],
    generateLabel: '🎨 Gerar Briefings de Design Completos',
    generatePrompt: 'Com base em todos os dados coletados, no tipo de arte selecionado e na pesquisa de tendências visuais, gere agora BRIEFINGS DE DESIGN COMPLETOS adaptados ao formato escolhido. Para cada peça inclua: título, headline, subtítulo, CTA, descrição visual detalhada, paleta de cores, elementos, tipografia e observações técnicas. ADAPTE a estrutura ao tipo de arte selecionado.',
  },

  video: {
    type: 'video',
    title: 'Planejamento de Vídeo',
    description: 'Crie roteiros e estratégias para conteúdo audiovisual',
    icon: 'Video',
    initialMessage: `Olá! Sou seu roteirista e estrategista de vídeo. 🎬

Vou te ajudar a criar roteiros completos e estratégicos.

Selecione os parâmetros e me conte:
• Qual é o tema/assunto do vídeo?
• Qual mensagem principal quer passar?
• Tem referências de estilo ou formato?

Vou criar roteiros com ganchos poderosos e alta retenção!`,
    params: [
      { key: 'platform', label: 'Plataforma', options: ['Instagram Reels', 'TikTok', 'YouTube', 'YouTube Shorts', 'Multi-plataforma'] },
      { key: 'duration', label: 'Duração', options: ['15-30 segundos', '30-60 segundos', '1-3 minutos', '5-10 minutos', '10+ minutos'] },
      { key: 'style', label: 'Estilo', options: ['Tutorial/How-to', 'Bastidores', 'Depoimento', 'Produto em Ação', 'Storytelling', 'Trend/Viral', 'Educativo'] },
      { key: 'objective', label: 'Objetivo', options: ['Engajamento', 'Awareness', 'Vendas', 'Autoridade', 'Entretenimento'] },
    ],
    quickPrompts: [
      { label: '🎬 Roteiro Completo', prompt: 'Crie um roteiro completo com gancho, desenvolvimento, CTA e dicas de gravação.' },
      { label: '🔥 5 Ideias Virais', prompt: 'Gere 5 ideias de vídeos com potencial viral para o nicho, com gancho e formato.' },
      { label: '📅 Série de Vídeos', prompt: 'Planeje uma série de 4 vídeos com tema unificado, cada um com roteiro resumido.' },
    ],
    generateLabel: '🎬 Gerar Plano de Vídeo Completo',
    generatePrompt: 'Com base em todos os dados coletados e na pesquisa de tendências, gere agora ROTEIROS COMPLETOS. Para cada vídeo inclua: gancho (3 primeiros segundos), estrutura narrativa, desenvolvimento, CTA, legenda sugerida, dicas de gravação, música/áudio e observações estratégicas.',
  },
};
