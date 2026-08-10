import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Camera, Loader2, Sparkles, Sun, Sunset, Moon, 
  Calendar, Copy, Check, Download, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
// html2pdf is now loaded dynamically via pdfUtils
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StoriesGeneratorProps {
  clientName: string;
  clientContext: {
    businessDescription?: string;
    businessSegment?: string;
    targetAudience?: string;
    valueProposition?: string;
    monthlyFocus?: string;
  };
}

interface StoryIdea {
  period: 'manha' | 'tarde' | 'noite';
  title: string;
  content: string;
  format: string;
}

interface DayPlan {
  day: string;
  stories: StoryIdea[];
}

export function StoriesGenerator({ clientName, clientContext }: StoriesGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dia' | 'semana'>('dia');
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const buildContext = () => {
    return `
CLIENTE: ${clientName}
SEGMENTO: ${clientContext.businessSegment || 'Não especificado'}
DESCRIÇÃO: ${clientContext.businessDescription || 'Não especificada'}
PÚBLICO-ALVO: ${clientContext.targetAudience || 'Não especificado'}
PROPOSTA DE VALOR: ${clientContext.valueProposition || 'Não especificada'}
FOCO DO MÊS: ${clientContext.monthlyFocus || 'Não definido'}
    `.trim();
  };

  const parseStories = (content: string, isWeek: boolean): DayPlan[] => {
    const plans: DayPlan[] = [];
    
    if (isWeek) {
      // Parse week format
      const dayMatches = content.split(/(?=(?:SEGUNDA|TERÇA|QUARTA|QUINTA|SEXTA|SÁBADO|DOMINGO|Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo))/i);
      
      for (const daySection of dayMatches) {
        if (!daySection.trim()) continue;
        
        const dayMatch = daySection.match(/^(SEGUNDA|TERÇA|QUARTA|QUINTA|SEXTA|SÁBADO|DOMINGO|Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)[^\n]*/i);
        if (!dayMatch) continue;
        
        const dayName = dayMatch[0].trim();
        const stories = parseStoriesFromSection(daySection.substring(dayMatch[0].length));
        
        if (stories.length > 0) {
          plans.push({ day: dayName, stories });
        }
      }
    } else {
      // Parse single day format
      const stories = parseStoriesFromSection(content);
      if (stories.length > 0) {
        plans.push({ day: 'Hoje', stories });
      }
    }
    
    return plans;
  };

  const parseStoriesFromSection = (section: string): StoryIdea[] => {
    const stories: StoryIdea[] = [];
    
    // Try to find morning/afternoon/night sections
    const periods = [
      { key: 'manha' as const, patterns: ['MANHÃ', 'Manhã', 'manhã', 'MANHA', 'Manha'] },
      { key: 'tarde' as const, patterns: ['TARDE', 'Tarde', 'tarde'] },
      { key: 'noite' as const, patterns: ['NOITE', 'Noite', 'noite'] },
    ];

    for (const period of periods) {
      for (const pattern of period.patterns) {
        const regex = new RegExp(`${pattern}[:\\s]*([^]*?)(?=(?:MANHÃ|TARDE|NOITE|Manhã|Tarde|Noite|$))`, 'i');
        const match = section.match(regex);
        
        if (match && match[1]?.trim()) {
          const content = match[1].trim()
            .replace(/^[:\-\s]+/, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .trim();
          
          if (content.length > 10) {
            const lines = content.split('\n').filter(l => l.trim());
            const title = lines[0]?.replace(/^[\d\.\-\)\s]+/, '').trim() || 'Story';
            
            stories.push({
              period: period.key,
              title: title.substring(0, 50),
              content,
              format: content.includes('enquete') || content.includes('Enquete') ? 'Enquete' : 
                      content.includes('quiz') || content.includes('Quiz') ? 'Quiz' : 
                      content.includes('caixa') ? 'Caixa de Perguntas' : 'Story'
            });
            break;
          }
        }
      }
    }

    // If no periods found, create a generic story
    if (stories.length === 0 && section.trim().length > 20) {
      stories.push({
        period: 'manha',
        title: 'Story do Dia',
        content: section.trim(),
        format: 'Story'
      });
    }

    return stories;
  };

  const generateStories = async (type: 'dia' | 'semana') => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('consulting-social-media-ai', {
        body: {
          action: 'stories',
          type,
          context: buildContext(),
        },
      });

      if (error) throw error;

      const plans = parseStories(data.result || '', type === 'semana');
      
      if (type === 'dia') {
        setDayPlan(plans[0] || { day: 'Hoje', stories: [] });
      } else {
        setWeekPlan(plans);
      }
      
      toast.success(`Stories para ${type === 'dia' ? 'o dia' : 'a semana'} gerados!`);
    } catch (error) {
      console.error('Error generating stories:', error);
      toast.error('Erro ao gerar stories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    toast.success('Copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportPDF = async () => {
    const content = activeTab === 'dia' && dayPlan 
      ? formatDayForPDF(dayPlan)
      : weekPlan.map(d => formatDayForPDF(d)).join('<hr style="margin: 20px 0; border-color: #e5e7eb;">');

    const { buildStandardPdfHtml, exportHtmlToPdf } = await import('@/lib/pdfUtils');
    const htmlContent = buildStandardPdfHtml({
      title: `Planejamento de Stories - ${activeTab === 'dia' ? 'Diário' : 'Semanal'}`,
      subtitle: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      clientName,
      body: content,
    });
    
    try {
      await exportHtmlToPdf(htmlContent, `stories-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exportado!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const formatDayForPDF = (day: DayPlan): string => {
    const periodIcons: Record<string, string> = {
      manha: '🌅',
      tarde: '☀️',
      noite: '🌙'
    };
    
    return `
      <div style="margin-bottom: 20px;">
        <h2 style="color: #4f46e5; font-size: 16px; margin-bottom: 15px;">${day.day}</h2>
        ${day.stories.map(s => `
          <div style="margin-bottom: 15px; padding: 12px; background: #f9fafb; border-radius: 8px; border-left: 3px solid #6366f1;">
            <p style="font-weight: 600; margin: 0 0 8px 0;">
              ${periodIcons[s.period] || '📱'} ${s.period.toUpperCase()} - ${s.format}
            </p>
            <p style="margin: 0; color: #374151; font-size: 14px; white-space: pre-wrap;">${s.content}</p>
          </div>
        `).join('')}
      </div>
    `;
  };

  const getPeriodIcon = (period: string) => {
    switch (period) {
      case 'manha': return <Sun className="h-4 w-4 text-yellow-500" />;
      case 'tarde': return <Sunset className="h-4 w-4 text-orange-500" />;
      case 'noite': return <Moon className="h-4 w-4 text-indigo-500" />;
      default: return <Camera className="h-4 w-4" />;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'manha': return 'Manhã';
      case 'tarde': return 'Tarde';
      case 'noite': return 'Noite';
      default: return period;
    }
  };

  const renderStoryCard = (story: StoryIdea, dayName: string, index: number) => {
    const cardId = `${dayName}-${story.period}-${index}`;
    
    return (
      <Card key={cardId} className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getPeriodIcon(story.period)}
              <CardTitle className="text-sm">{getPeriodLabel(story.period)}</CardTitle>
              <Badge variant="secondary" className="text-xs">{story.format}</Badge>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => handleCopy(story.content, cardId)}
              >
                {copied === cardId ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{story.content}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-pink-500/10">
              <Camera className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Gerador de Stories</CardTitle>
              <CardDescription>
                Planejamento de stories por período do dia
              </CardDescription>
            </div>
          </div>
          {(dayPlan || weekPlan.length > 0) && (
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dia' | 'semana')}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="dia" className="gap-2">
                <Sun className="h-4 w-4" />
                Dia
              </TabsTrigger>
              <TabsTrigger value="semana" className="gap-2">
                <Calendar className="h-4 w-4" />
                Semana
              </TabsTrigger>
            </TabsList>
            
            <Button
              onClick={() => generateStories(activeTab)}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Gerar Stories
            </Button>
          </div>

          <TabsContent value="dia" className="mt-4 space-y-3">
            {dayPlan ? (
              dayPlan.stories.length > 0 ? (
                dayPlan.stories.map((story, i) => renderStoryCard(story, 'hoje', i))
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Nenhum story gerado</p>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Clique em "Gerar Stories" para criar sugestões para hoje</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manhã, tarde e noite com conteúdo específico
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="semana" className="mt-4 space-y-4">
            {weekPlan.length > 0 ? (
              weekPlan.map((day, dayIndex) => (
                <div key={day.day} className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {day.day}
                  </h3>
                  <div className="space-y-2 pl-6">
                    {day.stories.map((story, i) => renderStoryCard(story, day.day, i))}
                  </div>
                </div>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Clique em "Gerar Stories" para criar um planejamento semanal</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Segunda a domingo com stories para cada período
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
