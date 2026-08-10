import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Trash2, Loader2, Sparkles, Send, Palette, Video } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SeasonalityDate {
  id: string;
  consulting_month_id: string;
  date: string;
  title: string;
  category: string;
  importance: 'low' | 'normal' | 'high';
  notes: string | null;
}

interface SeasonalityContentPanelProps {
  consultingMonthId: string;
  year: number;
  month: number;
  clientId?: string;
  clientContext?: {
    business_segment?: string;
    target_audience?: string;
  };
}

const IMPORTANCE_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/20 text-primary',
  high: 'bg-destructive/20 text-destructive',
};

export function SeasonalityContentPanel({ 
  consultingMonthId, 
  year, 
  month, 
  clientId,
  clientContext 
}: SeasonalityContentPanelProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendingDateId, setSendingDateId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState({
    date: '',
    title: '',
    category: 'general',
    importance: 'normal' as 'low' | 'normal' | 'high',
    notes: '',
  });

  // Fetch dates for this month
  const { data: dates, isLoading } = useQuery({
    queryKey: ['seasonality-dates', consultingMonthId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasonality_dates')
        .select('*')
        .eq('consulting_month_id', consultingMonthId)
        .order('date');
      
      if (error) throw error;
      return data as SeasonalityDate[];
    },
  });

  // Add date mutation
  const addDateMutation = useMutation({
    mutationFn: async (dateData: typeof newDate) => {
      const { error } = await supabase
        .from('seasonality_dates')
        .insert({
          consulting_month_id: consultingMonthId,
          date: dateData.date,
          title: dateData.title,
          category: dateData.category,
          importance: dateData.importance,
          notes: dateData.notes || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonality-dates', consultingMonthId] });
      toast.success('Data adicionada!');
      setIsAddDialogOpen(false);
      setNewDate({ date: '', title: '', category: 'general', importance: 'normal', notes: '' });
    },
    onError: () => {
      toast.error('Erro ao adicionar data');
    },
  });

  // Delete date mutation
  const deleteDateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('seasonality_dates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonality-dates', consultingMonthId] });
      toast.success('Data removida!');
    },
    onError: () => {
      toast.error('Erro ao remover data');
    },
  });

  // Generate dates with AI
  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    
    try {
      const monthName = format(new Date(year, month - 1), 'MMMM', { locale: ptBR });
      
      const { data, error } = await supabase.functions.invoke('consulting-seasonality-research', {
        body: {
          instance_id: consultingMonthId,
          month_period: `${monthName} de ${year}`,
          business_segment: clientContext?.business_segment || '',
          location: 'Brasil',
          client_context: clientContext || {},
          ai_only: true,
          extract_dates: true,
        },
      });

      if (error) throw error;

      // Parse dates from the response
      if (data?.data?.datas_comemorativas) {
        const content = data.data.datas_comemorativas;
        const dateMatches = content.match(/(\d{1,2})[\/\-\.](\d{1,2})?[^\n]*[-–:]\s*([^\n]+)/g) || [];
        
        let addedCount = 0;
        for (const match of dateMatches.slice(0, 20)) {
          const dayMatch = match.match(/^(\d{1,2})/);
          const titleMatch = match.match(/[-–:]\s*(.+)$/);
          
          if (dayMatch && titleMatch) {
            const day = parseInt(dayMatch[1]);
            if (day >= 1 && day <= 31) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const title = titleMatch[1].trim().substring(0, 100);
              
              const exists = dates?.some(d => d.date === dateStr && d.title.toLowerCase() === title.toLowerCase());
              if (!exists) {
                await supabase.from('seasonality_dates').insert({
                  consulting_month_id: consultingMonthId,
                  date: dateStr,
                  title,
                  category: 'general',
                  importance: 'normal',
                });
                addedCount++;
              }
            }
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['seasonality-dates', consultingMonthId] });
        toast.success(`${addedCount} datas geradas com IA!`);
      }
    } catch (error) {
      console.error('Error generating dates:', error);
      toast.error('Erro ao gerar datas');
    } finally {
      setIsGenerating(false);
    }
  };

  // Send to briefing as art
  const sendToBriefingMutation = useMutation({
    mutationFn: async (seasonalityDate: SeasonalityDate) => {
      if (!clientId) throw new Error('Client ID is required');
      
      const { data: workMonth } = await supabase
        .from('work_months')
        .select('id')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .single();
      
      if (!workMonth) throw new Error('Work month not found. Enable design service first.');
      
      const { data: existingArts } = await supabase
        .from('arts')
        .select('art_number')
        .eq('work_month_id', workMonth.id)
        .order('art_number', { ascending: false })
        .limit(1);
      
      const nextNumber = (existingArts?.[0]?.art_number || 0) + 1;
      
      const { error } = await supabase
        .from('arts')
        .insert({
          work_month_id: workMonth.id,
          art_number: nextNumber,
          art_type: 'post_instagram',
          title: seasonalityDate.title,
          description: `Data comemorativa: ${format(new Date(seasonalityDate.date + 'T12:00:00'), 'dd/MM/yyyy')}\n\n${seasonalityDate.notes || 'Arte para data sazonal'}`,
          status: 'pending_briefing',
          is_extra: true,
        });
      
      if (error) throw error;
      return { title: seasonalityDate.title };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['arts'] });
      setSendingDateId(null);
      toast.success(`"${data.title}" enviado para briefing!`);
    },
    onError: (error: any) => {
      setSendingDateId(null);
      toast.error(error.message || 'Erro ao enviar para briefing');
    },
  });

  const handleSendToBriefing = (date: SeasonalityDate) => {
    setSendingDateId(date.id);
    sendToBriefingMutation.mutate(date);
  };

  const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR });

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base sm:text-lg capitalize">Datas - {monthName}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateWithAI}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden xs:inline">Gerar</span> Datas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Adicionar</span>
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Datas comemorativas do mês. Envie diretamente para criação de artes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : dates && dates.length > 0 ? (
          <div className="space-y-2">
            {dates.map(d => (
              <div
                key={d.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 flex-wrap">
                  <Badge variant="outline" className="shrink-0 text-xs sm:text-sm font-mono">
                    {format(new Date(d.date + 'T12:00:00'), 'dd/MM')}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{d.title}</p>
                    {d.notes && (
                      <p className="text-xs text-muted-foreground truncate">{d.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Badge className={`shrink-0 text-xs ${IMPORTANCE_COLORS[d.importance]}`}>
                    {d.importance === 'high' ? 'Alta' : d.importance === 'normal' ? 'Normal' : 'Baixa'}
                  </Badge>
                  {clientId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7 sm:h-8 text-xs px-2"
                      onClick={() => handleSendToBriefing(d)}
                      disabled={sendingDateId === d.id}
                    >
                      {sendingDateId === d.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Palette className="h-3 w-3" />
                          <span className="hidden sm:inline">Enviar Arte</span>
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => deleteDateMutation.mutate(d.id)}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma data comemorativa adicionada.</p>
            <p className="text-sm mt-1">Clique em "Gerar Datas" para criar automaticamente com IA.</p>
          </div>
        )}

        {/* Add date dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Data Comemorativa</DialogTitle>
              <DialogDescription>
                Adicione uma data comemorativa para criar artes temáticas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newDate.date}
                    onChange={(e) => setNewDate({ ...newDate, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="importance">Importância</Label>
                  <Select
                    value={newDate.importance}
                    onValueChange={(v) => setNewDate({ ...newDate, importance: v as 'low' | 'normal' | 'high' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newDate.title}
                  onChange={(e) => setNewDate({ ...newDate, title: e.target.value })}
                  placeholder="Ex: Dia das Mães"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Ideias para Arte/Vídeo</Label>
                <Textarea
                  id="notes"
                  value={newDate.notes}
                  onChange={(e) => setNewDate({ ...newDate, notes: e.target.value })}
                  placeholder="Sugestões de abordagem, promoções, mensagens..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => addDateMutation.mutate(newDate)}
                disabled={!newDate.date || !newDate.title || addDateMutation.isPending}
              >
                {addDateMutation.isPending ? (
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
