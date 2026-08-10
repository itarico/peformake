import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Globe, Plus, Trash2, Loader2, ExternalLink, FileText, 
  Search, Sparkles, Tag, Calendar, TrendingUp, Lightbulb, 
  Copy, Check, ChevronDown, ChevronUp, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface FirecrawlData {
  id: string;
  instance_id: string | null;
  consulting_month_id: string | null;
  source_url: string | null;
  source_type: 'scrape' | 'search' | 'manual' | 'ai_research';
  title: string | null;
  content: string;
  notes: string | null;
  created_at: string;
}

interface InsightCategory {
  icon: React.ReactNode;
  label: string;
  color: string;
}

interface EnhancedFirecrawlPanelProps {
  instanceId?: string;
  consultingMonthId?: string;
  clientContext?: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
  };
}

const SOURCE_CATEGORIES: Record<string, InsightCategory> = {
  scrape: { icon: <Globe className="h-4 w-4" />, label: 'Site Analisado', color: 'bg-blue-500/10 text-blue-600' },
  search: { icon: <Search className="h-4 w-4" />, label: 'Busca Web', color: 'bg-green-500/10 text-green-600' },
  manual: { icon: <FileText className="h-4 w-4" />, label: 'Manual', color: 'bg-gray-500/10 text-gray-600' },
  ai_research: { icon: <Sparkles className="h-4 w-4" />, label: 'Pesquisa IA', color: 'bg-purple-500/10 text-purple-600' },
  trend: { icon: <TrendingUp className="h-4 w-4" />, label: 'Tendência', color: 'bg-orange-500/10 text-orange-600' },
  idea: { icon: <Lightbulb className="h-4 w-4" />, label: 'Ideia', color: 'bg-yellow-500/10 text-yellow-600' },
  seasonal: { icon: <Calendar className="h-4 w-4" />, label: 'Sazonal', color: 'bg-pink-500/10 text-pink-600' },
};

function InsightCard({ data, onDelete, onCopy }: { 
  data: FirecrawlData; 
  onDelete: (id: string) => void;
  onCopy: (content: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const category = SOURCE_CATEGORIES[data.source_type] || SOURCE_CATEGORIES.manual;
  const isLongContent = data.content.length > 200;
  
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className={`p-1.5 rounded-md shrink-0 ${category.color}`}>
              {category.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {category.label}
                </Badge>
                {data.source_url && (
                  <a 
                    href={data.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Fonte
                  </a>
                )}
              </div>
              {data.title && (
                <h4 className="font-medium text-sm mt-1 line-clamp-1">{data.title}</h4>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onCopy(data.content)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(data.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-3 pt-0">
        <div className={`text-sm text-muted-foreground ${!isExpanded && isLongContent ? 'line-clamp-3' : ''}`}>
          {data.content.split('\n').map((line, i) => (
            <p key={i} className={line.trim() ? 'mb-1' : 'mb-2'}>{line}</p>
          ))}
        </div>
        
        {isLongContent && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-6 text-xs gap-1 w-full"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Ver mais
              </>
            )}
          </Button>
        )}
        
        {data.notes && (
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            <span className="font-medium">Notas:</span> {data.notes}
          </div>
        )}
        
        <div className="mt-2 text-xs text-muted-foreground/50">
          {new Date(data.created_at).toLocaleDateString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
}

export function EnhancedFirecrawlPanel({ instanceId, consultingMonthId, clientContext }: EnhancedFirecrawlPanelProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newData, setNewData] = useState({
    source_url: '',
    source_type: 'manual' as string,
    title: '',
    content: '',
    notes: '',
  });

  const queryKey = instanceId 
    ? ['firecrawl-data', 'instance', instanceId]
    : ['firecrawl-data', 'month', consultingMonthId];

  const { data: researchData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from('firecrawl_research_data').select('*');
      
      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      } else if (consultingMonthId) {
        query = query.eq('consulting_month_id', consultingMonthId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FirecrawlData[];
    },
    enabled: !!(instanceId || consultingMonthId),
  });

  const addDataMutation = useMutation({
    mutationFn: async (data: typeof newData) => {
      const { error } = await supabase
        .from('firecrawl_research_data')
        .insert({
          instance_id: instanceId || null,
          consulting_month_id: consultingMonthId || null,
          source_url: data.source_url || null,
          source_type: data.source_type,
          title: data.title || null,
          content: data.content,
          notes: data.notes || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Insight adicionado!');
      setIsAddDialogOpen(false);
      setNewData({ source_url: '', source_type: 'manual', title: '', content: '', notes: '' });
    },
    onError: () => {
      toast.error('Erro ao adicionar insight');
    },
  });

  const deleteDataMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('firecrawl_research_data')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Insight removido!');
    },
    onError: () => {
      toast.error('Erro ao remover insight');
    },
  });

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success('Copiado!');
  };

  const filteredData = researchData?.filter(item => 
    activeFilter === 'all' || item.source_type === activeFilter
  ) || [];

  const groupedByType = researchData?.reduce((acc, item) => {
    acc[item.source_type] = (acc[item.source_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Insights Coletados</CardTitle>
            {researchData && researchData.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {researchData.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
        <CardDescription>
          Dados e insights coletados via pesquisa web, IA ou adicionados manualmente
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        {researchData && researchData.length > 0 && (
          <div className="mb-4">
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                <Button
                  variant={activeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => setActiveFilter('all')}
                >
                  Todos ({researchData.length})
                </Button>
                {Object.entries(groupedByType).map(([type, count]) => {
                  const category = SOURCE_CATEGORIES[type] || SOURCE_CATEGORIES.manual;
                  return (
                    <Button
                      key={type}
                      variant={activeFilter === type ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs shrink-0 gap-1"
                      onClick={() => setActiveFilter(type)}
                    >
                      {category.icon}
                      {category.label} ({count})
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredData.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredData.map((item) => (
              <InsightCard
                key={item.id}
                data={item}
                onDelete={deleteDataMutation.mutate}
                onCopy={handleCopy}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum insight ainda</p>
            <p className="text-sm mt-1">Use o Firecrawl para pesquisar ou adicione manualmente</p>
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Adicionar Insight
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SOURCE_CATEGORIES).slice(0, 4).map(([key, cat]) => (
                      <Button
                        key={key}
                        type="button"
                        variant={newData.source_type === key ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => setNewData({ ...newData, source_type: key })}
                      >
                        {cat.icon}
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source_url">URL (opcional)</Label>
                  <Input
                    id="source_url"
                    value={newData.source_url}
                    onChange={(e) => setNewData({ ...newData, source_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newData.title}
                  onChange={(e) => setNewData({ ...newData, title: e.target.value })}
                  placeholder="Título do insight"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  value={newData.content}
                  onChange={(e) => setNewData({ ...newData, content: e.target.value })}
                  placeholder="Insight, tendência, ideia, dados..."
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={newData.notes}
                  onChange={(e) => setNewData({ ...newData, notes: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => addDataMutation.mutate(newData)}
                disabled={!newData.content || addDataMutation.isPending}
                className="gap-2"
              >
                {addDataMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
