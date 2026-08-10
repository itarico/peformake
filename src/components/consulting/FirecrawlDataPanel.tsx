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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Plus, Trash2, Loader2, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface FirecrawlData {
  id: string;
  instance_id: string | null;
  consulting_month_id: string | null;
  source_url: string | null;
  source_type: 'scrape' | 'search' | 'manual';
  title: string | null;
  content: string;
  notes: string | null;
  created_at: string;
}

interface FirecrawlDataPanelProps {
  instanceId?: string;
  consultingMonthId?: string;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  scrape: 'Site Analisado',
  search: 'Resultado de Busca',
  manual: 'Adicionado Manualmente',
};

export function FirecrawlDataPanel({ instanceId, consultingMonthId }: FirecrawlDataPanelProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newData, setNewData] = useState({
    source_url: '',
    source_type: 'manual' as 'scrape' | 'search' | 'manual',
    title: '',
    content: '',
    notes: '',
  });

  const queryKey = instanceId 
    ? ['firecrawl-data', 'instance', instanceId]
    : ['firecrawl-data', 'month', consultingMonthId];

  // Fetch research data
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

  // Add data mutation
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
      toast.success('Informação adicionada!');
      setIsAddDialogOpen(false);
      setNewData({ source_url: '', source_type: 'manual', title: '', content: '', notes: '' });
    },
    onError: () => {
      toast.error('Erro ao adicionar informação');
    },
  });

  // Delete data mutation
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
      toast.success('Informação removida!');
    },
    onError: () => {
      toast.error('Erro ao remover informação');
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Dados Coletados</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Info
          </Button>
        </div>
        <CardDescription>
          Informações coletadas via Firecrawl ou adicionadas manualmente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : researchData && researchData.length > 0 ? (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {researchData.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {SOURCE_TYPE_LABELS[item.source_type]}
                      </Badge>
                      {item.title && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.source_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => window.open(item.source_url!, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteDataMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {item.source_url && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.source_url}
                    </p>
                  )}
                  
                  <div className={`text-sm ${expandedId === item.id ? '' : 'line-clamp-3'}`}>
                    {item.content}
                  </div>
                  
                  {item.content.length > 200 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      {expandedId === item.id ? 'Ver menos' : 'Ver mais'}
                    </Button>
                  )}
                  
                  {item.notes && (
                    <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                      <span className="font-medium">Notas:</span> {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum dado coletado ainda</p>
            <p className="text-xs">Adicione informações manualmente ou use o Firecrawl para pesquisar</p>
          </div>
        )}

        {/* Add dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Informação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source_type">Tipo de Fonte</Label>
                  <Select
                    value={newData.source_type}
                    onValueChange={(v) => setNewData({ ...newData, source_type: v as 'scrape' | 'search' | 'manual' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Adicionado Manualmente</SelectItem>
                      <SelectItem value="scrape">Site Analisado</SelectItem>
                      <SelectItem value="search">Resultado de Busca</SelectItem>
                    </SelectContent>
                  </Select>
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
                  placeholder="Título ou nome da fonte"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  value={newData.content}
                  onChange={(e) => setNewData({ ...newData, content: e.target.value })}
                  placeholder="Informações coletadas, insights, dados..."
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionais</Label>
                <Textarea
                  id="notes"
                  value={newData.notes}
                  onChange={(e) => setNewData({ ...newData, notes: e.target.value })}
                  placeholder="Observações sobre essa informação..."
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
              >
                {addDataMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Adicionar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
