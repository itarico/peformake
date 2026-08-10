import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, TrendingUp, RotateCcw, AlertTriangle, ShoppingCart, MessageSquare, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  clientId?: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  stage_change: { label: 'Mudança de estágio', icon: TrendingUp, color: 'text-blue-500' },
  sale_detected: { label: 'Venda detectada', icon: ShoppingCart, color: 'text-green-500' },
  intent_classified: { label: 'Intenção classificada', icon: Brain, color: 'text-purple-500' },
  agent_responded: { label: 'Agente respondeu', icon: MessageSquare, color: 'text-orange-500' },
  recovery_attempt: { label: 'Tentativa de recuperação', icon: RotateCcw, color: 'text-yellow-500' },
};

const INTENT_LABELS: Record<string, string> = {
  purchase_intent: '🎯 Intenção de compra',
  price_request: '💰 Pedido de preço',
  proposal_request: '📄 Pedido de proposta',
  discount_request: '🏷️ Pedido de desconto',
  objection: '⚠️ Objeção',
  competitor_comparison: '⚖️ Comparação c/ concorrente',
  support_request: '🆘 Pedido de suporte',
  complaint: '😠 Reclamação',
  confirmation: '✅ Confirmação',
  refusal: '❌ Recusa',
  urgency: '⏰ Urgência',
  qualification_response: '📋 Resposta de qualificação',
  greeting: '👋 Saudação',
  unknown: '❓ Desconhecido',
};

const STAGE_LABELS: Record<string, string> = {
  new: '1º Contato',
  qualified: 'Qualificado',
  negotiating: 'Em Negociação',
  unqualified: 'Não Qualificado',
  sale_completed: 'Venda Realizada',
  sale_lost: 'Venda Perdida',
};

const AGENT_LABELS: Record<string, string> = {
  sdr: 'SDR',
  sales: 'Vendas',
  recovery: 'Recuperador',
  support: 'Suporte',
};

export default function CrmIntelligenceLog({ clientId }: Props) {
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['crm-intelligence-events', clientId, filterType, limit],
    queryFn: async () => {
      let query = supabase
        .from('crm_intelligence_events')
        .select(`
          id, event_type, from_stage, to_stage, intent, confidence,
          trigger_text, agent_type, sale_value, product_name,
          is_reversed, metadata, created_at,
          crm_leads!crm_intelligence_events_lead_id_fkey(name, phone, status)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (clientId) query = query.eq('client_id', clientId);
      if (filterType !== 'all') query = query.eq('event_type', filterType);

      const { data } = await query;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const filtered = events?.filter(e => {
    if (!search) return true;
    const lead = e.crm_leads as any;
    const name = lead?.name?.toLowerCase() || '';
    const phone = lead?.phone || '';
    const intent = e.intent?.toLowerCase() || '';
    const trigger = e.trigger_text?.toLowerCase() || '';
    const s = search.toLowerCase();
    return name.includes(s) || phone.includes(s) || intent.includes(s) || trigger.includes(s);
  }) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Log de Inteligência</CardTitle>
              <CardDescription className="text-xs">Todas as decisões automáticas do motor de IA</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 mt-3">
          <Input
            placeholder="Buscar lead, intenção..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm h-8"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              <SelectItem value="stage_change">Mudanças de estágio</SelectItem>
              <SelectItem value="sale_detected">Vendas detectadas</SelectItem>
              <SelectItem value="intent_classified">Classificações</SelectItem>
              <SelectItem value="agent_responded">Respostas de agentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum evento registrado ainda.</p>
            <p className="text-xs">O motor de inteligência registra eventos automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(event => {
              const evConf = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.intent_classified;
              const Icon = evConf.icon;
              const lead = event.crm_leads as any;
              const isStageChange = event.event_type === 'stage_change' || event.event_type === 'sale_detected';

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className={`mt-0.5 shrink-0 ${evConf.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {lead?.name || lead?.phone || 'Lead'}
                      </span>
                      <Badge variant="outline" className="text-xs h-4 px-1.5">
                        {evConf.label}
                      </Badge>
                      {event.agent_type && (
                        <Badge variant="secondary" className="text-xs h-4 px-1.5">
                          {AGENT_LABELS[event.agent_type] || event.agent_type}
                        </Badge>
                      )}
                    </div>

                    {/* Stage change arrow */}
                    {isStageChange && event.from_stage && event.to_stage && event.from_stage !== event.to_stage && (
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABELS[event.from_stage] || event.from_stage}
                        </Badge>
                        <span className="text-xs text-muted-foreground">→</span>
                        <Badge className={`text-xs ${event.to_stage === 'sale_completed' ? 'bg-primary/10 text-primary border-primary/30' : ''}`}>
                          {STAGE_LABELS[event.to_stage] || event.to_stage}
                        </Badge>
                        {event.sale_value && (
                          <span className="text-xs font-bold text-primary ml-1">
                            R${event.sale_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Intent */}
                    {event.intent && event.intent !== 'unknown' && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {INTENT_LABELS[event.intent] || event.intent}
                        {event.confidence && (
                          <span className="ml-1 opacity-70">({Math.round(event.confidence * 100)}% confiança)</span>
                        )}
                      </p>
                    )}

                    {/* Product */}
                    {event.product_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Produto: <span className="font-medium">{event.product_name}</span>
                      </p>
                    )}

                    {/* Trigger text */}
                    {event.trigger_text && (
                      <p className="text-xs text-muted-foreground mt-1 italic truncate">
                        "{event.trigger_text}"
                      </p>
                    )}

                    {/* Agent reply preview */}
                    {event.event_type === 'agent_responded' && (event.metadata as any)?.reply && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        ↳ {(event.metadata as any).reply}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(event.created_at), { locale: ptBR, addSuffix: true })}
                  </div>
                </div>
              );
            })}

            {filtered.length >= limit && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setLimit(l => l + 50)}>
                Carregar mais
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
