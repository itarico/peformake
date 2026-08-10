import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Brain, Sparkles, Bot, Zap, Clock, Settings2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { MONTH_NAMES } from '@/types/database';
import { streamChat } from '@/lib/streamingChat';

interface Props { clientId: string; clientName?: string }

const RULE_TYPES = [
  { key: 'pause_high_cpa', label: 'Pausar CPA alto', description: 'Pausa campanhas quando CPL ultrapassar limite', icon: '🔴' },
  { key: 'scale_high_roas', label: 'Escalar ROAS alto', description: 'Aumenta orçamento se ROAS estiver acima da meta', icon: '🟢' },
  { key: 'alert_low_ctr', label: 'Alerta CTR baixo', description: 'Notifica quando CTR cair abaixo do benchmark', icon: '⚠️' },
  { key: 'budget_cap', label: 'Limite de gasto', description: 'Pausa campanhas ao atingir limite de gasto mensal', icon: '💰' },
];

export function TrafficAIAnalysisPanel({ clientId, clientName }: Props) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch auto rules
  const { data: rules = [] } = useQuery({
    queryKey: ['traffic-auto-rules', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_auto_rules')
        .select('*')
        .eq('client_id', clientId);
      return data || [];
    },
  });

  // Fetch latest analysis
  const { data: latestAnalysis } = useQuery({
    queryKey: ['traffic-latest-analysis', clientId, selectedYear, selectedMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_ai_analyses')
        .select('*')
        .eq('client_id', clientId)
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Toggle rule mutation
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleType, config }: { ruleType: string; config?: any }) => {
      const existing = rules.find((r: any) => r.rule_type === ruleType);
      if (existing) {
        await supabase.from('traffic_auto_rules').update({
          is_active: !existing.is_active,
          ...(config ? { rule_config: config } : {}),
        }).eq('id', existing.id);
      } else {
        await supabase.from('traffic_auto_rules').insert({
          client_id: clientId,
          rule_type: ruleType,
          rule_config: config || {},
          is_active: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-auto-rules'] });
      toast.success('Regra atualizada!');
    },
  });

  const updateRuleConfigMutation = useMutation({
    mutationFn: async ({ ruleType, config }: { ruleType: string; config: any }) => {
      const existing = rules.find((r: any) => r.rule_type === ruleType);
      if (existing) {
        await supabase.from('traffic_auto_rules').update({ rule_config: config }).eq('id', existing.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-auto-rules'] });
      toast.success('Configuração salva!');
    },
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis('');
    abortRef.current = new AbortController();
    let fullText = '';

    try {
      await streamChat({
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consulting-traffic-ai`,
        body: { client_id: clientId, year: selectedYear, month: selectedMonth },
        onDelta: (text) => { fullText += text; setAnalysis(prev => prev + text); },
        onDone: async () => {
          setIsAnalyzing(false);
          // Save analysis
          if (fullText.length > 100) {
            await supabase.from('traffic_ai_analyses').insert({
              client_id: clientId,
              year: selectedYear,
              month: selectedMonth,
              analysis_type: 'manual',
              content: fullText,
            });
            queryClient.invalidateQueries({ queryKey: ['traffic-latest-analysis'] });
          }
        },
        signal: abortRef.current.signal,
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') toast.error(e.message || 'Erro na análise.');
      setIsAnalyzing(false);
    }
  };

  const handleGenerateClientSummary = async () => {
    if (!latestAnalysis?.content && !analysis) {
      toast.error('Gere uma análise primeiro.');
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('consulting-traffic-ai', {
        body: {
          client_id: clientId,
          year: selectedYear,
          month: selectedMonth,
          generate_client_summary: true,
          full_analysis: analysis || latestAnalysis?.content,
        },
      });
      if (error) throw error;

      const ct = data?.headers?.get?.('content-type') || '';
      let summary = '';
      if (typeof data === 'string') {
        summary = data;
      } else if (data?.result) {
        summary = data.result;
      } else if (data?.client_summary) {
        summary = data.client_summary;
      }

      if (summary && latestAnalysis) {
        await supabase.from('traffic_ai_analyses').update({ client_summary: summary }).eq('id', latestAnalysis.id);
        queryClient.invalidateQueries({ queryKey: ['traffic-latest-analysis'] });
        toast.success('Resumo para o cliente gerado!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar resumo.');
    }
    setIsGeneratingSummary(false);
  };

  const handleStop = () => { abortRef.current?.abort(); setIsAnalyzing(false); };

  const getRuleState = (ruleType: string) => rules.find((r: any) => r.rule_type === ruleType);

  return (
    <div className="space-y-6">
      {/* Copilot Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Copiloto de Tráfego — {clientName}
          </CardTitle>
          <CardDescription>
            Análise estratégica automatizada com recomendações acionáveis. A IA cruza métricas reais com benchmarks do segmento.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Auto Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Regras Automáticas
          </CardTitle>
          <CardDescription>Configure ações que a IA executa automaticamente para otimizar campanhas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {RULE_TYPES.map(rt => {
            const rule = getRuleState(rt.key);
            const isActive = rule?.is_active || false;
            const config = (rule?.rule_config as any) || {};

            return (
              <div key={rt.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{rt.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{rt.label}</p>
                    <p className="text-xs text-muted-foreground">{rt.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {rt.key === 'pause_high_cpa' && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">CPL máx R$</Label>
                      <Input
                        type="number"
                        className="w-20 h-7 text-xs"
                        value={config.max_cpl || ''}
                        onChange={e => {
                          if (rule) updateRuleConfigMutation.mutate({ ruleType: rt.key, config: { ...config, max_cpl: parseFloat(e.target.value) } });
                        }}
                        placeholder="50"
                      />
                    </div>
                  )}
                  {rt.key === 'scale_high_roas' && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">ROAS mín</Label>
                      <Input
                        type="number"
                        className="w-20 h-7 text-xs"
                        value={config.min_roas || ''}
                        onChange={e => {
                          if (rule) updateRuleConfigMutation.mutate({ ruleType: rt.key, config: { ...config, min_roas: parseFloat(e.target.value) } });
                        }}
                        placeholder="2"
                      />
                    </div>
                  )}
                  {rt.key === 'alert_low_ctr' && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">CTR mín %</Label>
                      <Input
                        type="number"
                        className="w-20 h-7 text-xs"
                        value={config.min_ctr || ''}
                        onChange={e => {
                          if (rule) updateRuleConfigMutation.mutate({ ruleType: rt.key, config: { ...config, min_ctr: parseFloat(e.target.value) } });
                        }}
                        placeholder="1"
                      />
                    </div>
                  )}
                  {rt.key === 'budget_cap' && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">Limite R$</Label>
                      <Input
                        type="number"
                        className="w-20 h-7 text-xs"
                        value={config.max_budget || ''}
                        onChange={e => {
                          if (rule) updateRuleConfigMutation.mutate({ ruleType: rt.key, config: { ...config, max_budget: parseFloat(e.target.value) } });
                        }}
                        placeholder="5000"
                      />
                    </div>
                  )}
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleRuleMutation.mutate({ ruleType: rt.key })}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Latest Auto Analysis */}
      {latestAnalysis && !analysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Última análise — {new Date(latestAnalysis.created_at).toLocaleDateString('pt-BR')}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">{latestAnalysis.analysis_type === 'auto' ? 'Automática' : 'Manual'}</Badge>
                {latestAnalysis.client_summary && <Badge variant="outline">Resumo gerado</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap max-h-[400px] overflow-y-auto">
              {latestAnalysis.content}
            </div>
            {latestAnalysis.client_summary && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> Resumo para o Cliente (PDF)</p>
                <p className="text-sm whitespace-pre-wrap">{latestAnalysis.client_summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Gerar Análise Estratégica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAnalyzing ? (
              <Button variant="destructive" onClick={handleStop}>Parar</Button>
            ) : (
              <Button onClick={handleAnalyze}>
                <Sparkles className="mr-2 h-4 w-4" /> Analisar com IA
              </Button>
            )}
            {(analysis || latestAnalysis) && !isAnalyzing && (
              <Button variant="outline" onClick={handleGenerateClientSummary} disabled={isGeneratingSummary}>
                {isGeneratingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Gerar Resumo p/ Cliente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Analysis */}
      {(analysis || isAnalyzing) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              Diagnóstico — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {analysis || 'Analisando dados...'}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
