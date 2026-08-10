import { useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain, CheckCircle, Loader2, AlertCircle,
  Building, Target, Users, Trophy, Video, BarChart3,
} from 'lucide-react';
import { useAudiovisual } from './AudiovisualContext';
import { cn } from '@/lib/utils';

interface ContextDisplayProps {
  clientId: string;
  monthId: string;
}

export function ContextDisplay({ clientId, monthId }: ContextDisplayProps) {
  const { strategicContext, isLoadingContext, loadClientContext, scripts, approvedScriptIds } = useAudiovisual();

  useEffect(() => {
    loadClientContext(clientId, monthId);
  }, [clientId, monthId, loadClientContext]);

  const hasContext = strategicContext.length > 100;

  const contextStats = {
    hasClient: strategicContext.includes('INFORMAÇÕES DO CLIENTE'),
    hasFrameworks: strategicContext.includes('FRAMEWORKS'),
    hasStrategic: strategicContext.includes('DADOS ESTRATÉGICOS'),
    hasAnalyses: strategicContext.includes('ANÁLISES DE CONTEÚDO'),
  };
  const loadedCount = Object.values(contextStats).filter(Boolean).length;

  // Script metrics computed locally
  const metrics = useMemo(() => {
    const total = scripts.length;
    const approved = scripts.filter(s => approvedScriptIds.has(s.id)).length;
    const pending = total - approved;

    // Themes (from titles)
    const themes: Record<string, number> = {};
    scripts.forEach(s => {
      const words = (s.titulo || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
      words.slice(0, 2).forEach(w => { themes[w] = (themes[w] || 0) + 1; });
    });
    const topThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

    // Channels
    const channels: Record<string, number> = {};
    scripts.forEach(s => {
      const struct = s.estruturaUsada || 'Outro';
      channels[struct] = (channels[struct] || 0) + 1;
    });

    // Sources
    const sources = { chat: 0, generator: 0, manual: 0 };
    scripts.forEach(s => {
      const src = s.source || 'generator';
      if (src in sources) sources[src as keyof typeof sources]++;
    });

    return { total, approved, pending, topThemes, channels, sources };
  }, [scripts, approvedScriptIds]);

  return (
    <Card className={cn(
      "transition-all",
      hasContext ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"
    )}>
      <CardContent className="py-4 px-5">
        {isLoadingContext ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Contexto Estratégico</span>
                {hasContext ? (
                  <Badge variant="default" className="gap-1 bg-green-600 text-[10px] h-5">
                    <CheckCircle className="h-3 w-3" />{loadedCount} fontes
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-[10px] h-5">
                    <AlertCircle className="h-3 w-3" />Sem dados
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => loadClientContext(clientId, monthId)} disabled={isLoadingContext}>
                {isLoadingContext ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Recarregar
              </Button>
            </div>

            {/* Source badges */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={contextStats.hasClient ? "default" : "outline"} className={cn("gap-1 text-[10px] h-5", contextStats.hasClient && "bg-blue-600")}>
                <Building className="h-3 w-3" />Cliente
              </Badge>
              <Badge variant={contextStats.hasFrameworks ? "default" : "outline"} className={cn("gap-1 text-[10px] h-5", contextStats.hasFrameworks && "bg-purple-600")}>
                <Target className="h-3 w-3" />Frameworks
              </Badge>
              <Badge variant={contextStats.hasStrategic ? "default" : "outline"} className={cn("gap-1 text-[10px] h-5", contextStats.hasStrategic && "bg-green-600")}>
                <Trophy className="h-3 w-3" />Estratégia
              </Badge>
              <Badge variant={contextStats.hasAnalyses ? "default" : "outline"} className={cn("gap-1 text-[10px] h-5", contextStats.hasAnalyses && "bg-orange-600")}>
                <Users className="h-3 w-3" />Análises
              </Badge>
            </div>

            {/* Script metrics dashboard */}
            {metrics.total > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-primary">
                    <Video className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">{metrics.total}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Roteiros</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">{metrics.approved}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Aprovados</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">{metrics.pending}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-purple-600">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="text-lg font-bold">{Object.keys(metrics.channels).length}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Estruturas</p>
                </div>
              </div>
            )}

            {/* Source distribution */}
            {metrics.total > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Origem:</span>
                {metrics.sources.chat > 0 && <Badge variant="outline" className="text-[10px] h-5">💬 Chat: {metrics.sources.chat}</Badge>}
                {metrics.sources.generator > 0 && <Badge variant="outline" className="text-[10px] h-5">⚡ Lote: {metrics.sources.generator}</Badge>}
                {metrics.sources.manual > 0 && <Badge variant="outline" className="text-[10px] h-5">✍️ Manual: {metrics.sources.manual}</Badge>}
              </div>
            )}

            {/* Top themes */}
            {metrics.topThemes.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Temas:</span>
                {metrics.topThemes.map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px] h-5 capitalize">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
