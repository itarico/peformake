import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, Save, Loader2, Users, TrendingUp, RotateCcw, HeadphonesIcon, Brain,
  BookOpen, Info, FileText, Shield, Target, MessageSquare, Zap,
  DollarSign, MapPin, AlertTriangle, Gauge, Volume2, ChevronDown, ChevronRight,
  ArrowRight, Link, Key, ImageIcon, Radio, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import AgentSliderField from './agent-config/AgentSliderField';
import AgentKnowledgeTab from './agent-config/AgentKnowledgeTab';
import AgentQuestionsTab from './agent-config/AgentQuestionsTab';
import AgentFileUpload from './agent-config/AgentFileUpload';
import { saveCrmAgentConfig } from '@/lib/crmConfigManager';

interface Props {
  clientId: string;
  clientName: string;
}

const AGENT_TYPES = [
  { type: 'sdr', label: 'SDR', description: 'Qualificação de leads', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  { type: 'sales', label: 'Vendas', description: 'Fechamento e negociação', icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/30' },
  { type: 'recovery', label: 'Recuperador', description: 'Reativação de inativos', icon: RotateCcw, color: 'text-orange-500', bgColor: 'bg-orange-500/10 border-orange-500/30' },
  { type: 'support', label: 'Suporte', description: 'Pós-venda e FAQ', icon: HeadphonesIcon, color: 'text-purple-500', bgColor: 'bg-purple-500/10 border-purple-500/30' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Profissional' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'empathetic', label: 'Empático' },
  { value: 'assertive', label: 'Assertivo' },
];

const SALES_INTENSITY_OPTIONS = [
  { value: 'passive', label: 'Passivo — Só responde perguntas' },
  { value: 'moderate', label: 'Moderado — Sugere produtos' },
  { value: 'aggressive', label: 'Agressivo — Pressiona para venda' },
];

const SALES_MODEL_OPTIONS = [
  { value: 'consultiva', label: 'Consultiva — Entende antes de vender' },
  { value: 'direta', label: 'Direta — Apresenta oferta de cara' },
  { value: 'educacional', label: 'Educacional — Educa e depois vende' },
  { value: 'spin', label: 'SPIN — Situação→Problema→Implicação→Necessidade' },
];

const REACTIVATION_STRATEGY_OPTIONS = [
  { value: 'pergunta_aberta', label: 'Pergunta aberta — "Como posso ajudar?"' },
  { value: 'novidade', label: 'Novidade — Apresenta algo novo' },
  { value: 'oferta', label: 'Oferta — Desconto/promoção' },
  { value: 'conteudo', label: 'Conteúdo — Compartilha dica/material' },
  { value: 'urgencia', label: 'Urgência — Cria senso de urgência' },
];

const RESPONSE_STRUCTURE_OPTIONS = [
  { value: 'natural', label: 'Natural — Fluxo livre' },
  { value: 'lista', label: 'Lista — Pontos organizados' },
  { value: 'pergunta_resposta', label: 'P&R — Uma pergunta por vez' },
  { value: 'storytelling', label: 'Storytelling — Narrativa persuasiva' },
];

const AGENT_HINTS: Record<string, string> = {
  sdr: 'O agente SDR qualifica leads novos fazendo perguntas estratégicas. Descreva: como se apresentar, quais perguntas fazer, perfil ideal de cliente, e quando considerar qualificado.',
  sales: 'O agente de Vendas assume leads qualificados e foca em fechar negócios. Descreva: estratégia de venda, como apresentar preços, quando oferecer descontos, e como conduzir ao fechamento.',
  recovery: 'O Recuperador reativa leads inativos. Descreva: após quantos dias abordar, qual estratégia usar, máximo de tentativas, e tom de abordagem.',
  support: 'O agente de Suporte ajuda clientes no pós-venda. Descreva: como responder dúvidas, quando escalar para humano, e base de conhecimento.',
};

const defaultConfig: Record<string, any> = {
  is_enabled: true, max_chars: 500, allow_links: false, allow_discount: false,
  use_emojis: true, allow_ai_identification: false, custom_instructions: '',
  agent_name: '', tone: 'professional', allow_media: false, sales_intensity: 'moderate',
  reactivation_minutes: 120, max_attempts: 3, formality_level: 5, authority_level: 5,
  curiosity_level: 5, insistence_level: 5, min_score_qualified: 70, max_score_unqualified: 30,
  sales_model: 'consultiva', pressure_level: 5, max_discount_percent: 0, use_anchoring: false,
  use_urgency: false, min_confidence_sale: 80, reactivation_days: 3,
  reactivation_strategy: 'pergunta_aberta', crisis_keywords: 'cancelamento,reclamação,procon,processar',
  escalate_on_crisis: true, business_hours_only: false, business_hours_start: '08:00',
  business_hours_end: '18:00', focus_products: '', ideal_client_profile: '',
  ideal_company_type: '', min_budget: null, min_ticket: null, required_problem: '',
  response_structure: 'natural', target_region: '',
  // New fields
  success_criteria: '', auto_advance_to: '', pix_key: '', useful_links: '',
  send_product_images: false,
  activation_mode: 'always_on', activation_keywords: '', human_takeover_minutes: 30,
};

// Collapsible Section helper
function Section({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 space-y-4 pb-4">{children}</CardContent>}
    </Card>
  );
}

export default function CrmAgentConfig({ clientId, clientName }: Props) {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState('sdr');
  const [activeSubTab, setActiveSubTab] = useState('config');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: cfgs }, { data: kb }, { data: qs }] = await Promise.all([
      supabase.from('crm_agent_configs').select('*').eq('client_id', clientId),
      supabase.from('crm_agent_knowledge').select('*').eq('client_id', clientId).eq('is_active', true),
      supabase.from('crm_agent_questions').select('*').eq('client_id', clientId).order('question_order'),
    ]);

    const configMap: Record<string, any> = {};
    AGENT_TYPES.forEach(a => {
      const existing = cfgs?.find(c => c.agent_type === a.type);
      configMap[a.type] = existing ? { ...defaultConfig, ...existing } : { ...defaultConfig, agent_type: a.type };
    });
    setConfigs(configMap);
    setKnowledge(kb || []);
    setQuestions(qs || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const updateField = (agentType: string, field: string, value: any) => {
    setConfigs(prev => ({ ...prev, [agentType]: { ...prev[agentType], [field]: value } }));
  };

  const save = async (agentType: string) => {
    setSaving(agentType);
    const cfg = configs[agentType];
    const upsertData = { ...cfg, client_id: clientId, agent_type: agentType };
    // Remove fields that don't exist on crm_agent_configs table
    const {
      id, created_at, updated_at,
      business_hours_only, business_hours_start, business_hours_end,
      auto_respond_on_new, persona, instructions, is_enabled: _botEnabled,
      ...dataWithoutId
    } = upsertData;

    // Re-add is_enabled from the original cfg (it exists on crm_agent_configs)
    const saveData = { ...dataWithoutId, is_enabled: cfg.is_enabled };

    try {
      await saveCrmAgentConfig(clientId, agentType, saveData);
      toast.success(`Agente ${agentType.toUpperCase()} salvo!`);
      await loadAll();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Brain className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Controle total sobre cada agente: personalidade, limites, estratégia de venda, qualificação, reativação e mais.
        </p>
      </div>

      {/* Agent selector */}
      <div className="grid grid-cols-4 gap-2">
        {AGENT_TYPES.map(({ type, label, description, icon: Icon, color, bgColor }) => {
          const cfg = configs[type];
          const isActive = activeAgent === type;
          return (
            <button
              key={type}
              onClick={() => { setActiveAgent(type); setActiveSubTab('config'); }}
              className={`p-3 rounded-lg border text-left transition-all ${isActive ? bgColor : 'border-border hover:border-border/80 hover:bg-muted/30'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <Badge variant={cfg?.is_enabled ? 'default' : 'secondary'} className="text-xs h-4 px-1">
                  {cfg?.is_enabled ? 'On' : 'Off'}
                </Badge>
              </div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </button>
          );
        })}
      </div>

      {AGENT_TYPES.map(({ type, label, icon: Icon, color }) => {
        if (activeAgent !== type) return null;
        const cfg = configs[type] || defaultConfig;

        return (
          <div key={type} className="space-y-4">
            {/* Header with toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${color}`} />
                <p className="font-semibold text-sm">{cfg.agent_name || `Agente ${label}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={cfg.is_enabled} onCheckedChange={v => updateField(type, 'is_enabled', v)} />
                <Badge variant={cfg.is_enabled ? 'default' : 'secondary'}>
                  {cfg.is_enabled ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>

            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
              <TabsList className="w-full">
                <TabsTrigger value="config" className="flex-1 text-xs gap-1">
                  <Bot className="h-3.5 w-3.5" /> Config
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex-1 text-xs gap-1">
                  <Gauge className="h-3.5 w-3.5" /> Comportamento
                </TabsTrigger>
                <TabsTrigger value="questions" className="flex-1 text-xs gap-1">
                  <Target className="h-3.5 w-3.5" /> Perguntas
                </TabsTrigger>
                <TabsTrigger value="files" className="flex-1 text-xs gap-1">
                  <FileText className="h-3.5 w-3.5" /> Arquivos
                </TabsTrigger>
                <TabsTrigger value="knowledge" className="flex-1 text-xs gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> FAQ
                </TabsTrigger>
              </TabsList>

              {/* ========== CONFIG TAB ========== */}
              <TabsContent value="config" className="space-y-3 mt-4">

                {/* Identity */}
                <Section title="Identidade" icon={Bot} defaultOpen>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Nome do Agente</Label>
                    <Input
                      value={cfg.agent_name || ''}
                      onChange={e => updateField(type, 'agent_name', e.target.value)}
                      placeholder="Ex: Sofia, Rafael..."
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Como o agente se apresenta ao lead</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Tom de Comunicação</Label>
                    <Select value={cfg.tone || 'professional'} onValueChange={v => updateField(type, 'tone', v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Estrutura da Resposta</Label>
                    <Select value={cfg.response_structure || 'natural'} onValueChange={v => updateField(type, 'response_structure', v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESPONSE_STRUCTURE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Section>

                {/* Activation Mode */}
                <Section title="Modo de Ativação" icon={Radio} defaultOpen>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Quando o bot responde?</Label>
                    <Select value={cfg.activation_mode || 'always_on'} onValueChange={v => updateField(type, 'activation_mode', v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always_on">Sempre ativo — responde toda mensagem</SelectItem>
                        <SelectItem value="keyword_trigger">Por palavra-chave — só responde quando detecta uma keyword</SelectItem>
                        <SelectItem value="manual_only">Manual — só responde quando ativado pelo operador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {cfg.activation_mode === 'keyword_trigger' && (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Palavras-chave de ativação</Label>
                      <Input
                        value={cfg.activation_keywords || ''}
                        onChange={e => updateField(type, 'activation_keywords', e.target.value)}
                        placeholder="Ex: /bot, atendimento, quero saber mais"
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Separar por vírgula. O bot só responde quando a mensagem do lead contém uma dessas palavras.</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Pausa ao intervir manualmente (minutos)
                    </Label>
                    <Input
                      type="number"
                      min={5}
                      max={1440}
                      value={cfg.human_takeover_minutes ?? 30}
                      onChange={e => updateField(type, 'human_takeover_minutes', Number(e.target.value))}
                      className="text-sm w-32"
                    />
                    <p className="text-xs text-muted-foreground">Quando você envia uma mensagem manualmente, o bot para de responder por este período.</p>
                  </div>
                </Section>

                {/* Instructions */}
                <Section title="Instruções Personalizadas" icon={Brain} defaultOpen>
                  <div className="flex items-start gap-2 p-2.5 bg-primary/5 rounded-md">
                    <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{AGENT_HINTS[type]}</p>
                  </div>
                  <Textarea
                    value={cfg.custom_instructions || ''}
                    onChange={e => updateField(type, 'custom_instructions', e.target.value)}
                    placeholder="Descreva em detalhes como este agente deve se comportar..."
                    className="text-sm resize-none min-h-[160px]"
                  />
                </Section>

                {/* Response limits */}
                <Section title="Resposta & Limites" icon={MessageSquare}>
                  <AgentSliderField
                    label="Tamanho máximo da resposta"
                    value={cfg.max_chars ?? 500}
                    min={100} max={2000} step={50}
                    onChange={v => updateField(type, 'max_chars', v)}
                    leftLabel="100 (curto)" rightLabel="2000 (detalhado)"
                  />
                  <AgentSliderField
                    label="Máximo de tentativas (por lead)"
                    value={cfg.max_attempts ?? 3}
                    min={1} max={20} step={1}
                    onChange={v => updateField(type, 'max_attempts', v)}
                    leftLabel="1 (mínimo)" rightLabel="20 (persistente)"
                  />
                </Section>

                {/* Permissions */}
                <Section title="Permissões" icon={Shield}>
                  {[
                    { field: 'use_emojis', label: 'Usar emojis nas respostas' },
                    { field: 'allow_links', label: 'Compartilhar links' },
                    { field: 'allow_media', label: 'Enviar mídias (imagens, áudio)' },
                    { field: 'allow_discount', label: 'Oferecer desconto', show: type === 'sales' || type === 'recovery' },
                    { field: 'allow_ai_identification', label: 'Pode revelar que é IA se perguntado' },
                    { field: 'use_anchoring', label: 'Usar ancoragem de preço', show: type === 'sales' },
                    { field: 'use_urgency', label: 'Criar senso de urgência', show: type === 'sales' || type === 'recovery' },
                    { field: 'escalate_on_crisis', label: 'Escalar para humano em crise' },
                  ].filter(i => i.show !== false).map(({ field, label }) => (
                    <div key={field} className="flex items-center justify-between py-1">
                      <Label className="text-sm">{label}</Label>
                      <Switch checked={cfg[field] ?? false} onCheckedChange={v => updateField(type, field, v)} />
                    </div>
                  ))}
                  {cfg.allow_discount && (
                    <div className="space-y-1 pl-1 pt-1">
                      <Label className="text-xs text-muted-foreground">Desconto máximo (%)</Label>
                      <Input type="number" min={0} max={100} value={cfg.max_discount_percent || 0}
                        onChange={e => updateField(type, 'max_discount_percent', Number(e.target.value))} className="text-sm w-24" />
                    </div>
                  )}
                </Section>

                {/* Crisis */}
                <Section title="Gestão de Crise" icon={AlertTriangle}>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Palavras-chave de crise</Label>
                    <Input
                      value={cfg.crisis_keywords || ''}
                      onChange={e => updateField(type, 'crisis_keywords', e.target.value)}
                      placeholder="cancelamento, reclamação, procon, processar"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Separar por vírgula. Se detectadas, o bot escala para humano ou muda comportamento.</p>
                  </div>
                </Section>

                {/* Goal & Stage Advancement */}
                <Section title="Objetivo & Avanço Automático" icon={ArrowRight}>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Critério de Sucesso</Label>
                    <Textarea
                      value={cfg.success_criteria || ''}
                      onChange={e => updateField(type, 'success_criteria', e.target.value)}
                      placeholder="Ex: SDR qualificou o lead coletando nome, empresa e necessidade. Vendas: cliente confirmou interesse e recebeu proposta."
                      className="text-sm resize-none min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground">Descreva quando este agente cumpriu sua função. O bot avançará o lead automaticamente.</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Avançar para etapa</Label>
                    <Select value={cfg.auto_advance_to || ''} onValueChange={v => updateField(type, 'auto_advance_to', v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione a etapa de destino" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualified">Qualificado</SelectItem>
                        <SelectItem value="negotiating">Em Negociação</SelectItem>
                        <SelectItem value="sale_completed">Venda Concluída</SelectItem>
                        <SelectItem value="unqualified">Desqualificado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Quando o critério de sucesso for atingido, o lead avança automaticamente para esta etapa.</p>
                  </div>
                </Section>

                {/* Resources: PIX, Links, Product Images */}
                <Section title="Recursos do Bot" icon={Key}>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Chave PIX</Label>
                    <Input
                      value={cfg.pix_key || ''}
                      onChange={e => updateField(type, 'pix_key', e.target.value)}
                      placeholder="Ex: email@empresa.com ou CPF/CNPJ"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">O bot enviará esta chave quando identificar intenção de pagamento.</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Links Úteis</Label>
                    <Textarea
                      value={cfg.useful_links || ''}
                      onChange={e => updateField(type, 'useful_links', e.target.value)}
                      placeholder="Ex: Catálogo: https://site.com/catalogo&#10;WhatsApp: https://wa.me/5511999...&#10;Site: https://site.com"
                      className="text-sm resize-none min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground">Links que o bot pode compartilhar durante a conversa. Um por linha.</p>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Enviar fotos do catálogo de produtos</Label>
                    </div>
                    <Switch checked={cfg.send_product_images ?? false} onCheckedChange={v => updateField(type, 'send_product_images', v)} />
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">Quando ativado, o bot envia a imagem do produto ao recomendá-lo (requer produtos com imagem cadastrada).</p>
                </Section>
              </TabsContent>

              {/* ========== BEHAVIOR TAB ========== */}
              <TabsContent value="behavior" className="space-y-3 mt-4">

                {/* Personality sliders */}
                <Section title="Personalidade" icon={Volume2} defaultOpen>
                  <AgentSliderField
                    label="Formalidade"
                    value={cfg.formality_level ?? 5}
                    min={0} max={10}
                    onChange={v => updateField(type, 'formality_level', v)}
                    leftLabel="Casual" rightLabel="Muito formal"
                  />
                  <AgentSliderField
                    label="Autoridade / Confiança"
                    value={cfg.authority_level ?? 5}
                    min={0} max={10}
                    onChange={v => updateField(type, 'authority_level', v)}
                    leftLabel="Humilde" rightLabel="Expert autoritário"
                  />
                  <AgentSliderField
                    label="Curiosidade (fazer perguntas)"
                    value={cfg.curiosity_level ?? 5}
                    min={0} max={10}
                    onChange={v => updateField(type, 'curiosity_level', v)}
                    leftLabel="Responde só" rightLabel="Investiga muito"
                  />
                  <AgentSliderField
                    label="Insistência"
                    value={cfg.insistence_level ?? 5}
                    min={0} max={10}
                    onChange={v => updateField(type, 'insistence_level', v)}
                    leftLabel="Aceita não" rightLabel="Muito persistente"
                  />
                  {(type === 'sales' || type === 'recovery') && (
                    <AgentSliderField
                      label="Pressão de venda"
                      value={cfg.pressure_level ?? 5}
                      min={0} max={10}
                      onChange={v => updateField(type, 'pressure_level', v)}
                      leftLabel="Consultivo" rightLabel="Pressiona forte"
                    />
                  )}
                </Section>

                {/* Sales config */}
                {(type === 'sales' || type === 'sdr') && (
                  <Section title="Estratégia de Venda" icon={DollarSign}>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Intensidade Comercial</Label>
                      <Select value={cfg.sales_intensity || 'moderate'} onValueChange={v => updateField(type, 'sales_intensity', v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SALES_INTENSITY_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Modelo de Venda</Label>
                      <Select value={cfg.sales_model || 'consultiva'} onValueChange={v => updateField(type, 'sales_model', v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SALES_MODEL_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <AgentSliderField
                      label="Confiança mínima p/ declarar venda"
                      value={cfg.min_confidence_sale ?? 80}
                      min={50} max={100} step={5}
                      onChange={v => updateField(type, 'min_confidence_sale', v)}
                      leftLabel="50% (tolerante)" rightLabel="100% (certeza)"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Ticket mínimo (R$)</Label>
                        <Input type="number" min={0} value={cfg.min_ticket || ''} placeholder="Sem limite"
                          onChange={e => updateField(type, 'min_ticket', e.target.value ? Number(e.target.value) : null)} className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Budget mínimo (R$)</Label>
                        <Input type="number" min={0} value={cfg.min_budget || ''} placeholder="Sem limite"
                          onChange={e => updateField(type, 'min_budget', e.target.value ? Number(e.target.value) : null)} className="text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Produtos foco</Label>
                      <Textarea
                        value={cfg.focus_products || ''}
                        onChange={e => updateField(type, 'focus_products', e.target.value)}
                        placeholder="Liste os produtos que este agente deve priorizar..."
                        className="text-sm resize-none min-h-[60px]"
                      />
                    </div>
                  </Section>
                )}

                {/* Qualification (SDR) */}
                {type === 'sdr' && (
                  <Section title="Qualificação de Leads" icon={Target}>
                    <AgentSliderField
                      label="Score mínimo p/ qualificado"
                      value={cfg.min_score_qualified ?? 70}
                      min={10} max={100} step={5}
                      onChange={v => updateField(type, 'min_score_qualified', v)}
                      leftLabel="10 (fácil)" rightLabel="100 (exigente)"
                    />
                    <AgentSliderField
                      label="Score máximo p/ desqualificado"
                      value={cfg.max_score_unqualified ?? 30}
                      min={0} max={80} step={5}
                      onChange={v => updateField(type, 'max_score_unqualified', v)}
                      leftLabel="0 (rígido)" rightLabel="80 (tolerante)"
                    />
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Perfil de Cliente Ideal</Label>
                      <Textarea
                        value={cfg.ideal_client_profile || ''}
                        onChange={e => updateField(type, 'ideal_client_profile', e.target.value)}
                        placeholder="Ex: Empresa com 50+ funcionários, faturamento > 500k/mês, setor de tecnologia..."
                        className="text-sm resize-none min-h-[60px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Tipo de Empresa Ideal</Label>
                      <Input
                        value={cfg.ideal_company_type || ''}
                        onChange={e => updateField(type, 'ideal_company_type', e.target.value)}
                        placeholder="Ex: SaaS B2B, E-commerce, Clínica..."
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Problema Obrigatório</Label>
                      <Input
                        value={cfg.required_problem || ''}
                        onChange={e => updateField(type, 'required_problem', e.target.value)}
                        placeholder="Ex: Lead precisa ter problema com geração de leads"
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Lead só qualifica se mencionar este tipo de problema</p>
                    </div>
                  </Section>
                )}

                {/* Reactivation (Recovery) */}
                {type === 'recovery' && (
                  <Section title="Reativação" icon={RotateCcw} defaultOpen>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Dias até reativar</Label>
                        <Input type="number" min={1} max={90} value={cfg.reactivation_days ?? 3}
                          onChange={e => updateField(type, 'reactivation_days', Number(e.target.value))} className="text-sm" />
                        <p className="text-xs text-muted-foreground">Após quantos dias sem resposta</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Intervalo entre tentativas (min)</Label>
                        <Input type="number" min={30} max={1440} value={cfg.reactivation_minutes ?? 120}
                          onChange={e => updateField(type, 'reactivation_minutes', Number(e.target.value))} className="text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Estratégia de Reativação</Label>
                      <Select value={cfg.reactivation_strategy || 'pergunta_aberta'} onValueChange={v => updateField(type, 'reactivation_strategy', v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {REACTIVATION_STRATEGY_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Section>
                )}

                {/* Target audience */}
                <Section title="Público-Alvo" icon={MapPin}>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Região alvo</Label>
                    <Input
                      value={cfg.target_region || ''}
                      onChange={e => updateField(type, 'target_region', e.target.value)}
                      placeholder="Ex: Grande São Paulo, Brasil inteiro, Sudeste..."
                      className="text-sm"
                    />
                  </div>
                  {type !== 'sdr' && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Perfil de Cliente Ideal</Label>
                        <Textarea
                          value={cfg.ideal_client_profile || ''}
                          onChange={e => updateField(type, 'ideal_client_profile', e.target.value)}
                          placeholder="Descreva quem é o cliente ideal..."
                          className="text-sm resize-none min-h-[60px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Tipo de Empresa</Label>
                        <Input
                          value={cfg.ideal_company_type || ''}
                          onChange={e => updateField(type, 'ideal_company_type', e.target.value)}
                          placeholder="Ex: E-commerce, Clínica, Restaurante..."
                          className="text-sm"
                        />
                      </div>
                    </>
                  )}
                </Section>
              </TabsContent>

              {/* ========== QUESTIONS TAB ========== */}
              <TabsContent value="questions" className="mt-4">
                <AgentQuestionsTab
                  clientId={clientId}
                  agentType={type}
                  questions={questions.filter(q => q.agent_type === type)}
                  onReload={loadAll}
                />
              </TabsContent>

              {/* ========== FILES TAB ========== */}
              <TabsContent value="files" className="mt-4">
                <AgentFileUpload clientId={clientId} agentType={type} />
              </TabsContent>

              {/* ========== KNOWLEDGE TAB ========== */}
              <TabsContent value="knowledge" className="mt-4">
                <AgentKnowledgeTab
                  clientId={clientId}
                  agentType={type}
                  items={knowledge.filter(k => k.agent_type === type)}
                  crisisKeywords={cfg.crisis_keywords || ''}
                  onChangeField={(field, value) => updateField(type, field, value)}
                  onReload={loadAll}
                />
              </TabsContent>
            </Tabs>

            <Button onClick={() => save(type)} disabled={saving === type} className="w-full">
              {saving === type ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar — Agente {label}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
