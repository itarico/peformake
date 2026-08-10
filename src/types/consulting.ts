// Tipos do Serviço de Consultoria

export type InstanceStatus = 'draft' | 'in_progress' | 'completed';
export type AnalysisType = 'diagnostico' | 'direcionamento' | 'plano_acao' | 'analise_metricas' | 'sintese_mensal' | 'campanha' | 'audiovisual' | 'design_grafico' | 'social_midia';
export type AnalysisScope = 'framework' | 'month' | 'client';

export interface Framework {
  id: string;
  slug: string;
  name: string;
  objective: string;
  when_to_use: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface FrameworkQuestion {
  id: string;
  framework_id: string;
  question_order: number;
  question_text: string;
  field_type: string;
  placeholder: string | null;
  is_required: boolean;
  created_at: string;
}

export interface ConsultingMonth {
  id: string;
  client_id: string;
  year: number;
  month: number;
  is_complete: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  framework_instances?: FrameworkInstance[];
}

export interface FrameworkInstance {
  id: string;
  consulting_month_id: string;
  framework_id: string;
  status: InstanceStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  framework?: Framework;
  answers?: FrameworkAnswer[];
  analyses?: AIAnalysis[];
}

export interface FrameworkAnswer {
  id: string;
  instance_id: string;
  question_id: string;
  answer_text: string | null;
  created_at: string;
  updated_at: string;
  question?: FrameworkQuestion;
}

export interface AIAnalysis {
  id: string;
  instance_id: string;
  analysis_type: string;
  analysis_scope: string;
  content: string;
  prompt_version: string | null;
  model_used: string | null;
  generated_at: string;
}

export interface ClientStrategicData {
  id: string;
  client_id: string;
  data_key: string;
  data_value: string;
  source_framework: string | null;
  created_at: string;
  updated_at: string;
}

// Labels
export const INSTANCE_STATUS_LABELS: Record<InstanceStatus, string> = {
  draft: 'Rascunho',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
};

export const INSTANCE_STATUS_COLORS: Record<InstanceStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/20 text-warning',
  completed: 'bg-success/20 text-success',
};

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  diagnostico: 'Diagnóstico Estratégico',
  direcionamento: 'Direcionamento Mensal',
  plano_acao: 'Plano de Ação',
  analise_metricas: 'Análise de Métricas',
  sintese_mensal: 'Síntese do Mês',
  campanha: 'Estratégia de Campanha',
  audiovisual: 'Planejamento Audiovisual',
  design_grafico: 'Planejamento Design Gráfico',
  social_midia: 'Calendário Social Mídia',
};

export const FRAMEWORK_ICONS: Record<string, string> = {
  'swot': '📊',
  'stp': '🎯',
  'persona': '👤',
  'gap-analysis': '📈',
  '5w2h': '✅',
  'sostac': '📋',
  '3a3r': '🔄',
  'metrics-analysis': '📉',
  'social-media-planning': '📱',
  'content-planning': '📝',
  'niche-research': '🔍',
  'seasonality-analysis': '📅',
  'campaign-strategy': '📢',
  'audiovisual-planning': '🎬',
  'design-planning': '🎨',
};

// Frameworks that need monthly updates
export const MONTHLY_FRAMEWORKS = [
  'metrics-analysis',
  'social-media-planning',
  'seasonality-analysis',
  'campaign-strategy',
  'audiovisual-planning',
  'design-planning',
];

// Base/foundational frameworks (update less frequently)
export const BASE_FRAMEWORKS = [
  'swot',
  'stp',
  'persona',
  'gap-analysis',
  '5w2h',
  'sostac',
  '3a3r',
  'niche-research',
  'content-planning',
];
