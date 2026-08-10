import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAudiovisual } from './AudiovisualContext';
import { 
  TrendingUp, Flame, Loader2, RefreshCw, Calendar, 
  ExternalLink, Copy, Check, Sparkles, Video, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WeeklyTrendsPanelProps {
  disabled?: boolean;
}

interface TrendItem {
  title: string;
  description: string;
  platform: string;
  engagement: 'alto' | 'medio' | 'viral';
  ideaForClient: string;
}

export function WeeklyTrendsPanel({ disabled }: WeeklyTrendsPanelProps) {
  const { searchWithFirecrawl, generateWithAI, setParameter, strategicContext, parameters, instanceId, addScriptAndSave } = useAudiovisual();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedIdea, setCopiedIdea] = useState<string | null>(null);
  const [selectedTrends, setSelectedTrends] = useState<Set<number>>(new Set());
  const [isGeneratingScripts, setIsGeneratingScripts] = useState(false);

  const handleFetchTrends = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const monthYear = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const searchQuery = `tendências virais ${monthYear} + conteúdo viral semana + hooks mais usados reels tiktok ${today.getFullYear()}`;
      const searchResult = await searchWithFirecrawl(searchQuery);
      const analysis = await generateWithAI('trends', `
Analise as tendências virais da semana e gere uma lista estruturada de ideias de conteúdo.

DADOS DA PESQUISA:
${searchResult.substring(0, 3000)}

CONTEXTO DO CLIENTE:
${strategicContext.substring(0, 1500)}

INSTRUÇÕES:
1. Identifique 5-7 tendências que estão funcionando AGORA (${monthYear})
2. Para cada tendência, sugira como o cliente pode adaptar para seu nicho
3. Retorne APENAS um JSON válido no formato:

{
  "trends": [
    {
      "title": "Nome da tendência",
      "description": "Descrição breve do que é a tendência",
      "platform": "Instagram Reels | TikTok | YouTube Shorts",
      "engagement": "viral | alto | medio",
      "ideaForClient": "Como o cliente pode usar essa tendência especificamente para seu negócio"
    }
  ]
}

Retorne APENAS o JSON, sem texto adicional.`);

      let parsedTrends: TrendItem[] = [];
      try {
        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedTrends = parsed.trends || [];
        }
      } catch (parseError) {
        console.error('Error parsing trends JSON:', parseError);
        parsedTrends = [{
          title: 'Tendência Identificada',
          description: analysis.substring(0, 200),
          platform: 'Instagram Reels',
          engagement: 'alto',
          ideaForClient: 'Adapte esta tendência para seu nicho específico'
        }];
      }

      setTrends(parsedTrends);
      setLastUpdated(new Date());
      setSelectedTrends(new Set());
      toast.success(`${parsedTrends.length} tendências encontradas!`);
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast.error('Erro ao buscar tendências');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTrend = (trend: TrendItem) => {
    setParameter('tema', trend.ideaForClient);
    toast.success('Tema definido com base na tendência!');
  };

  const handleCopyIdea = async (idea: string) => {
    await navigator.clipboard.writeText(idea);
    setCopiedIdea(idea);
    toast.success('Ideia copiada!');
    setTimeout(() => setCopiedIdea(null), 2000);
  };

  const toggleTrendSelection = (index: number) => {
    setSelectedTrends(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTrends.size === trends.length) {
      setSelectedTrends(new Set());
    } else {
      setSelectedTrends(new Set(trends.map((_, i) => i)));
    }
  };

  const handleGenerateFromTrends = async () => {
    if (selectedTrends.size === 0) { toast.error('Selecione pelo menos uma tendência'); return; }
    setIsGeneratingScripts(true);
    try {
      const selected = trends.filter((_, i) => selectedTrends.has(i));
      const trendsText = selected.map((t, i) => `${i + 1}. "${t.title}" (${t.platform}, ${t.engagement})\n   Ideia: ${t.ideaForClient}\n   Descrição: ${t.description}`).join('\n\n');

      const { data, error } = await supabase.functions.invoke('consulting-audiovisual-scripts', {
        body: {
          instance_id: instanceId,
          num_scripts: selected.length,
          parameters: {
            ...parameters,
            tema: `Roteiros baseados em tendências virais da semana:\n\n${trendsText}`,
          },
          context: strategicContext,
        },
      });

      if (error) throw new Error(error.message);

      if (data?.scripts && Array.isArray(data.scripts)) {
        for (const script of data.scripts) {
          const id = crypto.randomUUID();
          await addScriptAndSave({
            id,
            ...script,
            createdAt: new Date(),
            source: 'generator',
          });
        }
        toast.success(`${data.scripts.length} roteiros gerados a partir das tendências e salvos no histórico!`);
      }
    } catch (error) {
      console.error('Error generating scripts from trends:', error);
      toast.error('Erro ao gerar roteiros das tendências');
    } finally {
      setIsGeneratingScripts(false);
    }
  };

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case 'viral': return 'bg-red-500/20 text-red-600 border-red-500/30';
      case 'alto': return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      default: return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
    }
  };

  const getEngagementIcon = (engagement: string) => {
    switch (engagement) {
      case 'viral': return <Flame className="h-3 w-3" />;
      case 'alto': return <TrendingUp className="h-3 w-3" />;
      default: return <Sparkles className="h-3 w-3" />;
    }
  };

  return (
    <Card className="border-2 border-orange-500/20 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/10 shadow-sm">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Tendências da Semana</CardTitle>
              <CardDescription>
                Ideias virais atualizadas para seu nicho
              </CardDescription>
            </div>
          </div>
          
          {lastUpdated && (
            <Badge variant="outline" className="gap-1 text-xs shadow-sm">
              <Calendar className="h-3 w-3" />
              {lastUpdated.toLocaleDateString('pt-BR')}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Fetch button */}
        <Button
          onClick={handleFetchTrends}
          disabled={isLoading || disabled}
          className="w-full gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg transition-all h-11"
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Buscando tendências...</>
          ) : trends.length > 0 ? (
            <><RefreshCw className="h-4 w-4" />Atualizar Tendências</>
          ) : (
            <><TrendingUp className="h-4 w-4" />Buscar Tendências da Semana</>
          )}
        </Button>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-xl space-y-2 animate-pulse">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Selection bar + Generate button */}
        {!isLoading && trends.length > 0 && (
          <div className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-primary/5 to-muted/40 rounded-xl border border-primary/10 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="gap-1.5 text-xs rounded-lg">
                <Check className="h-3.5 w-3.5" />
                {selectedTrends.size === trends.length ? 'Desmarcar' : 'Selecionar Todos'}
              </Button>
              <Badge variant="secondary" className="text-xs">
                {selectedTrends.size} de {trends.length}
              </Badge>
            </div>
            <Button
              onClick={handleGenerateFromTrends}
              disabled={isGeneratingScripts || selectedTrends.size === 0 || disabled}
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-purple-600 shadow-md hover:shadow-lg transition-all"
            >
              {isGeneratingScripts ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Gerando...</>
              ) : (
                <><FileText className="h-4 w-4" />Gerar Roteiros ({selectedTrends.size})</>
              )}
            </Button>
          </div>
        )}

        {/* Trends list */}
        {!isLoading && trends.length > 0 && (
          <div className="space-y-3">
            {trends.map((trend, index) => {
              const isSelected = selectedTrends.has(index);
              return (
                <div
                  key={index}
                  className={cn(
                    "group rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "border-primary/50 bg-primary/[0.03] shadow-md ring-1 ring-primary/20"
                      : "border-border/50 hover:border-primary/30 hover:shadow-sm"
                  )}
                  onClick={() => toggleTrendSelection(index)}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTrendSelection(index)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={cn("gap-1 text-[10px] font-bold uppercase tracking-wider", getEngagementColor(trend.engagement))}
                          >
                            {getEngagementIcon(trend.engagement)}
                            {trend.engagement === 'viral' ? 'VIRAL' : trend.engagement.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {trend.platform}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm leading-snug">{trend.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {trend.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Idea for client */}
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 ml-7">
                      <div className="flex items-start gap-2">
                        <Video className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">
                            Ideia para seu cliente
                          </p>
                          <p className="text-sm leading-relaxed">{trend.ideaForClient}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 ml-7" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2 rounded-lg"
                        onClick={() => handleCopyIdea(trend.ideaForClient)}
                      >
                        {copiedIdea === trend.ideaForClient ? (
                          <><Check className="h-3.5 w-3.5 text-green-500" />Copiado!</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" />Copiar</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-2 rounded-lg"
                        onClick={() => handleUseTrend(trend)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Usar como Tema
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && trends.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <div className="p-4 rounded-full bg-orange-500/5 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Flame className="h-8 w-8 text-orange-500/30" />
            </div>
            <p className="text-sm font-medium mb-1">Nenhuma tendência carregada</p>
            <p className="text-xs text-muted-foreground/70">
              Clique no botão acima para buscar as tendências virais da semana
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
