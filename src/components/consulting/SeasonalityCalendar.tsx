import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Trash2, Loader2, Sparkles, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
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

interface SeasonalityCalendarProps {
  consultingMonthId: string;
  year: number;
  month: number;
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

const CATEGORY_COLORS: Record<string, string> = {
  comercial: 'border-green-500',
  cultural: 'border-blue-500',
  religioso: 'border-purple-500',
  promocional: 'border-orange-500',
  general: 'border-gray-500',
};

export function SeasonalityCalendar({ consultingMonthId, year, month, clientContext }: SeasonalityCalendarProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
          extract_dates: true, // Flag to get structured dates
        },
      });

      if (error) throw error;

      // Parse dates from the response
      if (data?.data?.datas_comemorativas) {
        const content = data.data.datas_comemorativas;
        const dateMatches = content.match(/(\d{1,2})[\/\-\.](\d{1,2})?[^\n]*[-–:]\s*([^\n]+)/g) || [];
        
        for (const match of dateMatches.slice(0, 20)) {
          const dayMatch = match.match(/^(\d{1,2})/);
          const titleMatch = match.match(/[-–:]\s*(.+)$/);
          
          if (dayMatch && titleMatch) {
            const day = parseInt(dayMatch[1]);
            if (day >= 1 && day <= 31) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const title = titleMatch[1].trim().substring(0, 100);
              
              // Check if date already exists
              const exists = dates?.some(d => d.date === dateStr && d.title.toLowerCase() === title.toLowerCase());
              if (!exists) {
                await supabase.from('seasonality_dates').insert({
                  consulting_month_id: consultingMonthId,
                  date: dateStr,
                  title,
                  category: 'general',
                  importance: 'normal',
                });
              }
            }
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['seasonality-dates', consultingMonthId] });
        toast.success('Datas geradas com IA!');
      }
    } catch (error) {
      console.error('Error generating dates:', error);
      toast.error('Erro ao gerar datas');
    } finally {
      setIsGenerating(false);
    }
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const firstDayOfMonth = getDay(startOfMonth(new Date(year, month - 1)));
  const calendarDays: (number | null)[] = [];
  
  // Add empty cells for days before the first day
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Get dates for a specific day
  const getDatesForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dates?.filter(d => d.date === dateStr) || [];
  };

  const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR });

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg capitalize">Calendário - {monthName}</CardTitle>
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
              Gerar Datas
            </Button>
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
        </div>
        <CardDescription>
          Datas comemorativas e oportunidades do mês
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {calendarDays.map((day, index) => {
            const dayDates = day ? getDatesForDay(day) : [];
            const hasHighImportance = dayDates.some(d => d.importance === 'high');
            const hasNormalImportance = dayDates.some(d => d.importance === 'normal');
            
            return (
              <div
                key={index}
                className={`min-h-[60px] p-1 border rounded-md ${
                  day ? 'bg-background hover:bg-muted/50' : 'bg-muted/30'
                } ${hasHighImportance ? 'border-destructive' : hasNormalImportance ? 'border-primary' : 'border-border/50'}`}
              >
                {day && (
                  <>
                    <div className="text-xs font-medium text-right text-muted-foreground">
                      {day}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {dayDates.slice(0, 2).map(d => (
                        <div
                          key={d.id}
                          className={`text-[9px] p-0.5 rounded truncate cursor-pointer ${IMPORTANCE_COLORS[d.importance]}`}
                          title={d.title}
                          onClick={() => {
                            if (confirm(`Remover "${d.title}"?`)) {
                              deleteDateMutation.mutate(d.id);
                            }
                          }}
                        >
                          {d.title}
                        </div>
                      ))}
                      {dayDates.length > 2 && (
                        <div className="text-[9px] text-muted-foreground text-center">
                          +{dayDates.length - 2}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* List of all dates */}
        {dates && dates.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-2">Todas as Datas ({dates.length})</h4>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {dates.map(d => (
                <div
                  key={d.id}
                  className={`flex items-center justify-between p-2 rounded-md border-l-2 bg-muted/30 ${CATEGORY_COLORS[d.category] || CATEGORY_COLORS.general}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {format(new Date(d.date + 'T12:00:00'), 'dd/MM')}
                    </Badge>
                    <span className="text-sm truncate">{d.title}</span>
                    <Badge className={`shrink-0 text-xs ${IMPORTANCE_COLORS[d.importance]}`}>
                      {d.importance === 'high' ? 'Alta' : d.importance === 'normal' ? 'Normal' : 'Baixa'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => deleteDateMutation.mutate(d.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add date dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Data Comemorativa</DialogTitle>
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
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={newDate.category}
                  onValueChange={(v) => setNewDate({ ...newDate, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="religioso">Religioso</SelectItem>
                    <SelectItem value="promocional">Promocional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={newDate.notes}
                  onChange={(e) => setNewDate({ ...newDate, notes: e.target.value })}
                  placeholder="Ideias para campanhas, promoções..."
                  rows={2}
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
