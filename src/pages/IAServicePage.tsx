import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { RefreshCw, Pin, PinOff, ExternalLink, Search, Sparkles, Clock, Filter, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

type ServiceType = 'traffic' | 'design' | 'audiovisual';

interface Insight {
  id: string;
  target_type: string;
  target_id: string | null;
  category: string;
  service_type: string;
  title: string;
  content: string;
  source_url: string | null;
  media_type: string | null;
  insight_format: string | null;
  is_pinned: boolean | null;
  auto_generated: boolean;
  tags: string[] | null;
  created_at: string | null;
}

const SERVICE_CONFIG: Record<ServiceType, { title: string; icon: string; desc: string; color: string }> = {
  traffic: {
    title: 'IA Tráfego Pago',
    icon: '🎯',
    desc: 'Estratégias de campanha, copys, criativos e roteiros para Meta Ads e Google Ads',
    color: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  },
  design: {
    title: 'IA Design Gráfico',
    icon: '🎨',
    desc: 'Referências visuais, criativos e tendências de design por nicho de cliente',
    color: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  },
  audiovisual: {
    title: 'IA Audiovisual',
    icon: '🎬',
    desc: 'Ideias virais, tendências de vídeo e formatos para Reels/TikTok',
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  },
};

const IAServicePage = ({ serviceType }: { serviceType: ServiceType }) => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('strategies');
  const config = SERVICE_CONFIG[serviceType];

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, business_segment')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Fetch insights
  const { data: insights, isLoading } = useQuery({
    queryKey: ['service-insights', serviceType, selectedClient],
    queryFn: async () => {
      let query = supabase
        .from('ai_daily_insights')
        .select('*')
        .eq('service_type', serviceType)
        .order('created_at', { ascending: false })
        .limit(200);

      if (selectedClient !== 'all') {
        query = query.eq('target_id', selectedClient);
      }

      const { data } = await query;
      return (data || []) as Insight[];
    },
  });

  // Auto-run search on page load
  const autoRunMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-ai-service-cron', {
        body: {
          serviceType,
          clientId: selectedClient !== 'all' ? selectedClient : undefined,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.count > 0) {
        toast.success(`${data.count} novos insights encontrados!`);
        queryClient.invalidateQueries({ queryKey: ['service-insights'] });
      } else {
        toast.info('Nenhum insight novo — pesquisa já atualizada.');
      }
    },
    onError: (err: any) => {
      console.error('Auto-run error:', err);
    },
  });

  // Force run
  const forceRunMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-ai-service-cron', {
        body: {
          serviceType,
          clientId: selectedClient !== 'all' ? selectedClient : undefined,
          force: true,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data?.count || 0} novos insights gerados!`);
      queryClient.invalidateQueries({ queryKey: ['service-insights'] });
    },
    onError: () => toast.error('Erro ao rodar pesquisa'),
  });

  // Toggle pin
  const togglePin = async (id: string, currentPinned: boolean) => {
    await supabase
      .from('ai_daily_insights')
      .update({ is_pinned: !currentPinned })
      .eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['service-insights'] });
  };

  // Auto-run on mount
  useEffect(() => {
    autoRunMutation.mutate();
  }, [serviceType]);

  const strategies = insights?.filter(i => i.category !== 'source_link') || [];
  const links = insights?.filter(i => i.category === 'source_link') || [];
  const pinned = insights?.filter(i => i.is_pinned) || [];

  const isRunning = autoRunMutation.isPending || forceRunMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span>{config.icon}</span> {config.title}
          </h1>
          <p className="text-sm text-muted-foreground">{config.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => forceRunMutation.mutate()}
            disabled={isRunning}
            variant="default"
            size="sm"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {isRunning ? 'Buscando...' : 'Rodar Agora'}
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {isRunning && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">IA pesquisando na internet...</p>
              <p className="text-xs text-muted-foreground">Buscando estratégias e referências com Firecrawl e processando com IA</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="strategies" className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Estratégias ({strategies.length})
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            Links ({links.length})
          </TabsTrigger>
          <TabsTrigger value="pinned" className="flex items-center gap-1">
            <Pin className="h-3.5 w-3.5" />
            Fixados ({pinned.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strategies" className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))
          ) : strategies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhuma estratégia encontrada ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Clique "Rodar Agora" para buscar insights</p>
              </CardContent>
            </Card>
          ) : (
            strategies.map(insight => (
              <InsightCard key={insight.id} insight={insight} onTogglePin={togglePin} clientName={clients?.find(c => c.id === insight.target_id)?.name} />
            ))
          )}
        </TabsContent>

        <TabsContent value="links" className="space-y-2">
          {links.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum link salvo ainda
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {links.map(link => (
                <Card key={link.id} className="hover:bg-accent/5 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {clients?.find(c => c.id === link.target_id)?.name || 'Geral'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePin(link.id, !!link.is_pinned)}>
                          {link.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                        </Button>
                        {link.source_url && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={link.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pinned" className="space-y-3">
          {pinned.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Fixe insights importantes para acesso rápido
              </CardContent>
            </Card>
          ) : (
            pinned.map(insight => (
              <InsightCard key={insight.id} insight={insight} onTogglePin={togglePin} clientName={clients?.find(c => c.id === insight.target_id)?.name} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Insight Card Component
const InsightCard = ({ insight, onTogglePin, clientName }: { insight: Insight; onTogglePin: (id: string, pinned: boolean) => void; clientName?: string }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const content = insight.content || '';
  const isLong = content.length > 400;
  const displayContent = expanded || !isLong ? content : content.slice(0, 400) + '...';

  return (
    <Card className={`transition-all ${insight.is_pinned ? 'ring-1 ring-primary/30 bg-primary/5' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold">{insight.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {clientName && (
                <Badge variant="outline" className="text-xs">{clientName}</Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(insight.created_at)}
              </span>
              {insight.tags?.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onTogglePin(insight.id, !!insight.is_pinned)}>
              {insight.is_pinned ? <PinOff className="h-3.5 w-3.5 text-primary" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
            {insight.source_url && (
              <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                <a href={insight.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
          <ReactMarkdown>{displayContent}</ReactMarkdown>
        </div>
        {isLong && (
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Ver menos' : 'Ver mais'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default IAServicePage;
