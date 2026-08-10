import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, CalendarDays, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Client, MONTH_NAMES } from '@/types/database';
import { toast } from 'sonner';

interface ParsedTask {
  key: string;
  dayNum: number;
  title: string;
  caption: string;
  details: string;
  type: string;
}

const parsePlanningContent = (content: string, category: string): ParsedTask[] => {
  const tasks: ParsedTask[] = [];
  const type = category === 'design' ? 'design' : category === 'video' ? 'video' : 'post';
  const dayPatterns = [
    /^(?:\*\*)?DIA\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?ARTE\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?POST\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?VÍDEO\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(?:\*\*)?CONTEÚDO\s*(\d+)(?:\*\*)?[:\-–]\s*(.*)/i,
    /^(\d+)\.\s+(.*)/i,
  ];
  const lines = content.split('\n');
  let currentNum = 0, currentTitle = '', currentCaption = '', currentDetails = '';
  let captionMode = false;

  const flush = () => {
    if (currentNum > 0 && (currentTitle.trim() || currentCaption.trim())) {
      tasks.push({
        key: `${type}-${currentNum}`,
        dayNum: currentNum,
        title: currentTitle.trim().replace(/\*\*/g, '').substring(0, 200),
        caption: currentCaption.trim().substring(0, 1000),
        details: currentDetails.trim().substring(0, 500),
        type,
      });
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    for (const p of dayPatterns) {
      const m = trimmed.match(p);
      if (m) { flush(); currentNum = parseInt(m[1]) || tasks.length + 1; currentTitle = m[2]?.replace(/\*\*/g, '').trim() || ''; currentCaption = ''; currentDetails = ''; captionMode = false; return; }
    }
    if (currentNum === 0) return;
    const cm = trimmed.match(/^(?:\*\*)?(?:Legenda|Caption|Texto)[:\s]*(?:\*\*)?\s*(.*)/i);
    if (cm) { currentCaption = cm[1] || ''; captionMode = true; return; }
    const dm = trimmed.match(/^(?:\*\*)?(?:CTA|Hashtag|Formato|Tipo|Objetivo|Horário|Observação)[:\s]*(?:\*\*)?\s*(.*)/i);
    if (dm) { currentDetails += (currentDetails ? ' | ' : '') + trimmed.replace(/\*\*/g, ''); captionMode = false; return; }
    if (trimmed) { if (captionMode) currentCaption += ' ' + trimmed; else if (!currentTitle) currentTitle = trimmed; else currentDetails += (currentDetails ? ' ' : '') + trimmed; }
  });
  flush();
  return tasks;
};

export default function SocialMediaPlanning() {
  const { staffMember, isSocialMedia, isAdmin } = useStaffAuth();
  const { isAdmin: isRealAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});

  if (!staffMember && !isRealAdmin) {
    return <Navigate to="/staff-login" replace />;
  }
  if (staffMember && !isSocialMedia && !isAdmin) {
    return <Navigate to="/staff-login" replace />;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: clients } = useQuery({
    queryKey: ['planning-clients', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      let result = data as Client[];
      if (!isAdmin && staffMember?.id) {
        result = result.filter(c => c.social_media_staff_id === staffMember.id || c.admin_staff_id === staffMember.id);
      }
      return result;
    },
  });

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  // Fetch PDFs
  const { data: planningPdfs } = useQuery({
    queryKey: ['sm-planning-pdfs', selectedClientId],
    queryFn: async () => {
      const { data: dbFiles } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', selectedClientId)
        .eq('file_type', 'planejamento')
        .order('created_at', { ascending: false });

      const { data: storagePdfs } = await supabase.storage
        .from('planning-pdfs')
        .list(selectedClientId, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

      const storageFiles = (storagePdfs || []).map(f => ({
        id: f.id || f.name,
        file_name: f.name,
        file_url: supabase.storage.from('planning-pdfs').getPublicUrl(`${selectedClientId}/${f.name}`).data.publicUrl,
        created_at: f.created_at,
      }));

      return [...(dbFiles || []), ...storageFiles];
    },
    enabled: !!selectedClientId,
  });

  // Fetch planning content
  const { data: planningTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['planning-weekly-tasks', selectedClientId, currentYear, currentMonth],
    queryFn: async () => {
      const { data: cm } = await supabase
        .from('consulting_months')
        .select('id')
        .eq('client_id', selectedClientId)
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .maybeSingle();

      if (!cm) return [];
      const { data: analyses } = await supabase
        .from('content_analyses')
        .select('content, category')
        .eq('consulting_month_id', cm.id);

      const tasks: ParsedTask[] = [];
      analyses?.forEach(a => tasks.push(...parsePlanningContent(a.content, a.category)));
      return tasks;
    },
    enabled: !!selectedClientId,
  });

  // Auto-generate planning mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) throw new Error('Selecione um cliente');

      // 1. Get or create consulting_month
      let { data: cm } = await supabase
        .from('consulting_months')
        .select('id')
        .eq('client_id', selectedClientId)
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .maybeSingle();

      if (!cm) {
        const { data: newCm, error } = await supabase
          .from('consulting_months')
          .insert({ client_id: selectedClientId, year: currentYear, month: currentMonth })
          .select('id')
          .single();
        if (error) throw error;
        cm = newCm;
      }

      // 2. Gather strategic context from frameworks
      const { data: strategicData } = await supabase
        .from('client_strategic_data')
        .select('data_key, data_value')
        .eq('client_id', selectedClientId);

      const { data: products } = await supabase
        .from('client_products')
        .select('name, description, price, category')
        .eq('client_id', selectedClientId)
        .eq('is_active', true);

      const { data: client } = await supabase
        .from('clients')
        .select('name, business_segment, business_description, target_audience, value_proposition, main_competitors')
        .eq('id', selectedClientId)
        .single();

      // 3. Build context
      const strategicContext = (strategicData || [])
        .map(d => `${d.data_key}: ${d.data_value}`)
        .join('\n');

      const productsContext = (products || [])
        .map(p => `- ${p.name} (R$ ${p.price || 'N/A'}) - ${p.description || ''} [${p.category || ''}]`)
        .join('\n');

      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      // 4. Call AI
      const { data, error } = await supabase.functions.invoke('consulting-social-media-ai', {
        body: {
          action: 'generate_planning',
          clientId: selectedClientId,
          prompt: `Gere um planejamento completo de conteúdo para redes sociais para o mês de ${MONTH_NAMES[currentMonth - 1]}/${currentYear} (${daysInMonth} dias).

INFORMAÇÕES DO CLIENTE:
Nome: ${client?.name || 'N/A'}
Segmento: ${client?.business_segment || 'N/A'}
Descrição: ${client?.business_description || 'N/A'}
Público-alvo: ${client?.target_audience || 'N/A'}
Proposta de valor: ${client?.value_proposition || 'N/A'}
Concorrentes: ${client?.main_competitors || 'N/A'}

DADOS ESTRATÉGICOS (Frameworks 4Ps, SWOT, Persona, etc.):
${strategicContext || 'Sem dados estratégicos cadastrados.'}

CATÁLOGO DE PRODUTOS/SERVIÇOS:
${productsContext || 'Sem produtos cadastrados.'}

REGRAS OBRIGATÓRIAS:
- Gere exatamente ${daysInMonth} dias de conteúdo, numerados sequencialmente
- Use o formato: "DIA X: [Título do Post]" seguido de "Legenda: [texto completo]"
- Inclua CTA, hashtags e tipo de formato (carrossel, reels, stories, post estático)
- Alterne entre conteúdos educativos, de venda, entretenimento e autoridade
- Destaque os produtos/serviços do catálogo ao longo do mês
- Considere datas comemorativas e sazonais de ${MONTH_NAMES[currentMonth - 1]}
- Use as informações dos frameworks estratégicos para direcionar tom e mensagens
- Cada legenda deve ter entre 3-8 linhas com emojis relevantes`,
        },
      });

      if (error) throw error;

      const generatedContent = data?.result || data?.content || data?.text || '';
      if (!generatedContent) throw new Error('Nenhum conteúdo gerado');

      // Delete existing social_media planning for this month, then insert new
      await supabase.from('content_analyses')
        .delete()
        .eq('consulting_month_id', cm!.id)
        .eq('category', 'social_media');

      await supabase.from('content_analyses').insert({
        consulting_month_id: cm!.id,
        category: 'social_media',
        content: generatedContent,
      });

      return generatedContent;
    },
    onSuccess: () => {
      toast.success('Planejamento gerado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['planning-weekly-tasks', selectedClientId] });
    },
    onError: (err: any) => {
      toast.error('Erro ao gerar planejamento: ' + (err.message || 'Erro desconhecido'));
    },
  });

  // Build weekly view
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const todayDay = now.getDate();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(d => d.getMonth() + 1 === currentMonth);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'design': return '🎨 Arte';
      case 'video': return '🎬 Vídeo';
      default: return '📱 Post';
    }
  };

  const toggleDay = (day: number) => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto px-1 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Planejamento
          </h1>
          <p className="text-sm text-muted-foreground">{MONTH_NAMES[currentMonth - 1]} {currentYear}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="flex-1 max-w-sm">
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedClientId && (
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="gap-2 shrink-0"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generateMutation.isPending ? 'Gerando...' : 'Gerar Planejamento'}
          </Button>
        )}
      </div>

      {!selectedClientId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
            Selecione um cliente para ver o planejamento
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* PDFs Section */}
          {planningPdfs && planningPdfs.length > 0 && (
            <Card>
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  PDFs de Planejamento
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  {planningPdfs.map((pdf: any) => (
                    <div key={pdf.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{pdf.file_name}</p>
                          {pdf.created_at && (
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(pdf.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0" onClick={() => window.open(pdf.file_url, '_blank')}>
                        <Download className="h-3 w-3" />
                        Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Planning View */}
          <Card>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Semana Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {tasksLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : weekDays.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Semana fora do mês atual</p>
              ) : (
                <div className="space-y-2">
                  {weekDays.map(day => {
                    const dayNum = day.getDate();
                    const dayTasks = planningTasks?.filter(t => t.dayNum === dayNum) || [];
                    const isCurrentDay = isToday(day);
                    const isPast = day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isExpanded = expandedDays[dayNum] !== false;

                    return (
                      <div
                        key={dayNum}
                        className={`rounded-lg border transition-colors ${
                          isCurrentDay
                            ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
                            : isPast
                            ? 'opacity-60'
                            : ''
                        }`}
                      >
                        <button
                          className="w-full flex items-center justify-between p-2.5 text-left"
                          onClick={() => toggleDay(dayNum)}
                        >
                          <div className="flex items-center gap-2">
                            {isCurrentDay && <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />}
                            <span className={`text-sm font-semibold ${isCurrentDay ? 'text-green-700 dark:text-green-400' : ''}`}>
                              {format(day, "EEEE, dd", { locale: ptBR })}
                            </span>
                            {isCurrentDay && <Badge className="text-[10px] py-0 bg-green-500">HOJE</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] py-0">
                              {dayTasks.length} {dayTasks.length === 1 ? 'item' : 'itens'}
                            </Badge>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2">
                            {dayTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                Sem conteúdo planejado
                                {!planningTasks?.length && ' — clique em "Gerar Planejamento" para criar'}
                              </p>
                            ) : (
                              dayTasks.map(task => (
                                <div key={task.key} className="rounded-md bg-background border p-2.5 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] py-0 shrink-0">{getTypeLabel(task.type)}</Badge>
                                    <span className="text-xs font-medium">{task.title}</span>
                                  </div>
                                  {task.caption && (
                                    <div className="mt-1.5">
                                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Legenda:</p>
                                      <p className="text-xs text-foreground/80 whitespace-pre-wrap bg-muted/50 rounded p-2">{task.caption}</p>
                                    </div>
                                  )}
                                  {task.details && (
                                    <p className="text-[10px] text-muted-foreground mt-1">{task.details}</p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Month Overview */}
          {planningTasks && planningTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm">Visão do Mês Completo</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-7 gap-1">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="text-[9px] text-muted-foreground text-center font-medium py-1">{d}</div>
                  ))}
                  {(() => {
                    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
                    const offset = firstDay === 0 ? 6 : firstDay - 1;
                    const cells = [];
                    for (let i = 0; i < offset; i++) cells.push(<div key={`empty-${i}`} />);
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dayTasks = planningTasks.filter(t => t.dayNum === d);
                      const isCurrent = d === todayDay;
                      cells.push(
                        <div
                          key={d}
                          className={`text-center p-1 rounded text-[10px] ${
                            isCurrent ? 'bg-green-500 text-white font-bold' :
                            dayTasks.length > 0 ? 'bg-primary/10 font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          {d}
                          {dayTasks.length > 0 && !isCurrent && (
                            <div className="flex justify-center mt-0.5">
                              <div className="h-1 w-1 rounded-full bg-primary" />
                            </div>
                          )}
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
