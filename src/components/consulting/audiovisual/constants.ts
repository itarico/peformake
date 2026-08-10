// Audiovisual Module Constants

export const OBJETIVOS_ESTRATEGICOS = [
  'Autoridade',
  'Conversão',
  'Engajamento',
  'Educação',
  'Posicionamento',
  'Relacionamento',
  'Prova Social',
  'Aquecimento de Público',
  'Lançamento',
  'Retenção',
  'Awareness',
  'Consideração',
];

export const CANAIS_PUBLICACAO = [
  'Instagram Reels',
  'Instagram Feed',
  'Stories',
  'TikTok',
  'YouTube Shorts',
  'YouTube Longo',
  'LinkedIn',
  'Facebook',
  'Twitter/X',
];

export const DURACOES = [
  'Até 15s',
  '30s',
  '60s',
  '90s',
  '3-5 minutos',
  '+10 minutos',
  'Livre (IA decide)',
];

export const TONS_EMOCIONAIS = [
  'Educacional',
  'Inspirador',
  'Provocativo',
  'Contraintuitivo',
  'Polêmico',
  'Técnico',
  'Leve',
  'Emocional',
  'Humorístico',
  'Autoridade Silenciosa',
  'Urgente',
  'Empático',
];

export const ESTRATEGIAS_PERSUASIVAS = [
  'Storytelling',
  'Dor → Solução',
  'Erro → Correção',
  'Prova Social',
  'Autoridade',
  'Curiosidade',
  'Polarização Estratégica',
  'Dados e Estatísticas',
  'Bastidores',
  'FOMO',
  'Neuromarketing',
  'Reciprocidade',
  'Escassez',
  'Urgência',
  'Antecipação',
];

export const ESTAGIOS_FUNIL = [
  'Descoberta',
  'Consideração',
  'Decisão',
  'Retenção',
  'Advocacia',
];

// Narrative Structures
export const ESTRUTURAS_CURTAS = [
  { name: 'Gancho → Insight', description: 'Abertura impactante seguida de insight valioso' },
  { name: 'Pergunta → Resposta', description: 'Pergunta provocadora com resposta surpreendente' },
  { name: 'Mito → Verdade', description: 'Desmascarar crença comum com a verdade' },
  { name: 'Dor → Alívio', description: 'Identificar dor e oferecer alívio imediato' },
  { name: 'Erro → Correção', description: 'Mostrar erro comum e como corrigir' },
];

export const ESTRUTURAS_MEDIAS = [
  { name: 'Gancho → Dor → Solução', description: 'Estrutura clássica de vendas' },
  { name: 'Contexto → Problema → Insight', description: 'Construir entendimento antes do insight' },
  { name: 'História → Aprendizado → Aplicação', description: 'Narrativa com lição prática' },
  { name: 'Afirmação → Explicação → CTA', description: 'Afirmação bold seguida de explicação' },
  { name: 'Antes → Durante → Depois', description: 'Transformação em 3 atos' },
];

export const ESTRUTURAS_LONGAS = [
  { name: 'Gancho → Contexto → Dor → Virada → Solução → CTA', description: 'Estrutura completa de persuasão' },
  { name: 'Jornada do Herói', description: 'Chamado → Desafio → Transformação → Retorno' },
  { name: 'Análise → Diagnóstico → Estratégia → Execução → Resultado', description: 'Framework de consultoria' },
  { name: 'Storytelling Estratégico Completo', description: 'Narrativa imersiva com múltiplos elementos' },
  { name: 'Tutorial Detalhado', description: 'Passo a passo completo com demonstração' },
];

export const ESTRUTURAS_VIRAIS = [
  { name: 'Contraintuitivo Progressivo', description: 'Desafiar expectativas gradualmente' },
  { name: 'Polarização Controlada', description: 'Posicionamento forte que divide opiniões' },
  { name: 'Educacional com Virada Emocional', description: 'Ensino + impacto emocional no final' },
  { name: 'Bastidores de Autoridade', description: 'Revelar processos internos de forma autêntica' },
  { name: 'Tese → Antítese → Síntese', description: 'Dialética para construir argumento irrefutável' },
  { name: 'Pattern Interrupt', description: 'Quebra de padrão inesperada' },
  { name: 'Open Loop', description: 'Criar curiosidade que mantém até o final' },
];

export const ALL_ESTRUTURAS = [
  { category: 'Curtas (2 etapas)', structures: ESTRUTURAS_CURTAS },
  { category: 'Médias (3-4 etapas)', structures: ESTRUTURAS_MEDIAS },
  { category: 'Longas (5+ etapas)', structures: ESTRUTURAS_LONGAS },
  { category: 'Avançadas/Virais', structures: ESTRUTURAS_VIRAIS },
];
